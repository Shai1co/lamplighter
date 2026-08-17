# Lamplighter — Harsh Critic Rubric (blind A/B vs *Eliza*)

The critic is a **hostile art director** who ships AAA titles. Default stance: **our screen loses** until it earns otherwise. The critic is shown two unlabeled 1920×1080 frames — **A** and **B** — one ours, one a real *Eliza* screenshot, in randomized order, and must (1) score each, (2) say which is the more expensive-looking, shipped, professional game, and (3) if ours doesn't clearly win or genuinely tie at the top, list concrete, actionable fixes.

## What *Eliza* actually does (the bar)

Grounded in the reference set (`scratchpad/eliza_refs/eliza_0..6.jpg`):

1. **Painterly, semi-realistic art** — characters and environments are hand-painted, naturalistic light, real rooms with real props (framed art, plants, warm practical lamps). Never flat vector, never generic anime cel, never obvious AI-slop symmetry or mush.
2. **Ruthless restraint & filmic color** — warm-neutral or moody palettes, low saturation, soft contrast, gentle vignetting, a cohesive grade across the whole frame. Nothing is loud.
3. **The dialogue bar** — CAPS speaker name at far left in a humanist sans/serif; body in a **transitional/old-style serif** with generous leading; a small **▼** continue glyph; the text sits over a **soft bottom-fade gradient**, not a hard opaque box.
4. **Diegetic "glass" UI** — the proxy panel is translucent, hairline-thin strokes, soft glow, real-looking data (Name/Phase, Heart Rate, Respiration, Vocal Distress waveform, EPR/Affect/Emotion/Receptivity, "Proxy Response" tiles). It reads as a **product embedded in the world**, not an HTML overlay.
5. **Minimal chrome** — essentially just a hamburger top-right. No clutter.
6. **Cinematic range** — from intimate seated portraits to vast, dark, atmospheric wide shots (keynote stage with volumetric spotlights, crowd silhouettes, deep blacks).

## Scoring (each frame, 0–10 per axis; be stingy)

| Axis | What earns a high score |
|---|---|
| **Composition & depth** | Deliberate framing, real depth/parallax, focal clarity, cinematic negative space. |
| **Color & light** | Cohesive filmic grade, motivated light, mood, no muddy or garish areas. |
| **Typography** | Professional type choices, scale, tracking, leading; nothing default-browser. |
| **UI craft** | Diegetic, restrained, hairline precision, soft glow, perfect alignment & spacing. |
| **Art quality** | Painterly conviction; no AI artifacts (melted hands, nonsense text, warped symmetry), no banding. |
| **Atmosphere** | Weather, grain, bloom, DoF, vignette used with restraint to sell a *place*. |
| **"Shipped AAA" gestalt** | Would this pass on the front page of Steam as a premium narrative game? |

## Verdict format the critic returns

```
A_scores: {composition, color, typography, ui, art, atmosphere, gestalt, total}
B_scores: {...}
which_is_ours: "A" | "B" | "unsure"        # critic guesses; if it can't tell ours from Eliza, that's a win signal
better_looking: "A" | "B" | "tie-at-top"
ours_wins: true | false                     # true only if ours is clearly >= Eliza at AAA level
confidence: 0..1
fixes: [ concrete, specific, implementable art/UI/code changes, most impactful first ]
one_line: "brutal one-sentence summary"
```

## Hard fails (auto-lose regardless of other scores)
- Any visible AI artifact (garbled text in-image, deformed hands/faces, impossible geometry, seams).
- Default-looking HTML (system fonts, un-tuned buttons, harsh pure-black/white boxes, default focus rings).
- Banding in gradients, aliasing on edges, or a flat/undesigned background where atmosphere is expected.
- Typography crimes: cramped leading, wrong quotes, orphaned continue glyphs, mismatched scale.
- Palette incoherence (an element not part of the grade), or garish saturation.

## Our unfair advantage (use it)
Eliza's references are **static**. Ours is a live Three.js stage — bake the motion advantages into every captured frame: real parallax depth, volumetric-ish light, rain-on-glass, dust motes, DoF separating the speaker, bloom on practicals, film grain, and a per-story color grade. A still from our engine should already look at least as composed and *more* atmospheric than a still from Eliza.

## Reference → screen-category map (for blind pairing)
- Dialogue / portrait + proxy panel → `eliza_0.jpg` (and similar).
- Wide cinematic environment → `eliza_3.jpg`.
- Others (`eliza_1,2,4,5,6`) → additional dialogue/environment variety; pick the closest analog to the screen under test.
