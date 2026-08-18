:: scene_arrival
@chapter "Act I" "The Silt and the Salt"
@bg booth
@weather rain intensity:0.4
@ambience water_rain fade:2
@music theme_drone fade:2
| The canal water is four inches above the floorboards now.
| It laps against the legs of your cedar table, soaking the fringe of your velvet cloth.
| Across the district, sirens whine. The district gates close at midnight.
@sfx bell_chime
| The beaded curtain rattles. Cold water splashes as someone wades inside.
@enter soren from:right pose:guarded
soren: You always were the last stall to blow out your candles.
| The wool of his coat is soaked through. He looks exactly like the night he vanished down the north sluice.
> "Ten coppers for a reading. Double after the second flood siren." -> booth_business
>! "You have nerve bringing that coat back to this table." -> booth_personal

:: booth_business
@set composure += 1
@pose soren wry
soren: Still running the ledger even when the floor is swimming.
soren: Good. I did not come here looking for mercy.
-> booth_table

:: booth_personal
@set truth += 1
@set composure -= 1
@pose soren bitter
soren: I wondered what your first words would be. That is fair enough.
soren: Six years of salt water does not wash out a bad debt.
-> booth_table

:: booth_table
@sfx coin_click
| He drops a heavy brass guilder onto the velvet cloth between you.
| It sinks slightly into the wet fabric, unpolished and nicked at the rim.
soren: Read my left hand. Tell me if I make the last ferry at the Upper Lock.
| He extends his palm over the table. The scar across his thumb is pale against cold skin.
> "A brass coin buys three minutes. Keep your fingers flat." -> reading_shallow
>! "You took this coin from my lockbox the night you left." -> reading_confront

:: reading_shallow
@set composure += 1
| You take his wrist. His pulse is fast and irregular beneath cold skin.
| Your fingers trace the deep furrow of his lifeline toward the wrist.
-> reading_lines

:: reading_confront
@set truth += 2
@set regret += 1
@set composure -= 1
@pose soren tender
soren: I did.
soren: And I spent six years making sure I never had to spend it on bread.
| His fingers do not pull away. The heat in his skin fights the draft from the doorway.
-> reading_lines

:: reading_lines
@chapter "Act II" "The Line of Travel"
@bg booth
@weather rain intensity:0.6
@ambience canal_hum fade:2
@sfx splash_tone
| Outside, another warning bell clangs from the high church tower.
| The water rises past your ankles, cold and murky.
@pose soren guarded
soren: What do you see? Do the stars care about an old thief on a sinking wharf?
> "The traveler line breaks twice. You were never meant to stay anywhere." -> reading_fate
>! "I see someone who runs the moment the tide gets too deep to walk." -> reading_blunt
>! "I see the year we lost, cut straight across your palm." -> reading_grief {truth>=1}

:: reading_fate
@set composure += 1
soren: Destiny is convenient. It absolves everyone of bad choices.
-> truth_moment

:: reading_blunt
@set truth += 1
@set composure -= 1
@pose soren bitter
soren: You think I ran because it was easy?
soren: The magistrates were burning the lower wards. If I stayed, they would have taken you with me.
-> truth_moment

:: reading_grief
@set truth += 2
@set regret += 2
@pose soren tender
soren: It never healed clean. None of it did.
soren: I remember every word you said on the dock before the whistles blew. {regret>=2}
-> truth_moment

:: truth_moment
@music stop fade:2
@music theme_pad fade:2
| A floating lantern bumps against your doorpost, its candle hissing out in the flood.
| The tide is up to your calves now. The wooden table shudders against the current.
@pose soren wry
soren: The Upper Lock ferry leaves in twenty minutes. I have two passage tokens.
| He draws a second brass token from inside his collar and sets it beside the first.
soren: One for me. One for whoever is willing to walk up the stone stairs before the weir breaks.
> "I belong to this quarter. I stay until the roof goes under." -> offer_refuse
>! "Why come back for me now, after six winters of silence?" -> offer_question

