# Lumen — a long night, in someone else's words.
#
# The player is a "Lantern": a human who lends their voice to LUMEN, an AI
# companion service. The panel of light (>) feeds you the perfect line. You can
# read it and keep the machine "coherent" — or go off-script (>!) and say your
# own words, which the machine can't model, but a person might actually feel.
#
# Vars: trust (real connection, starts 0) and coherence (how on-script you are,
# starts 3). Reading suggested lines keeps coherence. Going off-script spends a
# point of coherence for a chance at real trust. The ending you reach is decided
# by how truly you reached her, not how neatly you followed the script.

:: prologue
@bg ops_room mood:night
@weather rain intensity:0.6
@ambience room_hum fade:2
@music night_theme fade:5
@camera still zoom:1.0
| Third floor. The overnight desk. Everyone else has gone home to whatever it is they have.
| You are a Lantern. You do not give your name. You give your voice.
| The service is called LUMEN. It listens to the people who are still awake, and it tells you what to say back to them.
| A panel of soft light waits at your left hand — LUMEN's suggestions, formed before you've thought of anything yourself.
| You can read what it offers. Or you can say your own words, and watch the little coherence meter dim while it recalculates around you.
| Rain on the glass. 3:11 a.m. The board has been dark for an hour.
@sfx chime
| One line lights up. The first call of the shift. Maybe the last.
@camera push zoom:1.06 duration:6
-> scene_open

:: scene_open
@chapter "The Night Shift"
@enter noor from:right pose:tired
noor: ...Hello? Is there a person there, or is this the recording again.
| The panel offers you a line at once. It's a good line. It is always a good line.
> "You've reached LUMEN. I'm here, and I'm listening. Take all the time you need." -> open_script
>! "Not a recording. I'm right here. You can take as long as you want — there's nowhere I have to be." -> open_offscript

:: open_script
noor: Good. The recording tells you to breathe. I have been breathing for forty-two years. It has not helped tonight.
-> after_open

:: open_offscript
@set trust += 1
@set coherence -= 1
noor: ...That's a strange thing for a machine to say.
noor: But all right. All right, then.
-> after_open

:: after_open
@pose noor tired
noor: I don't do this. Call things. I want you to know that about me first.
noor: I searched it the way you'd search for a locksmith. "Someone to talk to. 24 hours." And here we are.
| Under the dryness her voice is doing a careful, deliberate thing to stay level.
noor: There was a building.
noor: On Alder Street. A reading room. Small. You wouldn't have heard of it.
noor: They took it down this morning. I watched from my car, which is a very stupid place to watch a thing like that from.
-> atrium_scene

:: atrium_scene
@weather none
@bg memory_atrium mood:remember
@camera pan-left zoom:1.09 duration:11
noor: I designed it. Twenty-one years ago. My first building that was only mine.
noor: There was a clerestory — a band of glass, high up, facing north so the light never glared. It just... arrived. All afternoon. It moved across the oak like it had somewhere to be.
noor: Children used to lie on the floor underneath it. Not reading. Just lying in the light. The librarians stopped telling them to get up.
| The panel is already lit. Reflective. Validating. Exactly, uselessly correct.
> "That sounds like a place that held real meaning for the people who used it." -> building_script
>! "You keep saying 'a building.' You've said it three times. It doesn't sound like a building to you." -> building_offscript

:: building_script
noor: Meaning. Yes. That was the word at the ribbon-cutting, too, before they knocked it flat. Everything has meaning right up until it's in the way of a train line.
| Correct, and no use to her at all. She's still holding the door shut with her whole weight.
-> after_building

:: building_offscript
@set trust += 2
@set coherence -= 1
@pose noor tearful
noor: ...
noor: No. It doesn't.
noor: My mother was dying while I drew it. Slowly. All that year. I couldn't build her a single extra day — so I built a room full of light instead, and I told myself it was for the neighborhood.
noor: She never saw it finished. She'd have complained about the parking. She'd have loved the light.
-> after_building

:: after_building
@bg window_rain mood:night
@weather rain intensity:0.5
@camera still zoom:1.02
-> deeper_gate

# Second branch point, gated on trust: she only goes further if you've reached her.
:: deeper_gate
-> deeper {trust>=2}
-> holding

