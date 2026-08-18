/**
 * CreateStory — the Create panel: form → connecting → working → (painting) →
 * done, with a failed detour off connecting/working that always lands back
 * on the form with the premise untouched.
 *
 * Built on `overlayShell('Create a Story', { kicker: 'New' })` — the same
 * shell Settings and Save/Load use — so it inherits the glass, the rack
 * focus, the focus trap, backdrop-click and Esc for free. See
 * docs/superpowers/specs/2026-08-18-storygen-design.md §12.2-§12.4.
 *
 * ── Why the form is a persistent subtree, not a re-render ──────────────────
 * Every OTHER view here (working/painting/done/failed) is pure read-only
 * output driven by SSE events, so clearing and rebuilding it on every event
 * is both simple and safe — the pattern SettingsPanel already uses for its
 * whole column. The form is different: it holds live, uncontrolled input
 * state (a <textarea>'s cursor position, an <input>'s selection, an IME
 * composition in progress), and a naive "clear + rebuild from a string"
 * commit-and-render cycle on every keystroke would eat all of it. So the
 * form's controls are built exactly ONCE in the constructor and every
 * interaction after that mutates them directly — an `input` listener writes
 * to a field, a segmented click walks its siblings toggling classes — the
 * same "build once, mutate on tick" discipline Settings' own SLIDER already
 * uses within one drag gesture (`wrap.style.setProperty('--pq-fill', …)`),
 * just applied to the whole form rather than one control. This is also what
 * makes "the form is hidden, not destroyed" (§12.2) literally true: hiding
 * it is a `hidden` toggle on a subtree that was never touched.
 *
 * ── Why the network calls are NOT made in here ──────────────────────────
 * Every sibling modal in this codebase (TitleScreen, Settings, SaveLoad,
 * Backlog) is purely handler-driven — it never reaches into `fetch` or a
 * global itself, only into callbacks its owner (UILayer) injects. This
 * component keeps that discipline: `submit`/`cancel` are handlers UILayer
 * implements (using src/ui/sse-client.ts there), not calls made from here.
 */
import type {
  ErrorCode,
  EvAsset,
  EvDone,
  EvError,
  EvHello,
  EvNote,
  EvReady,
  EvStage,
  GenerateStoryRequest,
  ProviderId,
  Stage,
  StorygenHealth,
  StoryLength,
} from '../server/types';
import type { SseMessage } from './sse-client';
import { clear, el, Icons, overlayShell } from './dom';

export interface CreateHandlers {
  health: () => StorygenHealth | null;
  /** Resolves when the SSE stream terminates; rejects only on a transport fault. */
  submit: (req: GenerateStoryRequest, on: (e: SseMessage) => void, signal: AbortSignal) => Promise<void>;
  cancel: (jobId: string) => void;
  /** Persist the autostart handshake and reload into the new story. */
  adopt: (storyId: string) => void;
  close: () => void;
}

type CreateView = 'form' | 'connecting' | 'working' | 'painting' | 'done' | 'failed';

const PROVIDER_ORDER: ProviderId[] = ['gemini', 'xai', 'openai-compatible', 'anthropic', 'mock'];
const PROVIDER_SHORT: Record<ProviderId, string> = {
  gemini: 'Gemini',
  xai: 'xAI',
  'openai-compatible': 'OpenAI',
  anthropic: 'Anthropic',
  mock: 'Mock',
};
const PROVIDER_LONG: Record<ProviderId, string> = {
  gemini: 'Gemini',
  xai: 'xAI',
  'openai-compatible': 'The OpenAI-compatible endpoint',
  anthropic: 'Anthropic',
  mock: 'Mock',
};

const LENGTH_OPTIONS: Array<{ value: StoryLength; label: string }> = [
  { value: 'short', label: 'Short' },
  { value: 'standard', label: 'Standard' },
  { value: 'long', label: 'Long' },
];

const EXAMPLE_PREMISES = [
  "A lighthouse keeper's last night before the light goes automatic.",
  'Two archivists, one file that should not exist, forty minutes before the building is sealed.',
  'A night-bus driver who recognises a passenger from a photograph they were never supposed to see.',
];

const PREMISE_MIN = 8;
const PREMISE_MAX = 2000;
const TITLE_MAX = 64;

/** §5.2 — the copy shown falls back to here only when a stage event carries
 *  no message of its own (defensive; the real server always sends one). */
const STAGE_COPY: Record<Stage, string> = {
  plan: 'Reading your premise…',
  draft: 'Writing the story…',
  validate: 'Checking the script…',
  repair: 'Fixing a few loose ends…',
  write: 'Saving the story…',
  art: 'Painting…',
  done: 'Ready.',
};

