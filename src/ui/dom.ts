/**
 * Lamplighter — tiny DOM toolkit.
 *
 * A dependency-free `el(tag, props, children)` builder plus a handful of helpers
 * the UI layer leans on. No framework, no virtual DOM — just crisp, explicit
 * element construction so every component stays small and readable.
 */

export type Child = Node | string | number | null | undefined | false;

/** Declarative element properties accepted by {@link el}. */
export interface ElProps {
  class?: string;
  id?: string;
  /** Sets textContent (safely escaped). */
  text?: string | number;
  /** Sets innerHTML — only ever used with trusted, author-controlled markup (icons). */
  html?: string;
  title?: string;
  role?: string;
  /** For <button>/<input>: the type attribute. */
  type?: string;
  /** For <a>: href. */
  href?: string;
  name?: string;
  value?: string | number;
  tabIndex?: number;
  disabled?: boolean;
  hidden?: boolean;
  /** Inline styles as an object or a raw cssText string. */
  style?: Partial<CSSStyleDeclaration> | string;
  /** Arbitrary attributes; `true` renders a bare attribute, `false`/nullish removes it. */
  attrs?: Record<string, string | number | boolean | null | undefined>;
  /** data-* attributes. */
  data?: Record<string, string | number | boolean>;
  /** aria-* attributes (key without the `aria-` prefix). */
  aria?: Record<string, string | number | boolean>;
  /** Event listeners keyed by event name, e.g. { click: fn }. */
  on?: Record<string, EventListener>;
}

