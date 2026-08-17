/**
 * Picture Quest — Stage lane public surface.
 *
 * The cinematic Three.js renderer. `Stage` is the only export integration needs
 * (it implements IStage from core/types); the rest are exposed for reuse and
 * testing. The Stage imports nothing from ui/engine/audio — it talks purely
 * through the shared event bus.
 */
export { Stage } from './Stage';
export { KenBurns } from './camera';
export { Layer } from './Layer';
export type { LayerConfig } from './Layer';
export { Character } from './Character';
export type { CharacterInit } from './Character';
export { Weather } from './weather';
export { Transitions } from './transitions';
export type { TransitionKind } from './transitions';
export { PostFX } from './postfx';
export {
  STAGE_SEED,
  mulberry32,
  hash01,
  FULLSCREEN_VERTEX,
  GRADE_FRAGMENT,
  TRANSITION_FRAGMENT,
} from './shaders';
