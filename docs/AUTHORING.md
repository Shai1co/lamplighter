# Writing a Story for Picture Quest

This is the complete guide to adding a story. You do **not** need to write any
code. A story is one folder with two files you edit by hand — a **script**
(`story.pq`) and a **manifest** (`manifest.json`) — plus generated art. Drop the
folder in `stories/`, and it appears on the title screen automatically. No engine
changes, ever.

If you can write a screenplay and fill in a form, you can make a Picture Quest.

---

## 1. The one-folder workflow

```
stories/
  your-story/
    story.pq            ← the script: scenes, dialogue, choices
    manifest.json       ← the "cast & crew": colors, characters, asset prompts
    assets/
      backgrounds/      ← <bgId>.png            (generated)
      characters/
        <char>/<pose>.png                       (generated)
      cg/               ← <key>.png             (generated)
      audio/            ← optional real sound files
```

Two commands do everything:

```bash
# 1) Scaffold a new story from the template
npm run new-story your-story "Your Story Title"

# 2) Generate all the art from the prompts in your manifest
npm run gen-assets your-story
```

Then `npm run dev` and pick your story from the title screen.

**Audio needs zero files.** Every sound can be a tasteful procedural synth
(described in §6). Add real audio only if and when you want to.

**Art is optional to *run*.** Missing textures fall back to procedural
placeholders built from your theme colors, so the story is playable and looks
deliberate the moment you save the files — generate art when you're ready.

---

## 2. `story.pq` — the script language (PQScript)

PQScript is line-based and readable, one statement per line. Anything after `#`
is a comment. Blank lines are ignored. The parser is forgiving: an unknown
`@directive` is skipped with a warning, so a typo never crashes your story.

### 2.1 Labels and flow

A **label** marks a scene or a jump target.

```
:: start                # define the label "start"
...
-> next_scene           # jump unconditionally
-> END                  # end the story and roll credits
```

`-> label` jumps. `-> END` finishes. The story begins at the label named by
`entry` in the manifest (falling back to the first label in the file).

Conditional jumps use a **guard** (see §2.6). The first matching one wins:

```
-> awake_path   {awake==true}
-> tired_path   {trust>=3}
-> default_path
```

### 2.2 Dialogue and narration

```
noor: I didn't think you'd still be awake.     # spoken by character "noor"
| The rain hasn't stopped in hours.            # narration (leading pipe)
The rain hasn't stopped in hours.              # narration (bare line also works)
noor: Only if you want to. {trust>=2}          # conditional line (shown if guard true)
```

- `speaker: text` — the `speaker` is a character **key** from the manifest.
- A line with no `speaker:` is narration. A leading `|` makes that explicit
  (useful if your narration line itself contains a colon).
- Append `{guard}` to show a line only when the guard is true.

### 2.3 The signature mechanic — suggested vs off-script

This is the heart of Picture Quest. When the player must respond, you offer
choices. There are three kinds:

```
> "Tell me what happened." -> ask               # AI-SUGGESTED  (safe, on-script)
>! "You can stop pretending now." -> confront    # OFF-SCRIPT    (the player's own words)
>? "Turn left" -> left                            # NEUTRAL       (plain choice)
```

- `>`  — a line the AI **suggests**. Rendered in the glowing proxy panel.
  Choosing it keeps you "on script."
- `>!` — going **off-script**, in the player's own voice. Rendered warmer /
  handwritten. This is where the real risk and reward live.
- `>?` — a **neutral** choice, for stories that don't use the proxy conceit.

Mix them freely. A single choice block can contain any combination:

```
noor: Should I tell them the truth?
> "Tell them what they need to hear." -> comfort
> "Tell them the truth, gently." -> truth {trust>=2}
>! "Don't tell them anything. Just listen." -> listen
```

Each option may carry a guard; options whose guard is false are hidden.

### 2.4 Staging directives (the visuals)

