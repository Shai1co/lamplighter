/**
 * Lamplighter — SSE writer + the Job/JobRegistry that makes generation
 * detached from its originating HTTP response (design doc §4.5).
 *
 * `POST /api/generate-story` creates a job, starts it, and returns a stream
 * SUBSCRIBED to it. If the client disconnects — the "Begin now" path
 * reloads the page mid-art — the job keeps running. `GET
 * /api/jobs/:id/events` lets a fresh connection replay the buffered log and
 * keep watching; `DELETE /api/jobs/:id` is what actually stops one.
 * Aborting the client's own fetch is NOT cancellation.
 */

import { randomUUID } from 'node:crypto';
import type { ServerResponse } from 'node:http';
import type { JobState, JobSummary, StorygenEvents } from './types';

const HEARTBEAT_MS = 15_000;
const MAX_LOG_ENTRIES = 512;
const MAX_JOBS = 32;
const EVICT_AFTER_MS = 30 * 60_000;

interface LoggedEvent {
  event: string;
  data: unknown;
}
type Listener = (event: string, data: unknown) => void;

export class Job {
  readonly id = randomUUID();
  readonly kind: 'story' | 'assets';
  readonly storyId?: string;
  readonly startedAt = Date.now();
  readonly controller = new AbortController();
  state: JobState = 'running';
  endedAt?: number;

  private readonly log: LoggedEvent[] = [];
  private readonly listeners = new Set<Listener>();

  constructor(kind: 'story' | 'assets', storyId?: string) {
    this.kind = kind;
    this.storyId = storyId;
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  emit<K extends keyof StorygenEvents>(event: K, data: StorygenEvents[K]): void {
    this.log.push({ event, data });
    if (this.log.length > MAX_LOG_ENTRIES) this.log.shift();
    for (const l of this.listeners) l(event, data);
  }

  /** Replays the buffered log to `listener` immediately, then streams live events until unsubscribed. */
  attach(listener: Listener): () => void {
    for (const e of this.log) listener(e.event, e.data);
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  cancel(): void {
    this.controller.abort();
  }

  summary(): JobSummary {
    const s: JobSummary = { id: this.id, kind: this.kind, state: this.state, startedAt: this.startedAt };
    if (this.storyId !== undefined) s.storyId = this.storyId;
    if (this.endedAt !== undefined) s.endedAt = this.endedAt;
    return s;
  }
}

export class JobRegistry {
  private readonly jobs = new Map<string, Job>();

  create(kind: 'story' | 'assets', storyId?: string): Job {
    this.prune();
    const job = new Job(kind, storyId);
    this.jobs.set(job.id, job);
    return job;
  }

  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /** Used by the (PR-3) /api/generate-assets 409 check — refuses a second concurrent art job for the same story. */
  hasRunningForStory(storyId: string): boolean {
    for (const job of this.jobs.values()) {
      if (job.kind === 'assets' && job.storyId === storyId && job.state === 'running') return true;
    }
    return false;
  }

  /** In-memory and dies with the dev server — correct, since a job is session-scoped. */
  dispose(): void {
    for (const job of this.jobs.values()) job.cancel();
    this.jobs.clear();
  }

  private prune(): void {
    const now = Date.now();
    for (const [id, job] of this.jobs) {
      if (job.state !== 'running' && job.endedAt !== undefined && now - job.endedAt > EVICT_AFTER_MS) {
        this.jobs.delete(id);
      }
    }
    if (this.jobs.size < MAX_JOBS) return;
    // Still at the cap after the time-based sweep — evict the single oldest
    // finished job to make room; only in the pathological case where every
    // slot is still running do we fall back to evicting the oldest outright.
    let oldestId: string | undefined;
    let oldestAt = Infinity;
    for (const [id, job] of this.jobs) {
      if (job.state === 'running') continue;
      if (job.startedAt < oldestAt) {
        oldestAt = job.startedAt;
        oldestId = id;
      }
    }
    if (!oldestId) {
      for (const [id, job] of this.jobs) {
        if (job.startedAt < oldestAt) {
          oldestAt = job.startedAt;
          oldestId = id;
        }
      }
    }
    if (oldestId) this.jobs.delete(oldestId);
  }
}

/* ─────────────────────────────  HTTP SSE writer  ───────────────────────────── */

export interface SseWriter {
  send: (event: string, data: unknown) => void;
  close: () => void;
}

/** Headers, flush-on-write, and a 15s heartbeat so no intermediary reaps an idle art job. */
export function startSse(res: ServerResponse): SseWriter {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const send = (event: string, data: unknown): void => {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      /* the connection is already gone — the request's own 'close' handler unsubscribes shortly */
    }
  };
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      /* noop */
    }
  }, HEARTBEAT_MS);
  const close = (): void => {
    clearInterval(heartbeat);
    try {
      res.end();
    } catch {
      /* noop */
    }
  };
  return { send, close };
}

const TERMINAL_EVENTS = new Set(['done', 'error']);

/**
 * Wires a Job's event log into an SSE response — replay-then-live, exactly
 * like `Job#attach` — and additionally ends the response the moment a
 * terminal event (`done`/`error`) is forwarded, since §5.1 guarantees
 * nothing else will ever follow one. Used by both `POST
 * /api/generate-story`'s own streaming response and a `GET
 * /api/jobs/:id/events` reconnect, so a client that never explicitly
 * disconnects still gets a clean stream end rather than an indefinitely
 * open connection held up only by the heartbeat.
 */
export function pipeJobToSse(job: Job, sse: SseWriter): () => void {
  // `attach` replays the buffered log SYNCHRONOUSLY, inside this very call —
  // before it has returned, so before `unsubscribe` below has been assigned.
  // The placeholder means a terminal event replayed from an already-finished
  // job (a reconnect) calls a harmless no-op here instead of crashing on a
  // temporal-dead-zone reference; the `job.state` check below is what
  // actually unsubscribes and closes for that case once `attach` has
  // returned for real.
  let unsubscribe: () => void = () => {};
  unsubscribe = job.attach((event, data) => {
    sse.send(event, data);
    if (TERMINAL_EVENTS.has(event)) {
      unsubscribe();
      sse.close();
    }
  });
  if (job.state !== 'running') {
    unsubscribe();
    sse.close();
  }
  return unsubscribe;
}