/**
 * Create an element with declarative props and children.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElProps = {},
  children: Child | Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  if (props.class !== undefined) node.className = props.class;
  if (props.id !== undefined) node.id = props.id;
  if (props.text !== undefined) node.textContent = String(props.text);
  if (props.html !== undefined) node.innerHTML = props.html;
  if (props.title !== undefined) node.title = props.title;
  if (props.role !== undefined) node.setAttribute('role', props.role);
  if (props.type !== undefined) node.setAttribute('type', props.type);
  if (props.href !== undefined) node.setAttribute('href', props.href);
  if (props.name !== undefined) node.setAttribute('name', props.name);
  if (props.tabIndex !== undefined) node.tabIndex = props.tabIndex;
  if (props.hidden !== undefined) node.hidden = props.hidden;

  if (props.value !== undefined) {
    const v = String(props.value);
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) node.value = v;
    else node.setAttribute('value', v);
  }

  if (props.disabled) {
    node.setAttribute('disabled', '');
    node.setAttribute('aria-disabled', 'true');
  }

  if (props.style !== undefined) {
    if (typeof props.style === 'string') node.style.cssText = props.style;
    else Object.assign(node.style, props.style);
  }

  if (props.attrs) {
    for (const [k, v] of Object.entries(props.attrs)) {
      if (v === null || v === undefined || v === false) continue;
      node.setAttribute(k, v === true ? '' : String(v));
    }
  }

  if (props.data) {
    for (const [k, v] of Object.entries(props.data)) node.dataset[k] = String(v);
  }

  if (props.aria) {
    for (const [k, v] of Object.entries(props.aria)) node.setAttribute(`aria-${k}`, String(v));
  }

  if (props.on) {
    for (const [type, listener] of Object.entries(props.on)) node.addEventListener(type, listener);
  }

  appendChildren(node, children);
  return node;
}

/** Append one or many children, flattening arrays and ignoring nullish/false. */
export function appendChildren(node: Node, children: Child | Child[]): void {
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Remove every child of a node. */
export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/* ───────────────────────────  Smart quotes  ───────────────────────────
 *
 * Every string the reader ever SEES goes through this on its way to a text node.
 *
 * Story scripts are typed on a keyboard, so they carry typewriter quotes: ' and
 * ". The panel serif and the reading serif both carry proper ' ' " " in their
 * character sets and set them beautifully, so the frame was printing an
 * apostrophe two different ways in two different places — a curly one inside the
 * proxy pane's italic line, a straight vertical tick in the narration bar
 * fourteen hundred pixels below it. On the rubric that is a typography crime
 * with its own bullet ("wrong quotes"), and it is the single most legible one,
 * because a straight apostrophe in a transitional serif is a slab of vertical
 * stem where the face expects a comma-shaped mark: it does not merely look
 * wrong, it looks like *unstyled input*.
 *
 * Fixed in the RENDERER rather than in the scripts, deliberately. A story file
 * is authored prose and an author should be able to type an apostrophe; making
 * correct typography a thing writers have to remember guarantees it decays. The
 * substitution is also idempotent — text already carrying curly marks passes
 * through untouched — so a script may use either.
 *
 * The rules, in order, and each one is the standard compositor's rule:
 *   1. an apostrophe INSIDE a word is always a right single quote — don't,
 *      it's, Lantern's. This runs first so an elision never gets read as an
 *      opening quote by the rules below;
 *   2. an elided leading apostrophe — 'round, 'til, '04 — is also a RIGHT
 *      single quote, because it stands for dropped letters. This is the one
 *      every naive implementation gets backwards;
 *   3. a double quote opens if what precedes it is a start-of-string, a space,
 *      or an opening bracket / dash, and closes otherwise;
 *   4. remaining single quotes follow the same open/close test;
 *   5. a doubled hyphen becomes an em dash, and three dots become an ellipsis —
 *      the same "the face has a glyph for this" argument as the quotes.
 */
const OPENERS = new Set([' ', '\n', '\t', '(', '[', '{', '—', '–', '‘', '“', ' ']);

export function smartQuotes(text: string): string {
  if (!text) return text;
  const s = text
    .replace(/---/g, '—')
    .replace(/--/g, '—')
    .replace(/\.\.\./g, '…')
    // …and the space the mark owes the word after it. A true ellipsis is ONE
    // glyph whose three dots are set on the face's own tight sidebearings, so
    // "…Hello" prints with the final dot almost touching the H — which reads, at
    // a glance and in a screenshot, as three typed periods run into a capital.
    // The compositor's rule is that an ellipsis is followed by a thin space when
    // a word follows it; U+2009 is already treated as whitespace by the
    // typewriter's cadence (see DialogueBox.isSpace), so this costs nothing but
    // the ~3px of air that makes the glyph read as the glyph it is.
    .replace(/…(?=[A-Za-z0-9‘“(])/g, '… ');
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== "'" && ch !== '"') {
      out += ch;
      continue;
    }
    const prev = i > 0 ? s[i - 1] : '';
    const next = i + 1 < s.length ? s[i + 1] : '';
    if (ch === "'") {
      // Rule 1 — intra-word elision (don't, o'clock). Rule 2 — leading elision
      // ('round, '04): a letter or digit follows and a word does NOT precede.
      const wordBefore = /[A-Za-z0-9]/.test(prev);
      const wordAfter = /[A-Za-z0-9]/.test(next);
      if (wordBefore && wordAfter) {
        out += '’';
      } else if (!wordBefore && wordAfter && (prev === '' || OPENERS.has(prev))) {
        // Ambiguous: '92 and 'round are elisions; 'a quoted phrase' opens. The
        // tie-breaker is whether a closing single quote appears later in the
        // string — a real quotation has one, an elision does not.
        out += /'/.test(s.slice(i + 1)) ? '‘' : '’';
      } else {
        out += prev === '' || OPENERS.has(prev) ? '‘' : '’';
      }
      continue;
    }
    out += prev === '' || OPENERS.has(prev) ? '“' : '”';
  }
  return out;
}

/** Convenience: create an SVG-bearing <span> for an icon (trusted markup). */
export function icon(svg: string, cls = 'pq-ic'): HTMLSpanElement {
  return el('span', { class: cls, html: svg, aria: { hidden: true } });
}

/** Parse `#rrggbb` / `#rgb` into an "r g b" triplet string, or null if invalid. */
export function rgbTriplet(hex: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Human-friendly relative-ish timestamp for save slots. */
export function formatWhen(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = now - d.getTime();
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return 'just now';
  if (diff < hr) return `${Math.floor(diff / min)} min ago`;
  if (diff < day && d.getDate() === new Date().getDate()) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** True unless the user has asked for reduced motion at the OS level. */
export function systemMotionOK(): boolean {
  return !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/** Focusable descendants inside a container, in tab order. */
export function focusables(root: HTMLElement): HTMLElement[] {
  const sel =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]),' +
    ' textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll<HTMLElement>(sel)).filter(
    (n) => n.offsetParent !== null || n === document.activeElement,
  );
}