/** The five-step rail. `validate`/`repair` share ONE position — a repair is
 *  a re-check, not a new stage — matching both stages' `step: 3`. */
const STAGE_RAIL: Array<{ stages: Stage[]; label: string }> = [
  { stages: ['plan'], label: 'PLAN' },
  { stages: ['draft'], label: 'WRITE' },
  { stages: ['validate', 'repair'], label: 'CHECK' },
  { stages: ['write'], label: 'SAVE' },
  { stages: ['art'], label: 'PAINT' },
];

type FailureAction = 'retry' | 'edit' | 'use_mock' | 'close';
interface FailureCopy {
  heading: string;
  body: (ctx: { message: string; provider: ProviderId }) => string;
  actions: FailureAction[];
}

/** §12.4, verbatim. Every failure re-shows the form beneath it; the premise,
 *  title, length and advanced settings are exactly as the user left them
 *  because the form subtree was never touched (see the module doc above). */
const FAILURE_COPY: Partial<Record<ErrorCode, FailureCopy>> = {
  no_provider: {
    heading: 'No writer is configured',
    body: () =>
      'Add a key to .env.local and restart the dev server. Gemini needs GEMINI_KEY; xAI needs XAI_API_KEY; Anthropic needs ANTHROPIC_API_KEY. You can pick Mock under Advanced to try the flow offline.',
    actions: ['use_mock', 'close'],
  },
  proxy: { heading: "Couldn't reach the writer", body: (ctx) => ctx.message, actions: ['retry', 'close'] },
  network: { heading: "Couldn't reach the writer", body: (ctx) => ctx.message, actions: ['retry', 'close'] },
  tls: {
    heading: "Couldn't verify the connection",
    body: () =>
      "The certificate chain wasn't trusted. If you're behind a corporate proxy, set NODE_EXTRA_CA_CERTS to its CA bundle and restart the dev server.",
    actions: ['retry', 'close'],
  },
  provider_auth: {
    heading: 'The key was rejected',
    body: (ctx) => `${PROVIDER_LONG[ctx.provider]} returned 401. Check the key in .env.local and restart.`,
    actions: ['close'],
  },
  provider_rate_limit: {
    heading: 'The writer is rate-limited',
    body: () => 'Wait a minute, or pick a different provider under Advanced.',
    actions: ['retry', 'close'],
  },
  provider_refused: {
    heading: 'The writer declined this premise',
    body: () =>
      "It wouldn't write from this prompt. Try a different angle — the same story from another character, or a less literal version of the same idea.",
    actions: ['edit', 'close'],
  },
  invalid_output: {
    heading: "The draft didn't hold together",
    body: () =>
      "We asked twice more and it still didn't fit the format. Your premise is untouched — try again, or nudge it toward a smaller cast.",
    actions: ['retry', 'edit'],
  },
  invalid_json: {
    heading: "The draft didn't hold together",
    body: () =>
      "We asked twice more and it still didn't fit the format. Your premise is untouched — try again, or nudge it toward a smaller cast.",
    actions: ['retry', 'edit'],
  },
  disk: { heading: 'Could not save the story', body: (ctx) => `${ctx.message} Check that stories/ is writable.`, actions: ['retry', 'close'] },
  id_conflict: {
    heading: 'Could not save the story',
    body: (ctx) => `${ctx.message} Check that stories/ is writable.`,
    actions: ['retry', 'close'],
  },
  timeout: {
    heading: 'The writer took too long',
    body: () => 'Nothing was saved. Try Short under length, or a faster model under Advanced.',
    actions: ['retry', 'close'],
  },
};
/** Not in §12.4's table (bad_request/internal shouldn't reach a user given
 *  the client only ever sends validated requests, but a fallback is cheaper
 *  than a blank panel if one somehow does). */
const FALLBACK_FAILURE: FailureCopy = {
  heading: 'Something went wrong',
  body: (ctx) => ctx.message || 'The request could not be completed.',
  actions: ['retry', 'close'],
};

interface Disclosure {
  root: HTMLElement;
  setOpen: (v: boolean) => void;
}

export class CreateStory {
  readonly overlay: HTMLElement;
  readonly panel: HTMLElement;
  private readonly h: CreateHandlers;

