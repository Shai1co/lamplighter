/**
 * Lamplighter — persistence (save slots, autosave, settings).
 *
 * All access is guarded by `typeof localStorage !== 'undefined'` and wrapped in
 * try/catch so the engine stays portable and never throws in a headless or
 * privacy-restricted environment. Keys:
 *   pq.save.<slot>   individual save slots
 *   pq.autosave      rolling autosave
 *   pq.settings      user settings
 */

import type { SaveSlotInfo, Settings } from '../core/types';
import { DEFAULT_SETTINGS } from '../core/types';

const SAVE_PREFIX = 'pq.save.';
const AUTO_KEY = 'pq.autosave';
const SETTINGS_KEY = 'pq.settings';

function hasStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

function readJson<T>(key: string): T | null {
  if (!hasStorage()) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!hasStorage()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / serialization errors are non-fatal */
  }
}

function removeKey(key: string): void {
  if (!hasStorage()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* non-fatal */
  }
}

export class SaveStore {
  save(slot: number, info: SaveSlotInfo): void {
    writeJson(SAVE_PREFIX + slot, info);
  }

  load(slot: number): SaveSlotInfo | null {
    return readJson<SaveSlotInfo>(SAVE_PREFIX + slot);
  }

  remove(slot: number): void {
    removeKey(SAVE_PREFIX + slot);
  }

  list(): SaveSlotInfo[] {
    if (!hasStorage()) return [];
    const out: SaveSlotInfo[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(SAVE_PREFIX)) continue;
        const info = readJson<SaveSlotInfo>(key);
        if (info) out.push(info);
      }
    } catch {
      return out;
    }
    out.sort((a, b) => a.slot - b.slot);
    return out;
  }

  autosave(info: SaveSlotInfo): void {
    writeJson(AUTO_KEY, info);
  }

  loadAuto(): SaveSlotInfo | null {
    return readJson<SaveSlotInfo>(AUTO_KEY);
  }

  clearAuto(): void {
    removeKey(AUTO_KEY);
  }
}

export class SettingsStore {
  load(): Settings {
    const base = { ...DEFAULT_SETTINGS };
    const parsed = readJson<Partial<Settings>>(SETTINGS_KEY);
    return mergeSettings(base, parsed);
  }

  save(settings: Settings): void {
    writeJson(SETTINGS_KEY, settings);
  }
}

/** Fill any missing/invalid field from defaults (deep-merge over DEFAULT_SETTINGS). */
function mergeSettings(base: Settings, over: Partial<Settings> | null): Settings {
  if (!over || typeof over !== 'object') return base;
  const o = over as Record<string, unknown>;
  const numOr = (key: string, fallback: number): number =>
    typeof o[key] === 'number' && Number.isFinite(o[key]) ? (o[key] as number) : fallback;
  const boolOr = (key: string, fallback: boolean): boolean =>
    typeof o[key] === 'boolean' ? (o[key] as boolean) : fallback;
  return {
    textSpeed: numOr('textSpeed', base.textSpeed),
    masterVolume: numOr('masterVolume', base.masterVolume),
    musicVolume: numOr('musicVolume', base.musicVolume),
    sfxVolume: numOr('sfxVolume', base.sfxVolume),
    grain: numOr('grain', base.grain),
    reducedMotion: boolOr('reducedMotion', base.reducedMotion),
    cinematic: boolOr('cinematic', base.cinematic),
    fullscreen: boolOr('fullscreen', base.fullscreen),
    autoAdvance: boolOr('autoAdvance', base.autoAdvance),
  };
}
