# =============================================================================
# story.pq — the starter script (PQScript).
#
# PQScript is line-based: one statement per line. Lines starting with '#' are
# comments. Blank lines are ignored. Unknown @directives are skipped with a
# warning, so it's safe to leave notes to yourself.
#
# Anything you reference here (backgrounds, characters, poses, music, sfx,
# ambience) must be declared in manifest.json. Missing art won't crash — the
# engine draws a tasteful procedural placeholder — so you can write and play the
# whole story before generating a single image.
#
# This template is deliberately tiny (two scenes) but demonstrates EVERY
# directive and all three choice types. Delete what you don't need.
# =============================================================================

# ':: label' declares a jump target. 'entry' in manifest.json points here.
:: start

# --- Atmosphere -------------------------------------------------------------
@bg room mood:evening              # set the background (id from manifest.backgrounds)
@weather rain intensity:0.4        # none | rain | snow | dust | fog, intensity 0..1
@music theme fade:3                # start looping music (fade in over 3s)
@ambience room_tone fade:2         # start a looping ambience bed
@camera still zoom:1.0             # push | pull | pan-left | pan-right | still

# --- Narration --------------------------------------------------------------
# A line beginning with '|' is narration (no speaker). A bare line works too,
# but the leading '|' is unambiguous — always safe, even with punctuation.
| The lamp is on. Outside, it has just begun to rain.
| This is where your story starts. Write like it matters.

# --- A character enters ------------------------------------------------------
@enter guide from:center pose:neutral    # from: left | right | center
guide: Hello. I'm the one who'll walk you through this.
guide: Change my name, my face, and everything I say — I'm only a placeholder.

# --- Expression + movement ---------------------------------------------------
@pose guide happy                  # swap expression (pose id from the character)
guide: But the machinery is real. Watch.
@move guide left                   # slide to: left | center | right
@camera push zoom:1.05 duration:4  # a slow cinematic push-in over 4 seconds

# --- A conditional line ------------------------------------------------------
# Guards in { } gate a line. Vars default to 0 / false. This one is skipped the
# first time through because 'mood' is still 0.
guide: You've been here before, haven't you? {mood>=1}

# --- Choices: the three kinds -----------------------------------------------
# A run of choice lines becomes one menu. Each has:  "text" -> target-label
#   >   suggested  (the AI/proxy's line — the 'Eliza' mechanic)
#   >!  off-script (the player's own words)
#   >?  neutral    (a plain branch, for stories without the proxy conceit)
# Guards work on choices too: add {var...} after the target.
| How do you want to answer?
> "Take the line the panel is offering you." -> path_scripted
>! "Say something of your own instead." -> path_offscript
>? "Just ask a plain question." -> path_neutral

# --- Branch A: scripted ------------------------------------------------------
:: path_scripted
@set mood += 1                     # mutate state: = + - += -=   (numbers or true/false)
guide: Safe and steady. The panel likes you.
-> scene_two                       # unconditional jump

# --- Branch B: off-script ----------------------------------------------------
:: path_offscript
@set mood += 1
@set trust += 1
@pose guide happy
guide: Off the script already. That's where the good stuff lives.
@sfx chime                         # play a one-shot sound effect
-> scene_two

# --- Branch C: neutral -------------------------------------------------------
:: path_neutral
guide: A fair question. Hold onto it.
-> scene_two

# =============================================================================
# Scene two: a chapter card, a scene change, an effect, and two endings chosen
# by a guarded jump chain (first matching guard wins).
# =============================================================================
:: scene_two
@chapter "Chapter Two" "The template continues"   # full-screen interstitial card
@fx dissolve                        # flash | shake | dissolve | glitch
@bg outside mood:night              # change location
@weather none                       # clear the rain
@ambience room_tone fade:2
@camera pan-right zoom:1.04 duration:6
| The door opens onto somewhere new.
@wait 1                             # hold for 1 second of silence

guide: This is the last beat. Where it goes depends on how you played.
@exit guide to:right                # send a character off-screen

# A guarded jump chain: the engine takes the FIRST line whose guard passes.
# Reach the warm ending by going off-script above (which raised 'trust').
-> ending_good {trust>=1}
-> ending_quiet

:: ending_good
@bg outside mood:dawn
| You said something true, and it landed. That's the whole trick.
@music stop fade:4
-> END                              # end the story (rolls credits from manifest)

:: ending_quiet
| You kept to the script. Safe, and a little further away.
@music stop fade:4
-> END
