/**
 * Lamplighter — the `mock` provider's fixed story, "Signal Hill" (design doc §6.1).
 *
 * `mock` makes no network call, ignores the premise, and always returns this
 * envelope. It is not a stub: the story is a real one that passes every
 * validator rule at the `short` profile — six choice menus, meaningful state,
 * two endings reached through a guarded chain — so the whole pipeline
 * (extract → validate → repair path → write → discover → play) runs offline,
 * deterministically, in CI and on a plane.
 *
 * Manifest and script are reproduced verbatim from the design doc. Do not
 * hand-edit them to "fix" the doc's own summary arithmetic in its closing
 * paragraph (it undercounts labels/@set lines/guards against the actual
 * text) — the story validates regardless, comfortably inside every band, and
 * a verbatim copy is what the design review asked for.
 */

import type { StoryManifest } from '../core/types';
import type { StoryEnvelope } from './validate';

export const MOCK_MANIFEST: StoryManifest = {
  id: 'signal-hill',
  title: 'Signal Hill',
  subtitle: 'One night on the north light',
  author: 'Lamplighter',
  synopsis:
    'You keep the overnight radio watch on an island with one ferry a day. Tonight one voice comes up on the open channel, and she has a bag packed and until dawn to decide whether to use it.',
  entry: 'signal_open',
  narrator: 'Watch',
  cover: 'cover_key',
  credits: ['Signal Hill', '', 'Written by Lamplighter', 'Made with Lamplighter'],
  artStyle:
    'Painterly cinematic still, cold North Atlantic palette of slate grey and lamp amber, wet light, soft sea haze, filmic grain, shallow depth of field, consistent character identity; no text, no UI, no border, no watermark.',
  theme: {
    key: '#86b0bd',
    accent: '#d9a05f',
    ink: '#e9eef1',
    paper: '#0c1215',
    grade: { splitTone: 0.3, contrast: 1.06, saturation: 0.92 },
    bloom: 0.7,
    vignette: 0.42,
    grain: 0.45,
  },
  characters: {
    wren: {
      name: 'Wren',
      color: '#d9a05f',
      defaultPose: 'guarded',
      home: 'right',
      scale: 1.0,
      description:
        "A woman in her late thirties, close-cropped grey-blonde hair, a salt-stained navy fisherman's jumper under an open oilskin, chapped hands. Lit by the amber wash of a radio set against a cold blue night. Wardrobe and lighting identical in every pose.",
      poses: {
        guarded: {
          prompt:
            'Portrait of Wren — restate the description — jaw set, eyes level, holding the handset a little too tightly. Chest-up, painterly, opaque dark neutral backdrop.',
        },
        thawing: {
          prompt:
            'Portrait of Wren — restate the description — the set of her mouth loosening, gaze off to the side. Chest-up, painterly, opaque dark neutral backdrop.',
        },
        decided: {
          prompt:
            'Portrait of Wren — restate the description — chin up, clear-eyed, the first grey light on one cheek. Chest-up, painterly, opaque dark neutral backdrop.',
        },
      },
    },
  },
  backgrounds: {
    radio_room: {
      prompt:
        'A cramped island radio room at night, one amber dial glow, charts pinned to a damp wall, black window streaming with rain. Landscape, no people.',
      parallax: 0.05,
      focus: 0.5,
    },
    harbour_dawn: {
      prompt:
        'A small stone harbour at first light, one ferry at the pier with its lamps still on, flat grey water, gulls, thin mist lifting. Landscape, no people.',
      parallax: 0.06,
      focus: 0.68,
    },
  },
  cg: {
    cover_key: {
      prompt:
        'Key art: a lit radio-room window on a black headland above a harbour, one warm square in a great deal of dark. No people.',
    },
  },
  music: { watch_theme: { synth: 'pad', loop: true, volume: 0.5 } },
  ambience: {
    sea_rain: { synth: 'rain', loop: true, volume: 0.45 },
    room_tone: { synth: 'hum', loop: true, volume: 0.3 },
  },
  sfx: {
    chime: { synth: 'chime', volume: 0.6 },
    click: { synth: 'click', volume: 0.5 },
  },
  vars: { trust: 0, steady: 3 },
};