:: offer_refuse
@set composure += 1
@pose soren guarded
soren: The quarter is dead. Tomorrow this whole lane is six fathoms of silt.
soren: There is no honor in drowning for an empty room.
-> canal_wade

:: offer_question
@set truth += 1
@set regret += 1
@pose soren tender
soren: Because every city north of here was just stone and strangers.
soren: And because you told me once that if I ever came back, I owed you a reading.
-> canal_wade

:: canal_wade
@bg canal
@weather rain intensity:0.7
| You kick open the back door of the booth. Black canal water rushes in to waist level.
| The drowned lane is a river of broken timber and dim floating lamps.
| Soren wades beside you, his arm braced against the rushing swell.
> "Keep your lantern high. The current is pulling toward the grates." -> wade_careful
>! "Take my arm. The paving stones are gone underfoot." -> wade_close {truth>=2}

:: wade_careful
@set composure += 1
@pose soren guarded
soren: I have the heading. Follow the bridge pilings.
-> scene_stairs

:: wade_close
@set truth += 1
@set regret += 1
@pose soren tender
| He locks his forearm with yours, his wet wool rough against your soaked sleeve.
soren: I have you. We are nearly at the dry tiers.
-> scene_stairs

:: scene_stairs
@chapter "Act III" "The Upper Stairs"
@bg steps
@weather rain intensity:0.8
@ambience water_rain fade:2
@camera push zoom:1.05 duration:3
| Together you scramble up the moss-slick granite steps out of the surging water.
@pose soren guarded
| At the tenth landing, the water stops below your heels.
| Above you, the steam ferry whistles long and low into the fog.
| Soren turns. His hair drips into his eyes; his coat is black with canal mud.
soren: The gangway is dropping. We have one minute.
> "Take the ferry, Soren. We paid each other off tonight." -> eval_stairs_part
>! "Give me the other token. I am done reading futures in stagnant water." -> eval_stairs_stay {truth>=2}
>! "Leave the token on the wet step. Let the tide decide." -> eval_stairs_chance

:: eval_stairs_part
@set truth += 1
| You push the heavy guilder back into his wet hand.
-> ending_together {truth>=4 && regret>=2}
-> ending_separate {truth>=2}
-> ending_drowned

:: eval_stairs_stay
@set regret += 2
@set truth += 2
| You reach out and take the second token from between his cold fingers.
-> ending_together {truth>=4 && regret>=2}
-> ending_separate {truth>=2}
-> ending_drowned

:: eval_stairs_chance
@set composure += 1
| The brass coin clicks sharply against the wet granite landing.
-> ending_together {truth>=4 && regret>=2}
-> ending_separate {truth>=2}
-> ending_drowned

:: ending_together
@bg steps
@camera still
@pose soren tender
| He closes his fingers firmly over yours, warm despite the freezing rain.
soren: The northern canals are higher. The water doesn't reach the windows there.
| You step up the final granite tier together as the ferry horn cuts the fog.
| Below you, the lanterns of the old quarter slip under the black water, one by one.
-> END

:: ending_separate
@bg steps
@camera still
@pose soren wry
soren: You were always the smarter one between us.
| He touches two fingers to his temple in a quick, familiar salute.
soren: May your next table find dry ground and richer fools.
| He turns and runs up the iron gangway just as the hawsers groan and cast off.
| You stand on the high dry landing, holding your single brass coin, watching his lantern shrink into the mist.
-> END

:: ending_drowned
@bg steps
@camera still
@pose soren bitter
soren: Some things drown before the water even gets there.
| He pockets both tokens, his jaw set hard against the pouring dark.
| He does not look back as he walks past the ferry gate and disappears into the upper alleys alone.
| You look down at the dark water lapping the granite stairs, carrying the remains of your stall out to sea.
-> END