```
@bg  <id> [mood:<m>]                     set the background (from manifest.backgrounds)
@enter <char> [from:left|right|center] [pose:<p>]    bring a character on
@exit  <char> [to:left|right|center]     send a character off
@pose  <char> <pose>                      swap a character's expression
@move  <char> to:left|center|right        slide a character to a new spot
@weather <none|rain|snow|dust|fog> [intensity:0..1]
@camera <push|pull|pan-left|pan-right|still> [zoom:<f>] [duration:<s>]
@fx    <flash|shake|dissolve|glitch> [key:value ...]
@chapter "<Title>" ["<Subtitle>"]         full-screen chapter card
@wait  <seconds>                          hold a beat
```

Example:

```
:: prologue
@chapter "Lumen" "A long night, in someone else's words"
@bg ops_room mood:night
@weather rain intensity:0.6
@camera push zoom:1.05 duration:8
@enter noor from:left pose:tired
noor: You're new to this, aren't you.
```

### 2.5 Audio directives

```
@music <id> [fade:<s>]        crossfade to a music track (from manifest.music)
@music stop [fade:<s>]        fade music out
@ambience <id> [fade:<s>]     start/replace a looping ambient bed
@ambience stop [fade:<s>]     fade ambience out
@sfx <id>                     play a one-shot sound effect
```

`fade` is in seconds. `@music stop` and `@ambience stop` map to "fade out." All
ids refer to entries in the manifest's `music`, `ambience`, and `sfx` maps.

### 2.6 State — variables and guards

Variables are **numbers or booleans**. Undeclared vars default to `0` / `false`.
Declare defaults in the manifest's `vars` block if you like.

```
@set trust += 1          # add 1
@set coherence -= 1      # subtract 1
@set trust = 4           # assign
@set awake = true        # boolean
```

Operators: `=` (assign), `+`, `-`, `+=`, `-=`.

A **guard** is a condition in `{ }`. Use it on lines, choices, and jumps:

```
{trust>=3}
{seen_building}                 # truthy check (non-zero / true)
{coherence<2 && trust>=4}       # combine with && and ||
{awake==true}
```

Comparisons: `==` `!=` `<` `<=` `>` `>=`. Combine with `&&` and `||`.

> **The design intent:** `>` (suggested) lines are safe and keep "coherence"
> high; `>!` (off-script) lines risk coherence but can build real "trust." Use
> `@set` after each choice to make that tension matter — that *is* the game.

---

## 3. `manifest.json` — the schema

The manifest declares your story's identity, colors, characters, and every asset
prompt. Below is a filled, minimal-but-complete example. Every field is
explained in §4.

```jsonc
{
  "id": "harbor",
  "title": "Harbor Lights",
  "subtitle": "One shift on the night desk",
  "author": "Your Name",
  "synopsis": "A single night answering calls that aren't really about the calls.",
  "entry": "start",
  "cover": "title_key",
  "credits": ["Written by Your Name", "Made with Picture Quest"],

  "artStyle": "Painterly cinematic still, muted harbor palette of slate blue and sodium amber, soft volumetric fog, filmic grain, shallow depth of field, consistent character identity; no text, no UI, no border, no watermark.",

  "theme": {
    "key": "#7db4c8",          // primary UI accent
    "accent": "#e0a46b",       // warm secondary accent
    "ink": "#e8eef2",          // text color
    "paper": "#0d1418",        // dark panel base
    "grade": {                 // optional cinematic color grade (all optional)
      "lift":  [0.0, 0.0, 0.01],
      "gamma": [1.0, 1.0, 1.0],
      "gain":  [1.0, 1.0, 0.98],
      "splitTone": 0.25,       // teal↔orange split, 0..1
      "contrast": 1.05,        // ~0.9..1.2
      "saturation": 0.95       // ~0.7..1.2
    },
    "bloom": 0.6,              // 0..2  glow strength
    "vignette": 0.35,          // 0..1
    "grain": 0.5               // 0..1
  },

  "characters": {
    "noor": {
      "name": "Noor",                 // shown on the nameplate
      "color": "#e0a46b",             // nameplate accent
      "description": "A woman in her 30s, dark curly hair, a grey wool coat, tired warm eyes; soft lamp light. Keep wardrobe and lighting identical across poses.",
      "defaultPose": "neutral",       // used by @enter with no pose
      "home": "center",               // default entry side
      "scale": 1.0,
      "poses": {
        "neutral": { "prompt": "Portrait of Noor (restate the description), calm, facing slightly off-camera. Chest-up, painterly, shallow depth of field." },
        "tired":   { "prompt": "Portrait of Noor (restate the description), weary, eyes lowered, same wardrobe and light." },
        "faint-smile": { "prompt": "Portrait of Noor (restate the description), the smallest warm smile, same identity." }
      }
    }
  },

  "backgrounds": {
    "ops_room": {
      "prompt": "A small night-shift operations room, one desk lamp, monitors off, rain on the window. Landscape, no people.",
      "parallax": 0.04,               // 0..0.2 depth separation
      "focus": 0.5                    // 0..1 focal depth for depth-of-field
    }
  },

  "cg": {
    "title_key": { "prompt": "Moody establishing key art of a rain-lit harbor at night, space at the top for a title. No people, no text." }
  },

  "music":    { "night_theme": { "synth": "pad",  "loop": true, "volume": 0.7 } },
  "ambience": { "room_tone":   { "synth": "hum",  "loop": true, "volume": 0.5 },
                "rain":        { "synth": "rain", "loop": true, "volume": 0.5 } },
  "sfx":      { "chime": { "synth": "chime", "volume": 0.8 },
                "click": { "synth": "click", "volume": 0.7 } },

  "vars": { "trust": 0, "coherence": 3 }
}
```