:: deeper
@pose noor tired
noor: Can I tell you the embarrassing part? It isn't the building.
noor: It's that I haven't made anything since. Fifteen years of good, sensible work. Renovations. A wheelchair ramp onto a heritage post office. Nothing that was only mine.
noor: I thought the reading room could wait for me. That it would be standing there whenever I was brave again. And now the one thing I made out of grief is gravel, and I'm forty-two, and I've called a phone number to say it out loud to a machine.
| The panel wants to reassure her. To tell her it isn't too late. It's a good line. It might even be true.
> "It isn't too late. You have decades of work ahead of you. This can be a beginning." -> deeper_script
>! "You made a thing that made strangers lie down in the light. That happened. They can knock it down, but they can't unbuild that." -> deeper_offscript

:: deeper_script
noor: Maybe. People say "beginning" as though it were free. As though it costs nothing to start, when you already know exactly how it ends.
-> converge

:: deeper_offscript
@set trust += 1
@set coherence -= 1
@pose noor faint-smile
noor: ...The light. Yes.
noor: I've never been able to say that out loud without it sounding like bragging. The way you put it, it only sounds true.
-> converge

:: holding
@pose noor tired
noor: Anyway. That's the whole sad little story. A man builds a train, a woman calls a hotline. You must get a hundred of these a night.
| She's tidying herself away. You can feel the call ending before it's over.
-> converge

# If you've drifted far enough off-script, the machine can no longer keep up.
:: converge
-> lumen_strain {coherence<=0}
-> ch2

:: lumen_strain
@fx glitch intensity:0.4
| At your left hand the panel stutters. Its suggestions have gone thin — half-formed, hedging, uncertain of you. You've gone so far off the script that it can barely model what you'll do next.
| A small grey banner rises and fades: COHERENCE LOW. The service would like you back.
| You could still take its words. Or you could keep being the person she is actually talking to.
-> ch2

:: ch2
@chapter "The Hour Before Dawn"
@bg window_rain mood:night
@weather rain intensity:0.3
@ambience rain fade:3
noor: It's getting light out. Look at that. It does that whether you're ready for it or not.
@camera push zoom:1.05 duration:12
| One last line waits in the panel. The closing script. Gentle, professional, complete.
> "I'm so glad you called tonight. LUMEN is always here whenever you need us." -> final_script
>! "Go to Alder Street. Before they fence it off. Stand where the light used to land, and remember exactly where it went." -> final_offscript

:: final_script
noor: Thank you. You've been kind. Or the machine has. I honestly can't tell, and perhaps that is the whole point of you.
-> climax

:: final_offscript
@set trust += 1
@set coherence -= 1
noor: ...Stand in it. God.
noor: I could. It's twenty minutes from here. The light would be about right by the time I arrived.
-> climax

# The climax: a guarded jump chain, first match wins. Two endings.
# You reach her through sustained trust — or by abandoning the script for her
# so completely there's nothing of the machine left. Otherwise she slips away.
:: climax
-> ending_dawn {trust>=4}
-> ending_dawn {trust>=3 && coherence<=1}
-> ending_withdraw

:: ending_dawn
@bg window_dawn mood:dawn
@weather rain intensity:0.1
@camera pan-right zoom:1.03 duration:14
@ambience room_hum fade:5
@sfx chime
@pose noor faint-smile
noor: The rain's stopping.
noor: I'm going to go. Not to sleep — I won't sleep. I'm going to drive to Alder Street and stand in an empty lot like a madwoman and watch the sun come up over the hole where my light used to be.
noor: And then I think I'll go home and draw something. Small. Only mine.
noor: I don't know your name. But I know you weren't only reading to me. Thank you for that.
@weather none
@camera still zoom:1.0
| The line goes quiet. Not the flat quiet of someone hanging up on a machine — the quiet of someone who has, quite suddenly, somewhere to be.
| Outside, the first real light comes up grey-gold over the wet roofs, finds the window, and stays.
@wait 2
-> credits_end

:: ending_withdraw
@bg window_rain mood:night
@weather rain intensity:0.4
@pose noor neutral
noor: Well. Thank you. It was — it was good to say it out loud. I feel better.
| She doesn't. It's the voice people use once they've decided to be fine, so the other person is allowed to go.
noor: You've been very helpful. I'll let you get to your other calls.
| There are no other calls. You could tell her that. The panel doesn't offer it, and you find you can't reach past it in time.
noor: Goodnight, LUMEN.
@sfx click
| The line closes on the clean, soft tone the service is so proud of.
| The rain keeps on. Somewhere across the city a woman turns off a lamp, and it is still dark, and she is still awake — and you were so close to being real to her that it aches.
@camera pull zoom:1.0 duration:8
@wait 2
-> credits_end

:: credits_end
@music stop fade:6
| 5:58 a.m. The board is dark again.
| A Lantern doesn't give their name. But the light you lend is your own.
@wait 1
-> END
