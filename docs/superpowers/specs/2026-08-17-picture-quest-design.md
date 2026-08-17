# Picture Quest — Design Spec

**Date:** 2026-08-17
**Status:** Approved for autonomous build (user directive: "utterly perfect, AAA, don't stop until perfect, ultracode, fan out sub-agents").

## 1. Vision

A **story-driven narrative quest engine** in the spirit of Zachtronics' *Eliza* — a cinematic visual novel where the player is a human **"Lantern"** who voices an AI companion service, choosing between the AI's *suggested* lines and going *off-script*. Built in **Three.js** so backgrounds get real parallax, depth-of-field, bloom, weather, film grain, and shader transitions — pushing a normally-2D genre to AAA cinematic quality.

**Two deliverables, equally important:**
1. A gorgeous, AAA-polished **flagship story** ("Lumen") that shows the engine off.
2. An engine where **adding a new story is trivial**: drop a folder in `stories/`, write a readable `.pq` script, list asset prompts, run one command to generate art. Auto-discovered, no code changes.

This is an **original work in the same genre** as Eliza — it borrows the *proxy/suggested-line mechanic* and Pacific-Northwest melancholy mood, not Eliza's plot, characters, or art. No copyrighted assets are reproduced.

## 2. Success criteria

- Runs via `npm run dev`; builds via `npm run build` with zero TS errors.
- A blind harsh critic (Fable 5), shown our screen vs a real Eliza screenshot **unlabeled**, prefers ours (or calls it a genuine tie at AAA level) for every key screen: Title, Dialogue, Choice/Proxy moment, Chapter card, Backlog/History, Save/Load, Settings.
- Adding a second story requires **only** new files under `stories/<id>/` — proven by the `_template` + `new-story` tool.
- 60fps on the dev machine (RTX 3070 Ti) at 1080p.

## 3. Architecture

Vite + TypeScript. Three layers, cleanly separated so they can be built in parallel and tested independently.

```
┌─────────────────────────────────────────────┐
│ UI layer (DOM overlay, crisp text/typography)│  src/ui + src/styles
│  Title · Dialogue · Proxy panel · Choices    │
│  Backlog · Save/Load · Settings · Chapter card│
├─────────────────────────────────────────────┤
│ Stage layer (Three.js WebGL, cinematic)      │  src/stage
│  parallax layers · characters · weather ·    │
│  camera(Ken Burns) · transitions · postFX    │
├─────────────────────────────────────────────┤
│ Engine layer (story runtime, headless)       │  src/engine
│  lexer → parser → AST → runtime state machine│
│  variables · flags · save/load · registry    │
└─────────────────────────────────────────────┘
        ▲ shared contracts: src/core/types.ts, events.ts
```

**Data flow:** `runtime` walks the AST and emits high-level **directives** on an event bus (`show bg`, `enter character`, `set weather`, `camera push`, `play music`, `say`, `offer choices`, `chapter`). The **Stage** subscribes to visual directives; the **UI** subscribes to narrative directives (`say`, `offer choices`, `chapter`). UI sends `advance` / `choose(id)` back to the runtime. The runtime never imports Three or DOM — it's pure and unit-testable.

### Module ownership (parallel-safe, no shared files)
| Lane | Owns | Depends on |
|---|---|---|
| **core** (architect) | `src/core/types.ts`, `src/core/events.ts` | — |
| **ENGINE** | `src/engine/*` | core |
| **STAGE** | `src/stage/*`, `src/stage/shaders/*` | core |
| **UI** | `src/ui/*`, `src/styles/*` | core |
| **AUDIO+TOOLS** | `src/audio/*`, `tools/*` | core |
| **STORY** (writer) | `stories/lumen/story.pq`, `stories/lumen/manifest.json`, `stories/_template/*` | core (manifest schema) |
| **integration** | `src/main.ts`, `index.html` wiring | all |

## 4. PQScript (the authoring DSL)

Line-based, readable, Ren'Py/Ink-flavored. One statement per line. See `docs/AUTHORING.md` for the full guide. Grammar:

