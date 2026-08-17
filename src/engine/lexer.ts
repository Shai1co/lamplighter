/**
 * Picture Quest — PQScript lexer.
 *
 * Pure, dependency-free line tokenizer/classifier consumed by parser.ts.
 * It strips comments (quote-aware), drops blank lines, and tags every
 * remaining line with a coarse kind. All finer parsing (guards, directive
 * args, speaker split) is done by the parser using the small helpers here.
 */

/** Coarse classification of a source line. */
export type LexKind = 'label' | 'directive' | 'say' | 'choice' | 'jump';

export interface LexLine {
  /** 1-based source line number (for warnings). */
  line: number;
  kind: LexKind;
  /** Content after comment-strip + trim. Never empty. */
  raw: string;
}

/**
 * Remove a trailing `# comment`. Quote-aware so hashes inside double-quoted
 * strings (e.g. choice text) are preserved.
 */
export function stripComment(line: string): string {
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuote = !inQuote;
    else if (c === '#' && !inQuote) return line.slice(0, i);
  }
  return line;
}

/** Split a source string into classified, non-empty lines. */
export function lex(src: string): LexLine[] {
  const out: LexLine[] = [];
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = stripComment(lines[i]).trim();
    if (!raw) continue;
    let kind: LexKind;
    if (raw.startsWith('::')) kind = 'label';
    else if (raw.startsWith('@')) kind = 'directive';
    else if (raw.startsWith('->')) kind = 'jump';
    else if (raw.startsWith('>')) kind = 'choice';
    else kind = 'say';
    out.push({ line: i + 1, kind, raw });
  }
  return out;
}

/**
 * Split a directive argument string into whitespace-delimited tokens,
 * keeping double-quoted spans intact (quotes stripped). Used for @chapter
 * titles and general directive args.
 */
export function splitTokens(s: string): string[] {
  const out: string[] = [];
  const n = s.length;
  let i = 0;
  while (i < n) {
    while (i < n && /\s/.test(s[i])) i++;
    if (i >= n) break;
    if (s[i] === '"') {
      i++;
      let buf = '';
      while (i < n && s[i] !== '"') {
        buf += s[i];
        i++;
      }
      i++; // closing quote (or EOL)
      out.push(buf);
    } else {
      let buf = '';
      while (i < n && !/\s/.test(s[i])) {
        buf += s[i];
        i++;
      }
      out.push(buf);
    }
  }
  return out;
}

/** Positional args + `key:value` args parsed from a token list. */
export interface DirectiveArgs {
  positional: string[];
  kv: Record<string, string>;
}

export function parseArgs(tokens: string[]): DirectiveArgs {
  const positional: string[] = [];
  const kv: Record<string, string> = {};
  for (const tok of tokens) {
    const ci = tok.indexOf(':');
    if (ci > 0 && /^[A-Za-z_][A-Za-z0-9_]*$/.test(tok.slice(0, ci))) {
      kv[tok.slice(0, ci)] = tok.slice(ci + 1);
    } else {
      positional.push(tok);
    }
  }
  return { positional, kv };
}

/**
 * Peel a trailing inline guard `{ ... }` off a say/choice/jump line.
 * A leading `var:` / `flag:` namespace hint inside the braces is stripped.
 */
export function extractGuard(s: string): { text: string; guard?: string } {
  const m = s.match(/\{([^{}]*)\}\s*$/);
  if (!m || m.index === undefined) return { text: s.trim() };
  let g = m[1].trim();
  const ns = g.match(/^(?:var|flag)\s*:\s*(.*)$/);
  if (ns) g = ns[1].trim();
  const text = s.slice(0, m.index).trim();
  return g ? { text, guard: g } : { text };
}
