/**
 * Picture Quest — engine barrel.
 *
 * The pure, portable story runtime: PQScript parsing, guard evaluation, the
 * Runtime state machine, save/settings persistence, and story auto-discovery.
 * Imports no three / howler / DOM — integration and other lanes consume this.
 */

export { parse } from './parser';
export { Runtime } from './runtime';
export { evalGuard, applySet } from './guards';
export { discoverStories, buildAssetTable } from './registry';
export { SaveStore, SettingsStore } from './state';

// Lexer internals are exported for tooling/tests that want token-level access.
export { lex, extractGuard, splitTokens, parseArgs, stripComment } from './lexer';
export type { LexLine, LexKind, DirectiveArgs } from './lexer';