```
# comment
:: label                      knot/scene label (jump target)

@bg  <id> [mood:<m>]          set background (from manifest.backgrounds)
@enter <char> [from:left|right|center] [pose:<p>]   bring character in
@exit  <char> [to:left|right]
@pose  <char> <pose>          swap expression
@move  <char> to:left|center|right
@weather <none|rain|snow|dust|fog> [intensity:0..1]
@camera <push|pull|pan-left|pan-right|still> [zoom:<f>] [duration:<s>]
@music <id> [fade:<s>] | @music stop [fade:<s>]
@sfx   <id>
@ambience <id> [fade:<s>]
@wait  <s>
@fx    <flash|shake|dissolve|glitch> [ ...params ]
@set   <var> <=|+|-|+=|-=> <value>     mutate state
@chapter "<Title>" ["<Subtitle>"]      full-screen chapter card

speaker: line of dialogue                 spoken line (speaker key from manifest)
| narration line with no speaker.         narration (leading pipe optional; bare line also works)
speaker: line {var:trust>=3}              conditional line (only shown if guard true)

> "Suggested reply text" -> target        AI-SUGGESTED response (styled as Lumen's prompt)
> "Suggested reply" -> target {trust>=2}  conditional suggestion
>! "Off-script reply" -> target           OFF-SCRIPT choice (styled as player's own words)
>? "Choice text" -> target                neutral player choice (for non-proxy stories)

-> label                       unconditional jump
-> label {var:awake==true}     conditional jump (first matching guard wins)
-> END                         end the story (roll credits)
```

Guards: `{trust>=3}`, `{seen_building}`, `{coherence<2 && trust>=4}`. Vars are numbers or booleans, default 0/false. `@set trust += 1`, `@set awake = true`.

**Design intent:** the `>` vs `>!` distinction *is* the Eliza mechanic. `>` lines are what the AI feeds you (safe, on-brand, keeps "coherence" up). `>!` lines are you breaking script (risk coherence, but can raise real "trust"). Stories vary `@set` rules to make this matter.

Parser is tolerant: unknown `@directive` → warn + skip (forward-compat). Blank lines ignored. Everything after `#` on a line is a comment.

## 5. Manifest schema (`stories/<id>/manifest.json`)

```jsonc
{
  "id": "lumen",
  "title": "Lumen",
  "subtitle": "A long night, in someone else's words",
  "author": "Picture Quest",
  "synopsis": "One night as a Lantern...",
  "entry": "prologue",                         // starting label
  "credits": ["Written by ...", "..."],
  "theme": {                                    // drives design tokens + color grade
    "key": "#7db4c8", "accent": "#e0a46b",
    "ink": "#e8eef2", "paper": "#0d1418",
    "grade": { "lift": [..], "gamma": [..], "gain": [..] }  // optional LUT-ish grade
  },
  "characters": {
    "noor": { "name": "Noor", "color": "#e0a46b",
      "poses": { "neutral": {...}, "tired":{...}, "tearful":{...}, "faint-smile":{...} } }
  },
  "backgrounds": {
    "ops_room": { "prompt": "...", "layers": ["far","mid","near"], "parallax": 0.04 }
  },
  "cg": { "title_key": { "prompt": "..." } },
  "music":  { "night_theme": { "file": "night_theme.mp3", "loop": true } },
  "sfx":    { "chime": { "file": "chime.wav" } },
  "ambience": { "room_hum": { "file":"room_hum.mp3", "loop": true } }
}
```

Asset **prompts** live here; `tools/gen-assets.mjs` reads them and drives Codex to produce PNGs into `stories/<id>/assets/{backgrounds,characters,cg}/`. Audio may be procedurally synthesized (WebAudio) if no files present, so the slice is playable with zero binary audio deps.

## 6. Stage (Three.js) — the AAA differentiator

