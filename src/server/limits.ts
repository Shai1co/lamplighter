/**
 * Lamplighter — the "state that matters" minimums, shared by the validator
 * and the prompt.
 *
 * These are the profile-INDEPENDENT thresholds behind design doc §8.2 rules
 * 20 (`SETS_TOO_FEW`) and 21 (`GUARDS_TOO_FEW`) — unlike `LengthProfile`
 * (prompt.ts), they do not vary with `short`/`standard`/`long`. They used to
 * live only as inline numbers inside `validate.ts`'s two checks; they are
 * lifted out here, into their own leaf module (no imports of its own), so
 * that BOTH `validate.ts` (which enforces them) and `prompt.ts` (which tells
 * the model about them up front, in the per-run SIZE line and in PART 3's
 * "STATE THAT MATTERS" block) read the exact same numbers and can never
 * drift apart — the same single-source-of-truth rationale §7.1 already
 * states for `LENGTH_PROFILES`. See §8.3's 2026-08-18 addendum for the
 * reliability problem that made stating these explicitly, in the prompt,
 * necessary: live gemini-3.7-flash drafts were stochastically missing
 * `GUARDS_TOO_FEW` (and occasionally `MENUS_COUNT`) on attempt 0.
 */

/** Rule 20 `SETS_TOO_FEW`: at least this many `@set` nodes total... */
export const STATE_SETS_MIN = 6;
/** Rule 20 `SETS_TOO_FEW`: ...spread across at least this many distinct var targets. */
export const STATE_SET_VARS_MIN = 2;
/** Rule 21 `GUARDS_TOO_FEW`: at least this many guarded nodes (say / choice option / jump). */
export const STATE_GUARDS_MIN = 3;
