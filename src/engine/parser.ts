/**
 * Lamplighter — PQScript parser.
 *
 * Turns readable `.pq` source into a ParsedStory (ordered labels → node lists).
 * The grammar is documented in docs/superpowers/specs (§4). The parser is
 * deliberately tolerant: unknown directives and malformed lines produce a
 * ParseWarning and are skipped — parse() never throws.
 */

import type {
  AmbienceNode,
  BgNode,
  CameraMove,
  CameraNode,
  ChapterNode,
  ChoiceKind,
  ChoiceNode,
  ChoiceOption,
  CharSide,
  EnterNode,
  ExitNode,
  FxKind,
  FxNode,
  JumpNode,
  MoveNode,
  MusicNode,
  ParseWarning,
  ParsedStory,
  SayNode,
  SetNode,
  SetOp,
  StoryNode,
  WeatherKind,
  WeatherNode,
} from '../core/types';
import { extractGuard, lex, parseArgs, splitTokens } from './lexer';

const CAMERA_MOVES: readonly CameraMove[] = ['push', 'pull', 'pan-left', 'pan-right', 'still'];
const WEATHER_KINDS: readonly WeatherKind[] = ['none', 'rain', 'snow', 'dust', 'fog'];
const FX_KINDS: readonly FxKind[] = ['flash', 'shake', 'dissolve', 'glitch'];
const SET_OPS: readonly SetOp[] = ['=', '+', '-', '+=', '-='];

function validSide(x: string | undefined): CharSide | undefined {
  return x === 'left' || x === 'center' || x === 'right' ? x : undefined;
}

function num(x: string | undefined): number | undefined {
  if (x === undefined) return undefined;
  const n = parseFloat(x);
  return Number.isNaN(n) ? undefined : n;
}

export function parse(src: string): ParsedStory {
  const order: string[] = [];
  const labels: Record<string, StoryNode[]> = {};
  const warnings: ParseWarning[] = [];
  let current: string | null = null;
  /** The choice group currently being accumulated (consecutive `>` lines). */
  let pendingChoice: ChoiceNode | null = null;

  const warn = (line: number, message: string): void => {
    warnings.push({ line, message });
  };

  const ensureLabel = (name: string): string => {
    if (!labels[name]) {
      labels[name] = [];
      order.push(name);
    }
    current = name;
    return name;
  };

  const push = (node: StoryNode): void => {
    const lbl = current ?? ensureLabel('start');
    labels[lbl].push(node);
  };

  for (const tk of lex(src)) {
    switch (tk.kind) {
      case 'label': {
        pendingChoice = null;
        const name = tk.raw.slice(2).trim().split(/\s+/)[0];
        if (!name) {
          warn(tk.line, 'Label with no name');
          break;
        }
        ensureLabel(name);
        break;
      }

      case 'say': {
        pendingChoice = null;
        const { text, guard } = extractGuard(tk.raw);
        let speaker: string | null = null;
        let body = text;
        if (body.startsWith('|')) {
          body = body.slice(1).trim();
        } else {
          const m = body.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
          if (m) {
            speaker = m[1];
            body = m[2].trim();
          }
        }
        const node: SayNode = { kind: 'say', speaker, text: body };
        if (guard) node.guard = guard;
        push(node);
        break;
      }

      case 'jump': {
        pendingChoice = null;
        const { text, guard } = extractGuard(tk.raw.slice(2).trim());
        const target = text.trim().split(/\s+/)[0];
        if (!target) {
          warn(tk.line, 'Jump with no target');
          break;
        }
        const node: JumpNode = { kind: 'jump', target };
        if (guard) node.guard = guard;
        push(node);
        break;
      }

      case 'choice': {
        let kind: ChoiceKind;
        let rest: string;
        if (tk.raw.startsWith('>!')) {
          kind = 'offscript';
          rest = tk.raw.slice(2);
        } else if (tk.raw.startsWith('>?')) {
          kind = 'neutral';
          rest = tk.raw.slice(2);
        } else {
          kind = 'suggested';
          rest = tk.raw.slice(1);
        }
        const { text, guard } = extractGuard(rest.trim());
        let choiceText: string | undefined;
        let target: string | undefined;
        const quoted = text.match(/^"([^"]*)"\s*->\s*(.+)$/);
        if (quoted) {
          choiceText = quoted[1];
          target = quoted[2].trim().split(/\s+/)[0];
        } else {
          const bare = text.match(/^(.+?)\s*->\s*(.+)$/);
          if (bare) {
            choiceText = bare[1].trim().replace(/^"|"$/g, '');
            target = bare[2].trim().split(/\s+/)[0];
          }
        }
        if (choiceText === undefined || !target) {
          warn(tk.line, `Malformed choice line: ${tk.raw}`);
          pendingChoice = null;
          break;
        }
        const opt: ChoiceOption = { text: choiceText, target, kind };
        if (guard) opt.guard = guard;
        if (pendingChoice) {
          pendingChoice.options.push(opt);
        } else {
          pendingChoice = { kind: 'choice', options: [opt] };
          push(pendingChoice);
        }
        break;
      }

      case 'directive': {
        pendingChoice = null;
        const node = parseDirective(tk.line, tk.raw, warn);
        if (node) push(node);
        break;
      }
    }
  }

  const entry = order[0] ?? '';
  return { order, labels, warnings, entry };
}