  /* ── persistent form subtree (see module doc) ── */
  private readonly formWrap: HTMLElement;
  private readonly resultWrap: HTMLElement;
  private readonly premiseEl: HTMLTextAreaElement;
  private readonly countEl: HTMLElement;
  private readonly titleEl: HTMLInputElement;
  /** Doubles as the field CreateStory reads AND the element whose
   *  placeholder setProvider() rewrites — one element, one reference. */
  private readonly modelEl: HTMLInputElement;
  private readonly generateBtn: HTMLButtonElement;
  private readonly lengthBtns: Array<{ value: StoryLength; btn: HTMLElement }> = [];
  private readonly providerBtns: Array<{ value: ProviderId; btn: HTMLElement }> = [];
  private advancedDisc: Disclosure | null = null;

  /* ── form state (mirrors the DOM above; DOM is the source of truth for text fields) ── */
  private length: StoryLength = 'standard';
  private art = false;
  private provider: ProviderId = 'gemini';

  /* ── run state ── */
  private view: CreateView = 'form';
  private submitting = false;
  private jobId: string | null = null;
  private localAbort: AbortController | null = null;
  private startedAt = 0;
  private currentStage: Stage = 'plan';
  private currentStageMessage = '';
  private heard: { provider: ProviderId; model: string } | null = null;
  private assetProgress: { index: number; total: number; label: string } | null = null;
  private notes: string[] = [];
  private readyInfo: { id: string; title: string } | null = null;
  private doneInfo: EvDone | null = null;
  private failure: { code: ErrorCode; message: string; detail?: string[] } | null = null;

  private timerHandle = 0;
  private timerEl: HTMLElement | null = null;

  constructor(parent: HTMLElement, handlers: CreateHandlers) {
    this.h = handlers;
    const shell = overlayShell('Create a Story', { onClose: () => this.h.close(), kicker: 'New' });
    this.overlay = shell.overlay;
    this.panel = shell.panel;
    this.overlay.classList.add('pq-modal--create');
    this.panel.classList.add('pq-modal__panel--create');

    const health = this.h.health();
    this.provider = health?.defaultProvider ?? 'gemini';
    this.art = !!health?.art.available;

    const built = this.buildForm(health);
    this.formWrap = built.root;
    this.premiseEl = built.premise;
    this.countEl = built.count;
    this.titleEl = built.title;
    this.modelEl = built.model;
    this.generateBtn = built.generate;

    this.resultWrap = el('div', { class: 'pq-create__result-wrap', hidden: true });

    shell.body.classList.add('pq-create');
    shell.body.append(this.formWrap, this.resultWrap);
    parent.appendChild(this.overlay);
  }

  /* ─────────────────────────  public surface  ───────────────────────── */

  open(): void {
    if (this.view === 'form') {
      // Autofocus the premise field (§12.2), which requires OUTRACING
      // UILayer's own opening focus. `openModal` focuses the PANEL itself
      // (every modal shell does — see dom.ts's overlayShell doc), on a
      // SINGLE requestAnimationFrame scheduled right after this method
      // returns. Scheduling ours as a nested double-rAF here guarantees it
      // resolves one frame LATER than that single rAF, so it always runs
      // last and wins the focus race rather than being clobbered by it.
      requestAnimationFrame(() => requestAnimationFrame(() => this.premiseEl.focus()));
    }
    // Deliberately does NOT reset `view`/run-state on reopen. A generation
    // started, then the modal closed (Esc/backdrop) without cancelling, is
    // still running — the job is detached by design (§4.5) precisely so
    // that is safe — and `onEvent` keeps updating this component's state
    // the whole time regardless of whether the modal is visible. Reopening
    // therefore naturally rejoins wherever that run actually is (working,
    // painting, even already done) instead of losing the user's place.
    this.renderResult();
  }

  destroy(): void {
    this.stopTimer();
    this.localAbort?.abort();
    this.overlay.remove();
  }

  /* ─────────────────────────  the persistent form  ───────────────────────── */