/* ───────────────────────────  Modal shell  ─────────────────────────── */

export interface OverlayShell {
  /** Full-screen dimmer + centering layer (role="dialog"). */
  overlay: HTMLElement;
  /** The glass panel itself (focus target / trap root). */
  panel: HTMLElement;
  /** Content region below the header. */
  body: HTMLElement;
  /** Update the visible + accessible title. */
  setTitle(text: string): void;
}

/**
 * Build a consistent glass modal shell (backdrop, panel, header with title +
 * close button). Backdrop click and the close button both invoke `onClose`.
 */
export function overlayShell(
  title: string,
  opts: { wide?: boolean; onClose: () => void; kicker?: string } = { onClose: () => {} },
): OverlayShell {
  const heading = el('h2', { class: 'pq-modal__title', text: title });
  const kicker = opts.kicker
    ? el('span', { class: 'pq-modal__kicker', text: opts.kicker, aria: { hidden: true } })
    : null;
  const body = el('div', { class: 'pq-modal__body' });
  // Deliberately NOT .pq-iconbtn: a 40px rounded rect that fills on hover and
  // takes the global focus ring is generic web chrome. This one is a 28px
  // hairline disc with its own hover glow and its own focus treatment.
  const closeBtn = el('button', {
    class: 'pq-modal__close',
    type: 'button',
    html: Icons.close,
    aria: { label: 'Close' },
    on: { click: opts.onClose },
  });

  const panel = el(
    'div',
    {
      class: opts.wide ? 'pq-modal__panel pq-modal__panel--wide' : 'pq-modal__panel',
      role: 'document',
      // Opening focus lands on the panel, not on the first control inside it —
      // the standard dialog pattern, and it keeps a keyboard focus ring off the
      // close button in every captured frame.
      tabIndex: -1,
    },
    [
      el('header', { class: 'pq-modal__head' }, [
        el('div', { class: 'pq-modal__titles' }, [kicker, heading]),
        closeBtn,
      ]),
      body,
    ],
  );

  // The rack focus. A dedicated plate rather than a filter on the overlay
  // itself, because it needs a MASK to make the defocus progressive — one sharp
  // focal plane on the speaker, blur deepening with distance from it — and a
  // mask on the overlay would take the panel with it. Purely decorative; it
  // sits behind the panel and never sees a pointer event.
  const defocus = el('div', { class: 'pq-modal__defocus', aria: { hidden: true } });

  const overlay = el(
    'div',
    {
      class: 'pq-modal',
      role: 'dialog',
      hidden: true,
      aria: { modal: 'true', label: title },
      on: {
        click: (e: Event) => {
          // The defocus plate is pointer-events:none, so a click anywhere off
          // the panel still lands on the overlay itself.
          if (e.target === overlay) opts.onClose();
        },
      },
    },
    [defocus, panel],
  );

  return {
    overlay,
    panel,
    body,
    setTitle(text: string) {
      heading.textContent = text;
      overlay.setAttribute('aria-label', text);
    },
  };
}

/* ───────────────────────────  Icon set (hairline, 1.6px stroke)  ─────────────────────────── */

const S = (paths: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"` +
  ` stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const Icons = {
  menu: S('<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>'),
  close: S('<path d="M6 6l12 12"/><path d="M18 6L6 18"/>'),
  save: S(
    '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4"/><rect x="8" y="13" width="8" height="6" rx="1"/>',
  ),
  load: S('<path d="M4 7h5l2 2h9v9a2 2 0 0 1-2 2H4z"/><path d="M4 7V5h4l2 2"/>'),
  settings: S(
    '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M18.5 5.5L17 7M7 17l-1.5 1.5"/>',
  ),
  backlog: S('<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/>'),
  home: S('<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>'),
  trash: S('<path d="M5 7h14"/><path d="M9 7V5h6v2"/><path d="M7 7l1 12h8l1-12"/>'),
  chevron: S('<path d="M6 9l6 6 6-6"/>'),
  play: S('<path d="M8 5l11 7-11 7z"/>'),
  spark: S('<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/>'),
  info: S('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>'),
  quill: S('<path d="M4 20c6-2 8-6 12-14 2 4 0 9-4 11-2 1-5 2-8 3z"/><path d="M4 20l4-4"/>'),
} as const;