export const MOCK_SCRIPT = `:: signal_open
@chapter "Signal Hill" "One night on the north light"
@bg radio_room mood:night
@weather rain intensity:0.55
@ambience sea_rain fade:2
@music watch_theme fade:4
@camera push zoom:1.04 duration:8
| The set has been quiet since eleven. You have the watch, the rain, and a mug going cold.
@sfx chime
| Channel sixteen opens. Somebody breathes into it for four full seconds before they speak.
@enter wren from:right pose:guarded
wren: North light, this is Wren off the Kittiwake. You are not going to want this call.
> "North light receiving. Go ahead, Wren." -> open_script
>! "I have got all night and nothing in it. Go on." -> open_own

:: open_script
wren: Right. Good. Procedure. I can do procedure.
-> the_ferry

:: open_own
@set trust += 1
@set steady -= 1
wren: ...That is not the voice they train you to use.
wren: All right. All right, then.
-> the_ferry

:: the_ferry
@pose wren guarded
wren: There is a ferry at six ten. I have a bag by the door and I have had it there since Tuesday.
wren: I am not asking anybody's permission. I want that understood.
| Under the flatness her voice is doing careful work to stay level.
wren: You are not going to say anything, are you. {steady>=3}
> "Nobody is asking you to explain a bag." -> ferry_plan
>! "You called a radio at three in the morning to tell me you are not asking permission." -> ferry_true
>? "Where would the six ten take you?" -> ferry_ask

:: ferry_plan
wren: Thank you. Genuinely.
-> the_box

:: ferry_true
@set trust += 1
@set steady -= 1
@pose wren thawing
wren: ...Yes. I did do that.
wren: You could have let that sit.
-> the_box

:: ferry_ask
wren: Mainland. Then a bus. Then my sister, who has been waiting eleven years to be right about this.
-> the_box

:: the_box
@pose wren thawing
wren: There is a box under the chart table. My father's. I have not opened it since the funeral.
wren: I keep thinking whatever is in it decides this.
> "It does not get to decide. You do." -> box_leave
>! "Then open it while I am here, and you will not have to do it alone." -> box_open
>! "You already know what is in it. That is why it is still shut." -> box_read {trust>=2}

:: box_leave
@set steady += 1
wren: Maybe. Maybe that is the sensible way round.
-> dawn

:: box_open
@set trust += 1
@sfx click
| Something wooden gives. Paper. A long pause with weather in it.
wren: Charts. Just his charts. Every crossing he ever made, in pencil, in a hand I would know anywhere.
-> dawn

:: box_read
@set trust += 1
@pose wren decided
wren: ...That is a rotten thing to be right about.
wren: It is charts. I have always known it is charts. He never wrote a word down in his life.
-> dawn

:: dawn
@chapter "Six Ten"
@fx dissolve
@bg harbour_dawn mood:dawn
@weather none
@ambience room_tone fade:3
@camera pan-right zoom:1.03 duration:7
@wait 1
| The rain stops the way it always does here: all at once, and without ceremony.
wren: The pier lights just came on. That is them warming her up.
> "You still have twenty minutes." -> dawn_kind
>! "You have been on this channel four hours to avoid twenty minutes." -> dawn_true

:: dawn_kind
wren: Twenty minutes. Yes.
-> the_ask

:: dawn_true
@set trust += 1
@set steady -= 1
@pose wren decided
wren: God. Yes. Obviously.
-> the_ask

:: the_ask
wren: Say the thing. Whatever the thing is that you people say.
> "Whatever you decide, you will have decided it." -> ask_stay
>! "Get on the boat, Wren." -> ask_go
>! "I am not going to tell you. But I will stay on until she casts off." -> ask_silent {trust>=3}

:: ask_stay
wren: That is very even-handed of you.
-> last_light

:: ask_go
@set trust += 1
wren: ...You are not allowed to say that.
wren: Say it again.
-> last_light

:: ask_silent
@set trust += 1
@set steady -= 1
wren: You will stay on.
wren: All right.
-> last_light

:: last_light
| Gulls. An engine finding its note across the water.
wren: North light. Are you still there.
> "Still here. North light standing by." -> close_plain
>! "Still here, Wren." -> close_warm

:: close_warm
@set trust += 1
-> ending_ferry {trust>=4}
-> ending_harbour

:: close_plain
-> ending_ferry {trust>=4}
-> ending_harbour

:: ending_ferry
@pose wren decided
wren: Then you can hear this. That is my boots on the ramp.
| The channel stays open a while after she stops talking. You let it.
@music stop fade:5
| Six ten. On time, for once in its life.
-> END

:: ending_harbour
@exit wren to:right
| The channel closes with a click and no goodbye, which is its own kind of answer.
| At six ten the ferry goes without her. At six eleven the light on the pier goes out.
@music stop fade:5
| You write the log. Nothing to report.
-> END
`;

export const MOCK_STORY: StoryEnvelope = { manifest: MOCK_MANIFEST, script: MOCK_SCRIPT };

/**
 * Exercises the repair loop offline (`STORYGEN_MOCK_BREAK=targets`, scenario F
 * in §14.1): retargets exactly the `open_script -> the_ferry` edge to a label
 * that does not exist, producing one TARGET_MISSING fatal issue. `the_ferry`
 * stays reachable via `open_own`, so nothing else about the story's shape
 * changes — the point is one clean, isolated, repairable defect.
 */
const BREAK_NEEDLE = 'wren: Right. Good. Procedure. I can do procedure.\n-> the_ferry\n\n:: open_own';
const BREAK_PATCH = 'wren: Right. Good. Procedure. I can do procedure.\n-> the_ferry_missing\n\n:: open_own';

export function brokenMockScript(script: string): string {
  if (!script.includes(BREAK_NEEDLE)) return script; // defensive: verbatim text shape changed
  return script.replace(BREAK_NEEDLE, BREAK_PATCH);
}

/** The raw JSON text the `mock` provider returns for one call. */
export function mockReplyText(o: { broken?: boolean }): string {
  const script = o.broken ? brokenMockScript(MOCK_SCRIPT) : MOCK_SCRIPT;
  return JSON.stringify({ manifest: MOCK_MANIFEST, script });
}