function parseDirective(
  line: number,
  raw: string,
  warn: (line: number, message: string) => void,
): StoryNode | null {
  const head = raw.match(/^@([A-Za-z][A-Za-z-]*)\s*(.*)$/);
  if (!head) {
    warn(line, `Malformed directive: ${raw}`);
    return null;
  }
  const name = head[1].toLowerCase();
  const argStr = head[2].trim();
  const tokens = splitTokens(argStr);
  const { positional, kv } = parseArgs(tokens);

  switch (name) {
    case 'bg': {
      const id = positional[0];
      if (!id) {
        warn(line, '@bg missing background id');
        return null;
      }
      const node: BgNode = { kind: 'bg', id };
      if (kv.mood) node.mood = kv.mood;
      if (kv.transition) node.transition = kv.transition;
      return node;
    }

    case 'enter': {
      const char = positional[0];
      if (!char) {
        warn(line, '@enter missing character');
        return null;
      }
      const node: EnterNode = { kind: 'enter', char };
      const from = validSide(kv.from);
      if (from) node.from = from;
      const pose = kv.pose ?? positional[1];
      if (pose) node.pose = pose;
      return node;
    }

    case 'exit': {
      const char = positional[0];
      if (!char) {
        warn(line, '@exit missing character');
        return null;
      }
      const node: ExitNode = { kind: 'exit', char };
      const to = validSide(kv.to ?? positional[1]);
      if (to) node.to = to;
      return node;
    }

    case 'pose': {
      const char = positional[0];
      const pose = positional[1] ?? kv.pose;
      if (!char || !pose) {
        warn(line, '@pose needs a character and a pose');
        return null;
      }
      return { kind: 'pose', char, pose };
    }

    case 'move': {
      const char = positional[0];
      const to = validSide(kv.to ?? positional[1]);
      if (!char || !to) {
        warn(line, '@move needs a character and a valid side');
        return null;
      }
      return { kind: 'move', char, to } satisfies MoveNode;
    }

    case 'weather': {
      const w = positional[0] as WeatherKind;
      if (!WEATHER_KINDS.includes(w)) {
        warn(line, `@weather unknown kind: ${positional[0] ?? ''}`);
        return null;
      }
      const node: WeatherNode = { kind: 'weather', weather: w };
      const intensity = num(kv.intensity ?? positional[1]);
      if (intensity !== undefined) node.intensity = intensity;
      return node;
    }

    case 'camera': {
      const mv = positional[0] as CameraMove;
      if (!CAMERA_MOVES.includes(mv)) {
        warn(line, `@camera unknown move: ${positional[0] ?? ''}`);
        return null;
      }
      const node: CameraNode = { kind: 'camera', move: mv };
      const zoom = num(kv.zoom);
      if (zoom !== undefined) node.zoom = zoom;
      const duration = num(kv.duration);
      if (duration !== undefined) node.duration = duration;
      return node;
    }

    case 'music': {
      const first = positional[0];
      if (!first) {
        warn(line, '@music missing id (or "stop")');
        return null;
      }
      const id = first === 'stop' || first === 'none' ? null : first;
      const node: MusicNode = { kind: 'music', id };
      const fade = num(kv.fade ?? positional[1]);
      if (fade !== undefined) node.fade = fade;
      return node;
    }

    case 'sfx': {
      const id = positional[0];
      if (!id) {
        warn(line, '@sfx missing id');
        return null;
      }
      return { kind: 'sfx', id };
    }

    case 'ambience': {
      const first = positional[0];
      if (!first) {
        warn(line, '@ambience missing id (or "stop")');
        return null;
      }
      const id = first === 'stop' || first === 'none' ? null : first;
      const node: AmbienceNode = { kind: 'ambience', id };
      const fade = num(kv.fade ?? positional[1]);
      if (fade !== undefined) node.fade = fade;
      return node;
    }

    case 'wait': {
      const seconds = num(positional[0] ?? kv.seconds);
      if (seconds === undefined) {
        warn(line, '@wait needs a number of seconds');
        return null;
      }
      return { kind: 'wait', seconds };
    }

    case 'fx': {
      const effect = positional[0] as FxKind;
      if (!FX_KINDS.includes(effect)) {
        warn(line, `@fx unknown effect: ${positional[0] ?? ''}`);
        return null;
      }
      const node: FxNode = { kind: 'fx', effect };
      const params: Record<string, number> = {};
      for (const [k, v] of Object.entries(kv)) {
        const n = num(v);
        if (n !== undefined) params[k] = n;
      }
      if (Object.keys(params).length > 0) node.params = params;
      return node;
    }

    case 'set': {
      const m = argStr.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(\+=|-=|=|\+|-)\s*(.+?)\s*$/);
      if (!m) {
        warn(line, `@set malformed: ${raw}`);
        return null;
      }
      const target = m[1];
      const op = m[2] as SetOp;
      if (!SET_OPS.includes(op)) {
        warn(line, `@set unknown operator: ${op}`);
        return null;
      }
      const vraw = m[3].trim();
      let value: number | boolean;
      if (vraw === 'true') value = true;
      else if (vraw === 'false') value = false;
      else {
        const n = Number(vraw);
        if (Number.isNaN(n)) {
          warn(line, `@set non-numeric value: ${vraw}`);
          return null;
        }
        value = n;
      }
      return { kind: 'set', target, op, value } satisfies SetNode;
    }

    case 'chapter': {
      const title = tokens[0];
      if (title === undefined) {
        warn(line, '@chapter needs a title');
        return null;
      }
      const node: ChapterNode = { kind: 'chapter', title };
      if (tokens[1] !== undefined) node.subtitle = tokens[1];
      return node;
    }

    default:
      warn(line, `Unknown directive: @${name}`);
      return null;
  }
}