  private buildForm(health: StorygenHealth | null): {
    root: HTMLElement;
    premise: HTMLTextAreaElement;
    count: HTMLElement;
    title: HTMLInputElement;
    model: HTMLInputElement;
    generate: HTMLButtonElement;
  } {
    // NOTE — this method runs entirely inside the constructor, before any of
    // its own `this.xEl` fields are assigned (those are set from its RETURN
    // VALUE once it comes back — see the constructor above). The event
    // listeners built here must therefore close over the LOCAL variables
    // (`premise`, `count`, …), never `this.premiseEl` etc., even though both
    // resolve to the identical element once construction finishes — the
    // `this.` form would be a use-before-assign the very first time a
    // listener fires if it fired during construction, and reads confusingly
    // either way. `syncCount`/`syncGenerateEnabled` are the two exceptions:
    // they are also called later, from outside this method (retry/useMock
    // paths), so THEY read through `this.premiseEl` — which is exactly why
    // they stay as `this.`-based methods rather than closures here.
    const row = (label: string, control: HTMLElement, extra?: HTMLElement | null): HTMLElement =>
      el('div', { class: 'pq-create__row' }, [
        el('span', { class: 'pq-create__label', text: label }),
        control,
        extra ?? null,
      ]);

    /* ── Premise ── */
    const count = el('span', { class: 'pq-create__count', text: `0 / ${PREMISE_MAX}` });
    const premise = el('textarea', {
      class: 'pq-create__field',
      attrs: { rows: 4, maxlength: PREMISE_MAX, placeholder: 'A place, a person, and something they have to decide before morning.' },
      aria: { label: 'Premise' },
      on: {
        input: () => {
          this.syncCount();
          this.syncGenerateEnabled();
        },
      },
    }) as HTMLTextAreaElement;

    const examples = el(
      'div',
      { class: 'pq-create__examples' },
      EXAMPLE_PREMISES.map((text) =>
        el('button', {
          class: 'pq-create__chip',
          type: 'button',
          text: truncateChip(text),
          title: text,
          on: {
            click: () => {
              premise.value = text;
              premise.focus();
              this.syncCount();
              this.syncGenerateEnabled();
            },
          },
        }),
      ),
    );

    /* ── Title ── */
    const title = el('input', {
      class: 'pq-create__field pq-create__field--line',
      type: 'text',
      attrs: { maxlength: TITLE_MAX, placeholder: 'Leave blank and the story names itself.' },
      aria: { label: 'Title (optional)' },
    }) as HTMLInputElement;

    /* ── Length ── */
    const lengthTrack = el('div', { class: 'pq-create__seg', role: 'radiogroup', aria: { label: 'Length' } });
    for (const opt of LENGTH_OPTIONS) {
      const btn = el('button', {
        class: 'pq-create__segbtn' + (opt.value === this.length ? ' is-active' : ''),
        type: 'button',
        role: 'radio',
        aria: { checked: opt.value === this.length ? 'true' : 'false' },
        text: opt.label,
        on: { click: () => this.setLength(opt.value) },
      });
      this.lengthBtns.push({ value: opt.value, btn });
      lengthTrack.appendChild(btn);
    }

    /* ── Paint the art ── */
    // Reuses SettingsPanel.toggle()'s exact markup (§12.2) — same
    // .pq-switch/.pq-switch__knob classes, so this needs zero new CSS.
    // Availability is fixed for the life of this page (probed once at boot),
    // so — unlike length/provider — this control never needs to sync itself
    // from outside a click; a local closure is all it takes.
    const artAvailable = !!health?.art.available;
    const artKnob = el('span', { class: 'pq-switch__knob', aria: { hidden: true } });
    const artBtn = el(
      'button',
      {
        class: 'pq-switch' + (this.art ? ' is-on' : ''),
        type: 'button',
        role: 'switch',
        disabled: !artAvailable,
        aria: { checked: this.art ? 'true' : 'false', label: 'Paint the art' },
        on: {
          click: () => {
            if (!artAvailable) return;
            this.art = !this.art;
            artBtn.classList.toggle('is-on', this.art);
            artBtn.setAttribute('aria-checked', this.art ? 'true' : 'false');
          },
        },
      },
      [artKnob],
    );
    // .pq-field--toggle already carries its own flex/space-between layout
    // (higher specificity than .pq-create__row's stacked default would be
    // anyway) — no row wrapper needed, .pq-create__form's own grid gap
    // spaces it exactly like every other direct child.
    const artRow = el('div', { class: 'pq-field pq-field--toggle' }, [
      el('div', { class: 'pq-field__copy' }, [
        el('span', { class: 'pq-field__label', text: 'Paint the art' }),
        artAvailable
          ? null
          : el('span', {
              class: 'pq-field__hint',
              text: 'Set GEMINI_KEY in .env.local to paint art. Stories play without it, on themed placeholders.',
            }),
      ]),
      artBtn,
    ]);

    /* ── Advanced: Provider + Model ── */
    const providerTrack = el('div', { class: 'pq-create__seg', role: 'radiogroup', aria: { label: 'Provider' } });
    const providers = PROVIDER_ORDER.filter((p) => p === 'mock' || !!health?.providers[p]?.configured);
    if (!providers.includes(this.provider)) this.provider = providers[0] ?? 'mock';
    for (const p of providers) {
      const btn = el('button', {
        class: 'pq-create__segbtn' + (p === this.provider ? ' is-active' : ''),
        type: 'button',
        role: 'radio',
        aria: { checked: p === this.provider ? 'true' : 'false' },
        text: PROVIDER_SHORT[p],
        on: { click: () => this.setProvider(p, health) },
      });
      this.providerBtns.push({ value: p, btn });
      providerTrack.appendChild(btn);
    }
    const model = el('input', {
      class: 'pq-create__field pq-create__field--line',
      type: 'text',
      attrs: { maxlength: 80, placeholder: health?.providers[this.provider]?.defaultModel ?? '' },
      aria: { label: 'Model' },
    }) as HTMLInputElement;

    const advBody = el('div', { class: 'pq-create__discbody pq-create__advgrid' }, [
      row('Provider', providerTrack),
      row('Model', model),
    ]);
    const advDisc = this.buildDisclosure('Advanced', advBody);
    this.advancedDisc = advDisc;

    /* ── Actions ── */
    const generate = el('button', {
      class: 'pq-btn',
      type: 'button',
      text: 'Generate',
      disabled: true,
      on: { click: () => void this.onGenerate() },
    }) as HTMLButtonElement;
    const cancel = el('button', {
      class: 'pq-btn pq-btn--ghost',
      type: 'button',
      text: 'Cancel',
      on: { click: () => this.h.close() },
    });
    const actions = el('div', { class: 'pq-create__actions' }, [cancel, generate]);

    const root = el('div', { class: 'pq-create__form' }, [
      row('Premise', premise, count),
      examples,
      row('Title', title),
      row('Length', lengthTrack),
      artRow,
      advDisc.root,
      actions,
    ]);

    return { root, premise, count, title, model, generate };
  }