---

## 4. Field reference

| Field | Required | Notes |
|---|---|---|
| `id` | ✓ | Folder name; lowercase letters/numbers/`-`/`_`. Set for you by `new-story`. |
| `title` | ✓ | Display title. |
| `subtitle`, `author`, `synopsis` | | Shown on the title / story picker. |
| `entry` | | Starting label. Falls back to the script's first label. |
| `cover` | | A key in `cg` used as cover art on the picker. |
| `credits` | | Lines rolled at `-> END`. |
| `artStyle` | | **Prepended to every asset prompt** for cohesion. Write one strong sentence describing palette, light, rendering, framing, and always end with "no text, no UI, no border, no watermark." |
| `theme.key/accent/ink/paper` | ✓ | Core colors; feed UI tokens and procedural placeholders. |
| `theme.grade` | | Cinematic color grade (`lift`/`gamma`/`gain` per-channel, `splitTone`, `contrast`, `saturation`). All optional. |
| `theme.bloom/vignette/grain` | | Per-story post-processing overrides. |
| `characters.<key>` | | `name`, `color`, `description`, `poses`, plus `defaultPose`, `home`, `scale`. The `key` is what you type as `speaker:` and in `@enter`. |
| `characters.<key>.poses.<pose>.prompt` | | Generation prompt for that expression. `file` overrides the output filename. |
| `backgrounds.<id>` | | `prompt`, plus `parallax` (0..0.2), `focus` (0..1). For a multi-plane parallax scene, add `"layers": ["far","near"]` (see §5). |
| `cg.<key>.prompt` | | Key art / CG stills. |
| `music` / `ambience` / `sfx` | | Each entry has `file` **or** `synth`, plus `loop` and `volume` (0..1). See §6. |
| `vars` | | Default values for your script variables. |

---

## 5. Asset prompt conventions & file layout

`gen-assets` composes each final prompt as:

```
<artStyle>  |  <scene/character context>  |  <your entry prompt>  |  <aspect ratio>  |  <save instruction>
```

You only write the middle part (the entry `prompt`). The tool adds cohesion,
framing, aspect ratio, and the exact "save as this filename" instruction.

**Output paths** (created automatically):

| Asset | Manifest location | Output file |
|---|---|---|
| Background (single) | `backgrounds.<id>.prompt` | `assets/backgrounds/<id>.png` |
| Background (layered) | `backgrounds.<id>` with `"layers": [...]` | `assets/backgrounds/<id>.0.png`, `<id>.1.png`, … (far → near) |
| Character pose | `characters.<char>.poses.<pose>.prompt` | `assets/characters/<char>/<pose>.png` |
| CG / cover | `cg.<key>.prompt` | `assets/cg/<key>.png` |

