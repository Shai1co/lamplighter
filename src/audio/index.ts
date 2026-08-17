/**
 * Picture Quest — audio subsystem barrel.
 *
 * `main.ts` constructs the AudioManager with the shared Emitter and treats it
 * purely through the IAudioManager interface. The procedural synth exports are
 * re-published for tests and for any tooling that wants to preview a preset.
 */
export { AudioManager } from './AudioManager';
export {
  createSynthVoice,
  isLoopingPreset,
  type SynthVoice,
  type SynthOptions,
  type SynthPreset,
} from './synth';