  private setLength(v: StoryLength): void {
    this.length = v;
    for (const { value, btn } of this.lengthBtns) {
      btn.classList.toggle('is-active', value === v);
      btn.setAttribute('aria-checked', value === v ? 'true' : 'false');
    }
  }

  private setProvider(v: ProviderId, health: StorygenHealth | null): void {
    this.provider = v;
    for (const { value, btn } of this.providerBtns) {
      btn.classList.toggle('is-active', value === v);
      btn.setAttribute('aria-checked', value === v ? 'true' : 'false');
    }
    this.modelEl.placeholder = health?.providers[v]?.defaultModel ?? '';
  }

  private syncCount(): void {
    this.countEl.textContent = `${this.premiseEl.value.length} / ${PREMISE_MAX}`;
  }

  private syncGenerateEnabled(): void {
    const enabled = this.premiseEl.value.trim().length >= PREMISE_MIN;
    this.generateBtn.disabled = !enabled;
    // el()'s `disabled: true` prop (used for the button's initial state)
    // sets `aria-disabled` alongside the native attribute — see dom.ts —
    // but only ever ONCE, at construction. The native `.disabled` property
    // is a live, self-reflecting attribute (the browser keeps it in sync
    // automatically); `aria-disabled` is not, so it has to be maintained by
    // hand here or it goes stale the first time this fires: a genuinely
    // enabled button that still screen-reads and automates as disabled.
    if (enabled) this.generateBtn.removeAttribute('aria-disabled');
    else this.generateBtn.setAttribute('aria-disabled', 'true');
  }