**Layered backgrounds** give you real parallax: the first layer is an **opaque
backplate** (sky/horizon), and each later layer is a **transparent** foreground
plane composited over it. `gen-assets` adds those depth instructions for you.

**Prompt tips**

- Put a person only in **character** prompts. Backgrounds and CG should say
  "no people."
- Restate the character's `description` inside each pose prompt so identity
  stays consistent across expressions.
- Keep wardrobe and lighting constant per character; vary only the expression.
- Always end prompts with "no text, no UI, no border, no watermark."

---

## 6. Audio — procedural first, files optional

Every music/ambience/sfx entry uses **either** a real `file` **or** a `synth`
preset. If you give neither, a sensible default synth is chosen for you
(`music → pad`, `ambience → hum`, `sfx → chime`). Nothing ever fails to play.

```jsonc
"music":    { "theme":  { "synth": "pad",  "loop": true, "volume": 0.7 } },
"ambience": { "rain":   { "synth": "rain", "loop": true, "volume": 0.5 } },
"sfx":      { "chime":  { "synth": "chime", "volume": 0.8 } },
// or a real file:
"music":    { "theme":  { "file": "night_theme.mp3", "loop": true, "volume": 0.7 } }
```

Real files go under `assets/audio/`. Reference them by filename in `file`.

**Procedural synth presets** (all tuned to your theme's key color, kept quiet
and ambient):

| Preset | Character | Good for |
|---|---|---|
| `pad` | Slow evolving detuned chord under a drifting filter | Music beds, main theme |
| `drone` | Darker single low note | Tension, dread |
| `rain` | Filtered noise with a slow swell | Rain ambience |
| `hum` | Low fundamental + faint noise | Room tone |
| `wind` | Swept band-passed noise | Exteriors, cold |
| `chime` | Soft inharmonic bell, quick decay | Notifications, accept |
| `click` | Short soft blip | UI, small confirmations |
| `tone` | Pure sustained sine | Neutral / test |

`volume` (0..1) sets the base level; procedural beds are additionally trimmed so
they stay in the background. `loop` should be `true` for music and ambience.

---

## 7. The two commands, in full

### `new-story`

```bash
npm run new-story <id> "Title"
# e.g.
npm run new-story harbor "Harbor Lights"
```

Copies `stories/_template/` to `stories/<id>/`, creates the `assets/` subfolders,
sets the `id` and `title`, and prints your next steps. It refuses to overwrite an
existing story. (If `_template` is missing, it writes a built-in starter so you
still get a working story.)

### `gen-assets`

```bash
npm run gen-assets <id> [-- --only backgrounds|characters|cg] [--force]
# examples
npm run gen-assets harbor
npm run gen-assets harbor -- --only characters
npm run gen-assets harbor -- --force        # regenerate everything
```

Reads your manifest and generates every background layer, character pose, and CG
that has a `prompt` and doesn't already exist. It runs one image at a time,
verifies each file landed, recovers from the image cache if needed, and prints a
succeeded/failed summary at the end. Re-running only fills in what's missing, so
it's safe to stop and resume. Requires the `codex` CLI on your PATH.

> When invoking through `npm run`, pass tool flags after a `--` separator so npm
> forwards them (as shown above). Calling the script directly does not need it:
> `node tools/gen-assets.mjs harbor --only characters`.

### `build-check`

```bash
npm run check
```

Runs `tsc --noEmit` then `vite build` and prints a PASS/FAIL banner — the quick
"is everything still healthy?" gate after editing.

---

## 8. Quick checklist

1. `npm run new-story my-tale "My Tale"`
2. Write `stories/my-tale/story.pq` (scenes, dialogue, `>`/`>!` choices).
3. Fill prompts in `stories/my-tale/manifest.json` (backgrounds, poses, cg).
4. `npm run gen-assets my-tale`
5. `npm run dev` — your story is on the title screen.
6. `npm run check` before you share it.

That's the whole workflow. Everything else is storytelling.
