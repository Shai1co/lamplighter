# Lamplighter

A cinematic narrative-quest anthology, rendered in real time with Three.js, in the
spirit of Zachtronics' *Eliza*.

You play a **Lantern**: the human voice of an AI companion service. A panel of soft
light feeds you the perfect thing to say. You can read it, or you can say your own
words instead — trading the machine's coherence for something a stranger might
actually feel. The shipped story, **Lumen**, is one call on one night: an architect
named Noor, the morning after they demolished the only building that was ever
truly hers.

The engine is an anthology host. A story is **one folder** — a script, a manifest,
and generated art — dropped into `stories/`. It appears on the title screen
automatically. No engine changes, ever.

---

## Quickstart

```bash
npm install
npm run dev          # http://127.0.0.1:5173/
```

Other scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | `tsc --noEmit` + production bundle into `dist/` |
| `npm run preview` | Serve the production build on :4173 |
| `npm run check` | The single health gate — typecheck **and** bundle, with a PASS/FAIL banner |
| `npm run new-story <id> "Title"` | Scaffold a story from the template |
| `npm run gen-assets <id>` | Generate the story's art from its manifest prompts |

Requires Node 18+. Only `npm run gen-assets` needs anything beyond the repo (see
[Art pipeline](#art-pipeline)).

Want to *write* a story instead of just playing Lumen? Copy `.env.example` to
`.env.local`, add a `GEMINI_KEY`, run `npm run dev`, and click **Create a
Story** on the title screen — or skip the key entirely and pick **Mock**
under Advanced to try the whole flow offline. See
[Story generation](#story-generation-server-side) below.

---

## Adding a story in three steps

### 1. Scaffold

```bash
npm run new-story harbor "Harbor Lights"
```

Creates `stories/harbor/` with a `story.pq`, a `manifest.json`, and empty asset
folders. The template is deliberately small — two scenes — but demonstrates every
directive and all three choice kinds.

### 2. Write the script and the prompts

Edit two files by hand. No code.

`story.pq` is line-based **PQScript**:

```
:: scene_open
@bg ops_room mood:night
@weather rain intensity:0.6
@enter noor from:right pose:tired
noor: ...Hello? Is there a person there, or is this the recording again.
| The panel offers you a line at once. It's a good line. It is always a good line.
> "You've reached LUMEN. I'm here, and I'm listening."  -> open_script
>! "Not a recording. I'm right here."                   -> open_offscript
-> next_scene {trust>=2}
```

`>` is a **suggested** line (the proxy's), `>!` is **off-script** (your own words),
`>?` is a plain **neutral** branch. Guards in `{ }` gate lines, choices and jumps.

`manifest.json` is the cast and crew: theme colours, the film grade, characters and
their poses, background ids — and an **image prompt for every asset**, which is what
step 3 consumes.

The story is playable the moment you save it. Missing art falls back to procedural
placeholders built from your theme colours, and every sound can be a procedural
synth, so you can write and play the whole thing before generating a single image.

### 3. Generate the art

```bash
npm run gen-assets harbor
```

Then `npm run dev` and pick it off the title screen.

Full reference: **[docs/AUTHORING.md](docs/AUTHORING.md)** — every directive, the
guard grammar, the manifest schema, the audio system, and prompt-writing guidance.

---

## Art pipeline

There is no bundled model and no API key in the repo. `tools/gen-assets.mjs` reads
`stories/<id>/manifest.json`, composes each prompt — a shared art-director preamble,
the story's `artStyle`, the per-asset prompt, and an aspect/composition hint — and
drives the **Codex CLI** to render one image into the correct assets path. It runs
sequentially, verifies each file, continues past individual failures, and exits
nonzero if any asset failed.

That means the *prompts are the source of art*, versioned alongside the script. A
story's visual identity is editable text, and regenerating a look is a one-line
change plus `--force`.

The engine never requires any of it. Art is optional to run.

---

## Story generation (server-side)

`npm run dev` / `npm run preview` also mount a small Node-only API
(`src/server/`, wired in by `storygen()` in `vite.config.ts`) that writes
whole new stories from a premise: an LLM drafts a `manifest.json` +
`story.pq`, the real parser and a 34-rule checklist validate and — if
needed — repair it, it lands in `stories/<id>/` as an ordinary story, and —
if a key is configured — its art is painted by the Gemini image model. A
static `dist/` has none of this; it just plays what's already in `stories/`.

**In the app:** click **Create a Story** on the title screen (present only
when a dev/preview server is running behind the page), write a premise, and
Generate. A five-step rail tracks the run; **Begin** drops you straight into
the finished story — no trip back through the title screen — and **Begin
now** lets you start playing while its art keeps painting in the background.
The result is an ordinary story folder you can hand-edit afterwards, exactly
like one written by hand (see
[docs/AUTHORING.md §9](docs/AUTHORING.md#9-generating-a-story-from-inside-the-app)
for the full walkthrough, including how to repaint it later with
`gen-assets --backend gemini --force`).

Nothing here is required to run the app. Without any key set below, `GET
/api/health` reports every provider as unconfigured except `mock`, which
needs no key at all and runs the whole pipeline — draft, validate, save, and
(if art is left on) paint every asset as a placeholder — offline and
deterministically.

Copy `.env.example` to `.env.local` and fill in whichever of these you want
(all optional, none committed — `.env.local` is git-ignored):

| Purpose | Variable | Default |
|---|---|---|
| Default provider | `STORYGEN_PROVIDER` | `gemini` |
| Default text model override | `STORYGEN_MODEL` | the provider's own default |
| Gemini key | `GEMINI_KEY` (fallback `GEMINI_API_KEY`) | — |
| Gemini text model | `GEMINI_MODEL` | `gemini-3.7-flash` |
| Gemini image model | `GEMINI_IMAGE_MODEL` | `gemini-3.1-flash-image` |
| xAI key | `XAI_API_KEY` (fallback `GROK_API_KEY`) | — |
| xAI model | `XAI_MODEL` | `grok-4` |
| OpenAI-compatible key | `OPENAI_API_KEY` | — |
| OpenAI-compatible base URL | `OPENAI_BASE_URL` | `https://api.openai.com/v1` |
| OpenAI-compatible model | `OPENAI_MODEL` | `gpt-5` |
| Anthropic key | `ANTHROPIC_API_KEY` | — |
| Anthropic model | `ANTHROPIC_MODEL` | `claude-sonnet-5` |
| Stories root override | `STORYGEN_STORIES_DIR` | `<repo>/stories` |
| Image backend override | `STORYGEN_IMAGE_BACKEND` | `gemini` \| `mock` \| `none` (auto) |

If your network needs an HTTPS proxy, Node's `fetch` only honours
`HTTPS_PROXY` when started with `NODE_USE_ENV_PROXY=1` (Node ≥ 22.15) — the
server logs one line at startup when it detects a proxy it isn't using.

The full HTTP/SSE surface, if you want to drive it directly: `GET
/api/health`, `GET /api/stories`, `POST /api/generate-story` and `POST
/api/generate-assets` (both stream progress over Server-Sent Events), and
`GET`/`DELETE /api/jobs/:id[/events]`.

---

## How it works

Five subsystems that never call each other — everything crosses one typed event bus.

```
src/
  core/      the event map + shared types (the whole integration contract)
  engine/    lexer → parser → runtime (a pure, headless narrative state machine)
  stage/     Three.js: parallax layers, characters, weather, camera, post-FX grade
  ui/        hand-built DOM overlay: dialogue, proxy panel, chapter cards, saves
  audio/     Howler + a procedural synth fallback
  server/    Node-only Vite plugin: the story-generation HTTP/SSE API (dev
             + preview only; excluded from the browser tsconfig/bundle)
  main.ts    the composition root — the only module that knows all five
stories/     one folder per story (+ `_template`)
tools/       new-story, gen-assets, build-check
docs/        authoring guide, critic rubric, design spec
```

The `Runtime` is the sole emitter of narrative events and imports no rendering,
audio or DOM code — which is why the whole story layer stays testable. The UI is the
sole emitter of input events. `main.ts` only does lifecycle: construct, load, apply
settings, broker save/load.

Vite + TypeScript (strict). Three.js, GSAP, Howler. No UI framework.

---

## Documentation

- **[docs/AUTHORING.md](docs/AUTHORING.md)** — the complete story-writing guide.
- **[docs/CRITIC_RUBRIC.md](docs/CRITIC_RUBRIC.md)** — the visual bar this project
  was held to, and how it was scored.
- **[docs/superpowers/specs/2026-08-17-picture-quest-design.md](docs/superpowers/specs/2026-08-17-picture-quest-design.md)**
  — the design spec: architecture, event contract, subsystem responsibilities.

---

## How it was built

Lamplighter was built by a team of coordinated AI agents against the spec above,
with the visual work driven by a **blind A/B critic loop**.

Each screen was captured at 1920×1080 and shown to a hostile-art-director critic
alongside a real *Eliza* screenshot, unlabelled and in randomized order. The critic
scored both frames on composition, colour, typography, UI craft, art quality and
atmosphere, then named which was the more expensive-looking, shipped product — and,
when ours lost, listed concrete fixes. Those fixes drove the next round. The rubric
is checked in as `docs/CRITIC_RUBRIC.md`; the reasoning behind individual decisions
survives in unusually long comments in the UI and CSS, which is deliberate — most of
them record why an obvious-looking alternative was wrong.

Outcome, honestly stated: **5 of 7 screens finished with a confirmed panel win** over
the *Eliza* reference. The remaining **2 were accepted at a near-tie** rather than
iterated further. They are good; they are not decisively better than the thing they
were measured against.

Art was generated through the pipeline described above, from the prompts in each
story's manifest.

---

## Status

`npm run check` is the gate: typecheck plus production bundle, both green.
Both endings of *Lumen* have been played through end to end, along with the
save/load round trip and the scaffolded template story.

Original work in the spirit of *Eliza*. Not affiliated with Zachtronics.