  /** A drawn ▸ disclosure — the same chevron-rotate idiom `.pq-menurow__chev`
   *  and `.pq-set__cue` already use, reused rather than reinvented for
   *  "Advanced" and a failed-view issue list alike. */
  private buildDisclosure(label: string, content: HTMLElement, openByDefault = false): Disclosure {
    let open = openByDefault;
    const chev = el('span', { class: 'pq-create__discchev', html: Icons.chevron, aria: { hidden: true } });
    const btn = el(
      'button',
      { class: 'pq-create__disc' + (open ? ' is-open' : ''), type: 'button', aria: { expanded: open ? 'true' : 'false' } },
      [chev, el('span', { class: 'pq-create__disclabel', text: label })],
    );
    content.classList.add('pq-create__discbody');
    content.hidden = !open;
    const apply = (v: boolean): void => {
      open = v;
      content.hidden = !open;
      btn.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    btn.addEventListener('click', () => apply(!open));
    return { root: el('div', { class: 'pq-create__discwrap' }, [btn, content]), setOpen: apply };
  }

  /* ─────────────────────────  submit / cancel / adopt  ───────────────────────── */

  private async onGenerate(): Promise<void> {
    if (this.submitting) return;
    const prompt = this.premiseEl.value.trim();
    if (prompt.length < PREMISE_MIN) return;

    this.submitting = true;
    this.failure = null;
    this.notes = [];
    this.assetProgress = null;
    this.readyInfo = null;
    this.doneInfo = null;
    this.jobId = null;
    this.heard = null;
    this.currentStage = 'plan';
    this.currentStageMessage = STAGE_COPY.plan;
    // Started here, not left for the 'hello' handler to set: 'connecting' is
    // the (usually brief) gap before hello arrives, and the working view's
    // timer renders from the very first frame of THIS view — without this,
    // startedAt would still be 0 (or a previous run's stale value) and the
    // clock would print nonsense until hello finally refines it below.
    this.startedAt = Date.now();
    this.startTimer();
    this.setView('connecting');

    const req: GenerateStoryRequest = { prompt };
    const title = this.titleEl.value.trim();
    if (title) req.title = title;
    const model = this.modelEl.value.trim();
    req.options = { provider: this.provider, art: this.art, length: this.length };
    if (model) req.options.model = model;

    this.localAbort = new AbortController();
    try {
      await this.h.submit(req, (msg) => this.onEvent(msg), this.localAbort.signal);
    } catch (err) {
      this.onTransportFault(err);
    } finally {
      this.submitting = false;
      this.localAbort = null;
    }
  }

  private onEvent(msg: SseMessage): void {
    switch (msg.event) {
      case 'hello': {
        const e = msg.data as EvHello;
        this.jobId = e.jobId;
        this.heard = { provider: e.provider, model: e.model };
        this.startedAt = e.startedAt || Date.now();
        this.startTimer();
        this.setView('working');
        break;
      }
      case 'stage': {
        const e = msg.data as EvStage;
        this.currentStage = e.stage;
        this.currentStageMessage = e.message || STAGE_COPY[e.stage] || '';
        this.renderResult();
        break;
      }
      case 'note': {
        const e = msg.data as EvNote;
        if (e.level === 'warn') {
          this.notes.push(e.message);
          if (this.notes.length > 3) this.notes.shift();
          this.renderResult();
        }
        break;
      }
      case 'asset': {
        const e = msg.data as EvAsset;
        this.assetProgress = { index: e.index, total: e.total, label: e.label };
        this.renderResult();
        break;
      }
      case 'ready': {
        const e = msg.data as EvReady;
        this.readyInfo = { id: e.id, title: e.title };
        // art:'off' stays on the working view — done arrives right behind it
        // per §5.1's ordering guarantee, and there is nothing worth showing
        // in between. art:'running' promotes to the ready-to-play banner.
        if (e.art === 'running') this.setView('painting');
        break;
      }
      case 'done': {
        const e = msg.data as EvDone;
        this.doneInfo = e;
        this.stopTimer();
        this.setView('done');
        break;
      }
      case 'error': {
        const e = msg.data as EvError;
        this.stopTimer();
        if (e.code === 'cancelled') this.resetToForm();
        else {
          this.failure = { code: e.code, message: e.message, detail: e.detail };
          this.setView('failed');
        }
        break;
      }
    }
  }

  private onTransportFault(err: unknown): void {
    if (this.view === 'form') return; // already handled locally (see onCancel)
    this.stopTimer();
    const message = err instanceof Error ? err.message : 'The connection to the writer failed.';
    this.failure = { code: 'network', message };
    this.setView('failed');
  }

  private onCancel(): void {
    if (this.jobId) {
      // The DELETE is what actually stops it (§12.3) — this does NOT abort
      // the local fetch. The job's own pipeline checks its abort signal
      // between stages and pushes a terminal `error{code:'cancelled'}`
      // through the SAME still-open stream, which onEvent's 'error' case
      // turns into a silent return to the form. Severing the connection
      // here instead would race that event and, worse, contradicts the
      // whole point of a detached job: "Begin now" needs it to keep running
      // even after the client stops watching.
      this.h.cancel(this.jobId);
    } else {
      // No jobId yet — a narrow race in 'connecting', before `hello` has
      // arrived. Nothing exists server-side to cancel; sever the request.
      this.localAbort?.abort();
      this.resetToForm();
    }
  }

  private onStopPainting(): void {
    if (this.jobId) this.h.cancel(this.jobId);
    // The story is already written (ready fired) — cancelling here only
    // stops the art job. Settle locally with what is already known rather
    // than waiting on a server round trip the user just asked to skip; a
    // genuine `done` arriving moments later (see onEvent) simply refreshes
    // the real art counts over these placeholder zeros.
    if (this.readyInfo && !this.doneInfo) {
      this.doneInfo = {
        id: this.readyInfo.id,
        title: this.readyInfo.title,
        durationMs: Date.now() - this.startedAt,
        warnings: [],
        art: { generated: 0, skipped: 0, failed: 0 },
      };
    }
    this.stopTimer();
    this.setView('done');
  }

  private onBegin(): void {
    const info = this.doneInfo ?? this.readyInfo;
    if (info) this.h.adopt(info.id);
  }

  private resetToForm(): void {
    this.stopTimer();
    this.jobId = null;
    this.assetProgress = null;
    this.notes = [];
    this.setView('form');
  }

  private retry(): void {
    void this.onGenerate();
  }

  private editPremise(): void {
    this.failure = null;
    this.setView('form');
    requestAnimationFrame(() => this.premiseEl.focus());
  }

  private useMock(): void {
    // setProvider() already walks providerBtns updating class/aria-checked —
    // no need to repeat that here.
    this.setProvider('mock', this.h.health());
    this.advancedDisc?.setOpen(true);
    void this.onGenerate();
  }

  /* ─────────────────────────  view switching + rendering  ───────────────────────── */

  private setView(next: CreateView): void {
    this.view = next;
    this.formWrap.hidden = next !== 'form';
    this.resultWrap.hidden = next === 'form';
    this.renderResult();
  }

  private renderResult(): void {
    if (this.view === 'form') return;
    clear(this.resultWrap);
    this.timerEl = null;
    switch (this.view) {
      case 'connecting':
      case 'working':
        this.renderWorking(false);
        break;
      case 'painting':
        this.renderWorking(true);
        break;
      case 'done':
        this.renderDone();
        break;
      case 'failed':
        this.renderFailed();
        break;
    }
  }

  private renderWorking(painting: boolean): void {
    const wrap = el('div', { class: 'pq-create__working' });

    if (painting && this.readyInfo) {
      wrap.appendChild(
        el('div', { class: 'pq-create__ready' }, [
          el('p', { class: 'pq-create__readytitle', text: `${this.readyInfo.title} is ready to play.` }),
          el('p', {
            class: 'pq-create__readybody',
            text: 'The art is still being painted — it will be there the next time you open the story.',
          }),
          el('div', { class: 'pq-create__actions' }, [
            el('span', { class: 'pq-create__keepwatch', text: 'Keep watching' }),
            el('button', {
              class: 'pq-btn pq-btn--ghost',
              type: 'button',
              text: 'Stop painting',
              on: { click: () => this.onStopPainting() },
            }),
            el('button', { class: 'pq-btn', type: 'button', text: 'Begin now', on: { click: () => this.onBegin() } }),
          ]),
        ]),
      );
    }

    /* ── stage rail ── */
    const idx = STAGE_RAIL.findIndex((r) => r.stages.includes(this.currentStage));
    const rail = el('div', { class: 'pq-create__rail', role: 'list', aria: { label: 'Progress' } });
    STAGE_RAIL.forEach((r, i) => {
      const state = i < idx ? 'past' : i === idx ? 'live' : 'future';
      rail.appendChild(
        el('span', { class: `pq-create__step is-${state}`, role: 'listitem' }, [
          state === 'live' ? el('span', { class: 'pq-create__stepdot', aria: { hidden: true } }) : null,
          el('span', { class: 'pq-create__steplabel', text: r.label }),
        ]),
      );
    });
    wrap.appendChild(rail);

    /* ── narrative line + elapsed timer ── */
    const timer = el('span', { class: 'pq-create__timer', text: '00:00' });
    this.timerEl = timer;
    this.tickTimer();
    wrap.appendChild(
      el('div', { class: 'pq-create__stagerow' }, [
        el('p', { class: 'pq-create__stagecopy', text: this.currentStageMessage || STAGE_COPY[this.currentStage] }),
        timer,
      ]),
    );

    /* ── progress bar: indeterminate until an asset event arrives, then real ── */
    const determinate = this.assetProgress !== null;
    const track = el('div', { class: 'pq-create__bar' + (determinate ? '' : ' is-indeterminate') });
    const fill = el('div', { class: 'pq-create__barfill' });
    if (determinate && this.assetProgress) {
      const pct = this.assetProgress.total > 0 ? (this.assetProgress.index / this.assetProgress.total) * 100 : 0;
      fill.style.width = `${Math.max(2, Math.min(100, pct))}%`;
    }
    track.appendChild(fill);
    wrap.appendChild(track);

    if (determinate && this.assetProgress) {
      wrap.appendChild(
        el('p', {
          class: 'pq-create__assetline',
          text: `Painting ${this.assetProgress.label} (${this.assetProgress.index} of ${this.assetProgress.total})…`,
        }),
      );
    }

    if (this.notes.length) {
      wrap.appendChild(
        el(
          'div',
          { class: 'pq-create__notes' },
          this.notes.map((n) => el('p', { class: 'pq-create__note', text: n })),
        ),
      );
    }

    if (this.heard) {
      wrap.appendChild(
        el('p', {
          class: 'pq-create__byline',
          text: `${PROVIDER_SHORT[this.heard.provider]} · ${this.heard.model}`,
        }),
      );
    }

    if (!painting) {
      wrap.appendChild(
        el('div', { class: 'pq-create__actions' }, [
          el('button', { class: 'pq-btn pq-btn--ghost', type: 'button', text: 'Cancel', on: { click: () => this.onCancel() } }),
        ]),
      );
    }

    this.resultWrap.appendChild(wrap);
  }

  private renderDone(): void {
    const info = this.doneInfo;
    if (!info) return;
    const artTotal = info.art.generated + info.art.skipped + info.art.failed;
    this.resultWrap.appendChild(
      el('div', { class: 'pq-create__result' }, [
        el('p', { class: 'pq-create__resulttitle', text: `${info.title} is ready.` }),
        info.warnings.length
          ? el('p', {
              class: 'pq-create__resulthint',
              text: `${info.warnings.length} ${info.warnings.length === 1 ? 'detail was' : 'details were'} smoothed over automatically during validation.`,
            })
          : null,
        artTotal
          ? el('p', {
              class: 'pq-create__resulthint',
              text: `Art: ${info.art.generated} painted${info.art.skipped ? `, ${info.art.skipped} skipped` : ''}${info.art.failed ? `, ${info.art.failed} failed` : ''}.`,
            })
          : null,
        el('div', { class: 'pq-create__actions' }, [
          el('button', { class: 'pq-btn pq-btn--ghost', type: 'button', text: 'Close', on: { click: () => this.h.close() } }),
          el('button', { class: 'pq-btn', type: 'button', text: 'Begin', on: { click: () => this.onBegin() } }),
        ]),
      ]),
    );
  }

  private renderFailed(): void {
    const f = this.failure;
    if (!f) return;
    const copy = FAILURE_COPY[f.code] ?? FALLBACK_FAILURE;
    const wrap = el('div', { class: 'pq-create__fail' }, [
      el('p', { class: 'pq-create__failheading', text: copy.heading }),
      el('p', { class: 'pq-create__failbody', text: copy.body({ message: f.message, provider: this.provider }) }),
    ]);
    if (f.detail && f.detail.length) {
      const list = el(
        'ul',
        { class: 'pq-create__faillist' },
        f.detail.map((d) => el('li', { text: d })),
      );
      wrap.appendChild(this.buildDisclosure('Details', list).root);
    }
    const actions = el('div', { class: 'pq-create__actions' });
    for (const a of copy.actions) actions.appendChild(this.failureActionButton(a));
    wrap.appendChild(actions);
    this.resultWrap.appendChild(wrap);
  }

  private failureActionButton(a: FailureAction): HTMLElement {
    switch (a) {
      case 'retry':
        return el('button', { class: 'pq-btn', type: 'button', text: 'Try again', on: { click: () => this.retry() } });
      case 'edit':
        return el('button', {
          class: 'pq-btn pq-btn--ghost',
          type: 'button',
          text: 'Edit premise',
          on: { click: () => this.editPremise() },
        });
      case 'use_mock':
        return el('button', { class: 'pq-btn', type: 'button', text: 'Use Mock', on: { click: () => this.useMock() } });
      case 'close':
        return el('button', { class: 'pq-btn pq-btn--ghost', type: 'button', text: 'Close', on: { click: () => this.h.close() } });
    }
  }

  /* ─────────────────────────  elapsed timer  ───────────────────────── */

  private startTimer(): void {
    this.stopTimer();
    this.timerHandle = window.setInterval(() => this.tickTimer(), 250);
  }

  private stopTimer(): void {
    if (this.timerHandle) {
      window.clearInterval(this.timerHandle);
      this.timerHandle = 0;
    }
  }

  private tickTimer(): void {
    if (!this.timerEl) return;
    const totalSeconds = Math.max(0, Math.floor((Date.now() - this.startedAt) / 1000));
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    this.timerEl.textContent = `${mm}:${ss}`;
  }
}

/** Chip labels stay short — the full premise rides in `title` (a native
 *  tooltip) so nothing is lost, only visually deferred. */
function truncateChip(text: string): string {
  const max = 46;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
