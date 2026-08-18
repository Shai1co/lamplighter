/**
 * Lamplighter — SSE reader for the storygen endpoints.
 *
 * `POST /api/generate-story` (and a `GET /api/jobs/:id/events` reconnect)
 * answer with a `200 text/event-stream` body, which rules out the browser's
 * own `EventSource`: it is GET-only and cannot carry the JSON request this
 * needs. This reads the raw stream instead — `event: <name>\ndata: <json>\n\n`
 * frames, exactly what src/server/sse.ts writes, plus bare `: ping\n\n`
 * heartbeat comments every 15s that this simply drops — decoded incrementally
 * so a frame split across two network chunks is never dropped or double
 * parsed.
 */

export interface SseMessage {
  event: string;
  data: unknown;
}

/**
 * Reads Server-Sent Events out of a fetch `Response` body. Stops when the
 * stream ends — the server closes it the moment a terminal event (`done` /
 * `error`) is forwarded, see `pipeJobToSse` — or when `signal` aborts.
 *
 * A malformed frame (no `event:` line, or a `data:` payload that fails to
 * parse) is skipped rather than thrown: the server's own contract guarantees
 * well-formed JSON on every frame it writes, so this defends only against a
 * genuinely truncated connection, not against a format this app ever sends.
 */
export async function* readSse(res: Response, signal?: AbortSignal): AsyncGenerator<SseMessage> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  // Cancelling the reader is what actually stops network traffic when the
  // caller aborts mid-stream; merely stopping the `for await` loop below
  // would leave the underlying fetch reading (and buffering) forever.
  const onAbort = (): void => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener('abort', onAbort);

  try {
    for (;;) {
      if (signal?.aborted) return;
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch {
        // Reader cancelled (onAbort above) or the connection dropped mid-read.
        return;
      }
      if (chunk.done) break;
      buf += decoder.decode(chunk.value, { stream: true });

      // SSE frames are separated by a blank line. \r\n turns up depending on
      // the network stack between here and the server; normalize before
      // splitting so a frame boundary is never missed because of it.
      buf = buf.replace(/\r\n/g, '\n');
      let sep = buf.indexOf('\n\n');
      while (sep !== -1) {
        const frame = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        const msg = parseFrame(frame);
        if (msg) yield msg;
        sep = buf.indexOf('\n\n');
      }
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * One `event: x\ndata: y` frame. Comment lines (starting with `:` — the
 * heartbeat) and anything before the first recognised field are ignored.
 * `data:` may legitimately repeat across multiple lines per the SSE spec;
 * this app's server never emits more than one, but they are joined with `\n`
 * regardless so a frame is never silently truncated to its first line.
 */
function parseFrame(frame: string): SseMessage | null {
  let event = '';
  const dataLines: string[] = [];
  for (const line of frame.split('\n')) {
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('event:')) event = line.slice('event:'.length).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).trim());
  }
  if (!event || dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return null;
  }
}