- **Layered parallax:** each background is 1–3 planes at different Z; camera micro-moves (Ken Burns dolly/pan via gsap) create depth. Characters are alpha planes between mid and near layers.
- **Post-processing** (three `EffectComposer`): RenderPass → UnrealBloom (soft glow on lights) → Bokeh DoF (focus speaker) → custom **ColorGrade** shader (per-story lift/gamma/gain + subtle teal-orange) → **Vignette** → **FilmGrain**/noise → SMAA → Output. All tunable per story theme + global settings (grain toggle, motion toggle for accessibility).
- **Weather:** GPU-friendly particle systems — rain (streaked instanced quads + windshield droplets shader on a near plane), snow, dust motes, volumetric fog plane. Intensity animatable.
- **Transitions:** shader dissolves between backgrounds (noise-threshold wipe), cross-fade, iris, and a signature "light-bleed" fade for chapter breaks.
- **Character animation:** ease-in from side with slight overshoot, idle breathing (subtle scale/Y sine), speaker gets a gentle brighten + others dim/desaturate.
- Respects `prefers-reduced-motion` and a Settings toggle (cuts camera drift, shake, heavy grain).

## 7. UI — crisp DOM over canvas

DOM overlay (pointer-events managed) for pixel-crisp text. Design tokens in `styles/tokens.css` fed by manifest theme. Components:
- **DialogueBox**: speaker nameplate (colored per character), typewriter reveal (skippable), auto/continue indicator, click/space/enter to advance.
- **ProxyPanel** (signature): translucent "Lumen" panel that surfaces `>` suggested lines with a soft scanline/glow; `>!` off-script rendered distinctly (handwritten-feel, warmer). Selecting animates the chosen line up into the dialogue box.
- **ChoiceMenu**: for `>?` neutral choices.
- **Backlog**: scrollable history of everything said (Eliza has this).
- **TitleScreen**: cinematic — animated Three background behind the menu, story picker listing all discovered stories with cover art, New/Continue/Settings/Gallery.
- **SaveLoad**: slots with auto-thumbnail (canvas capture) + timestamp + current line.
- **Settings**: text speed, master/music/sfx volume, grain, motion, fullscreen, language-ready.
- **ChapterCard**: full-bleed typographic interstitial with the light-bleed transition.

Typography: vendored OFL fonts — an expressive serif (titles/narration) + humanist sans (UI). No external font CDNs.

## 8. State, save/load, registry

- `GameState`: `{ storyId, label, cursor, vars, flags, history[], seen[] }`. Pure, serializable.
- Save slots in `localStorage` (`pq.save.<slot>`), plus rolling autosave. Settings in `pq.settings`.
- **Registry:** `import.meta.glob('/stories/*/manifest.json', {eager:true})` + `('/stories/*/story.pq', {as:'raw'})` → auto-discovery. Title screen lists every story found. Zero-config add.

## 9. Tooling

- `tools/new-story.mjs <id> "Title"` — copies `_template/`, fills id/title.
- `tools/gen-assets.mjs <id> [--only backgrounds|characters|cg]` — reads manifest prompts, calls Codex per asset (`codex exec --ephemeral -s workspace-write`), copies PNGs into place, applies a shared **style preamble** so art is cohesive; skips assets that already exist unless `--force`.
- `tools/build-check.mjs` — `tsc --noEmit` + `vite build`, used by CI/critic loop.

## 10. Critic loop (Phase 3)

For each key screen: run dev server → screenshot → Fable critic does **blind A/B** vs a real Eliza reference (Steam screenshots), scoring composition, color, typography, hierarchy, "does this feel like a shipped AAA game." If ours doesn't clearly win, critic returns concrete fixes → Opus applies → re-shoot → repeat (max N rounds, then escalate to fable-advisor). Harsh rubric in `docs/CRITIC_RUBRIC.md`.

## 11. Model routing (cost + rate-limit rule)

- **Fable 5** = orchestrator + visual critic/judge only.
- **Opus 5** = all code implementers.
- **Codex (GPT-5.6)** = all image generation; also a cross-vendor reviewer/typecheck-fixer for the integrated build.

## 12. Out of scope (v1)

Voice acting, localization content (structure is ready), mobile touch tuning beyond basics, in-browser story editor. YAGNI.
