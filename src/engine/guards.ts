/**
 * Lamplighter — safe guard expression evaluator.
 *
 * A tiny recursive-descent interpreter for the guard mini-language used in
 * `{ ... }` conditions and `-> label {expr}` jumps. NO eval / Function — the
 * expression is tokenized and walked by hand. Everything is evaluated in the
 * number domain (booleans coerce to 1/0, missing identifiers to 0); the final
 * result is truthy when it is non-zero.
 *
 * Supported: identifiers, numbers, `true`/`false`, unary `!` and `-`,
 * binary `|| && == != < <= > >= + - * /`, and parentheses, with correct
 * precedence. Commas and whitespace are ignored.
 */

import type { SetNode } from '../core/types';

type Vars = Record<string, number | boolean>;

function toNum(x: number | boolean | undefined): number {
  if (typeof x === 'boolean') return x ? 1 : 0;
  if (typeof x === 'number') return Number.isFinite(x) ? x : 0;
  return 0;
}

type Token =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lp' }
  | { t: 'rp' };

const TWO_CHAR = ['&&', '||', '==', '!=', '>=', '<='];

function tokenize(s: string): Token[] {
  const out: Token[] = [];
  const n = s.length;
  let i = 0;
  while (i < n) {
    const c = s[i];
    if (/\s/.test(c) || c === ',') {
      i++;
      continue;
    }
    if ((c >= '0' && c <= '9') || (c === '.' && i + 1 < n && s[i + 1] >= '0' && s[i + 1] <= '9')) {
      let j = i + 1;
      while (j < n && /[0-9.]/.test(s[j])) j++;
      out.push({ t: 'num', v: parseFloat(s.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_]/.test(s[j])) j++;
      out.push({ t: 'id', v: s.slice(i, j) });
      i = j;
      continue;
    }
    const pair = s.slice(i, i + 2);
    if (TWO_CHAR.includes(pair)) {
      out.push({ t: 'op', v: pair });
      i += 2;
      continue;
    }
    if (c === '(') {
      out.push({ t: 'lp' });
      i++;
      continue;
    }
    if (c === ')') {
      out.push({ t: 'rp' });
      i++;
      continue;
    }
    if ('!+-*/<>'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
      continue;
    }
    throw new Error(`Unexpected character '${c}' in guard`);
  }
  return out;
}

class Parser {
  private i = 0;
  constructor(
    private readonly toks: Token[],
    private readonly vars: Vars,
  ) {}

  evaluate(): number {
    const v = this.or();
    if (this.i !== this.toks.length) throw new Error('Trailing tokens in guard');
    return v;
  }

  private peek(): Token | undefined {
    return this.toks[this.i];
  }

  private isOp(v: string): boolean {
    const tk = this.toks[this.i];
    return !!tk && tk.t === 'op' && tk.v === v;
  }

  private eatOp(): string {
    const tk = this.toks[this.i++];
    return tk && tk.t === 'op' ? tk.v : '';
  }

  private or(): number {
    let l = this.and();
    while (this.isOp('||')) {
      this.eatOp();
      const r = this.and();
      l = l !== 0 || r !== 0 ? 1 : 0;
    }
    return l;
  }

  private and(): number {
    let l = this.eq();
    while (this.isOp('&&')) {
      this.eatOp();
      const r = this.eq();
      l = l !== 0 && r !== 0 ? 1 : 0;
    }
    return l;
  }

  private eq(): number {
    let l = this.cmp();
    while (this.isOp('==') || this.isOp('!=')) {
      const op = this.eatOp();
      const r = this.cmp();
      l = op === '==' ? (l === r ? 1 : 0) : l !== r ? 1 : 0;
    }
    return l;
  }

  private cmp(): number {
    let l = this.add();
    while (this.isOp('<') || this.isOp('<=') || this.isOp('>') || this.isOp('>=')) {
      const op = this.eatOp();
      const r = this.add();
      l =
        op === '<' ? (l < r ? 1 : 0) : op === '<=' ? (l <= r ? 1 : 0) : op === '>' ? (l > r ? 1 : 0) : l >= r ? 1 : 0;
    }
    return l;
  }

  private add(): number {
    let l = this.mul();
    while (this.isOp('+') || this.isOp('-')) {
      const op = this.eatOp();
      const r = this.mul();
      l = op === '+' ? l + r : l - r;
    }
    return l;
  }

  private mul(): number {
    let l = this.unary();
    while (this.isOp('*') || this.isOp('/')) {
      const op = this.eatOp();
      const r = this.unary();
      l = op === '*' ? l * r : r === 0 ? 0 : l / r;
    }
    return l;
  }

  private unary(): number {
    if (this.isOp('!')) {
      this.eatOp();
      return this.unary() === 0 ? 1 : 0;
    }
    if (this.isOp('-')) {
      this.eatOp();
      return -this.unary();
    }
    if (this.isOp('+')) {
      this.eatOp();
      return this.unary();
    }
    return this.primary();
  }

  private primary(): number {
    const tk = this.peek();
    if (!tk) throw new Error('Unexpected end of guard');
    if (tk.t === 'lp') {
      this.i++;
      const v = this.or();
      const close = this.peek();
      if (!close || close.t !== 'rp') throw new Error('Missing )');
      this.i++;
      return v;
    }
    if (tk.t === 'num') {
      this.i++;
      return tk.v;
    }
    if (tk.t === 'id') {
      this.i++;
      if (tk.v === 'true') return 1;
      if (tk.v === 'false') return 0;
      return toNum(this.vars[tk.v]);
    }
    throw new Error('Unexpected token in guard');
  }
}

/**
 * Evaluate a guard expression against the current variable set.
 * Returns `true` for an empty/whitespace guard, and `false` on any parse or
 * evaluation error (fail-closed, so a malformed guard never crashes a story).
 */
export function evalGuard(expr: string, vars: Vars): boolean {
  if (!expr || !expr.trim()) return true;
  try {
    const toks = tokenize(expr);
    if (toks.length === 0) return true;
    return new Parser(toks, vars).evaluate() !== 0;
  } catch {
    return false;
  }
}

/**
 * Apply a `@set` mutation to the variable map.
 * `=` assigns (number or boolean); `+`/`+=` and `-`/`-=` do numeric math.
 */
export function applySet(vars: Vars, node: SetNode): void {
  const cur = toNum(vars[node.target]);
  switch (node.op) {
    case '=':
      vars[node.target] = node.value;
      break;
    case '+':
    case '+=':
      vars[node.target] = cur + toNum(node.value);
      break;
    case '-':
    case '-=':
      vars[node.target] = cur - toNum(node.value);
      break;
  }
}
