# Witch Hunt, first third, round 3: cutscenes and fights (Nov 16)

Aaron's notes (polish for the first third: a stale opening with no chance of dying, a mutant fight that's a non-event, a grey the hunting rifle kills in two shots, and a cutscene good enough for a trailer: interesting in the first second with the sound off). The plan below was drafted, critiqued and revised four times, then put to Aaron with four questions. **Built, Nov 16** (see "As built").

## Aaron's answers

1. **Death at the campground on Day 1:** allowed, with a retry from the campground.
2. **The Screamer's strike:** new sprite frames and a stretch (it stays a sprite, like the other zombies).
3. **A fuel bowser at the gas station:** no; the pumps and cars are enough.
4. **Trailer extras:** captions only, on three moments (the Day 1 horde, the Day 2 mutant, the grey's shield). Not the hazard lights, the low sun, or the mutant smashing the fire.

## The plan

**Shared groundwork:** a shove for the player that fades (the mutant's backhand, the Screamer's wind, the grey's arcs), a scripted carry for cutscenes; trailer captions as a cutscene event behind a debug switch (off for players); debug start points for each scene.

**Day 1 campground:** four dead round the fire; the arrival sweep ends on them turning to the camera; they come as it ends; Wyatt's "check their shelters" once they're down. After the tape (or making to leave with it kept), a new cutscene: no establishing shot, it opens low on one breaking out of the brush behind the campers' car, pulls back past the car as the horde spills from the treeline (the car is by the path in, so they're between Tom and home), and holds on the car for Ellen's battery line. Two groups (8, then 6). About 16 more sure rifle rounds in the search.

**Day 2 campground:** a mutant (Aaron's "third", after the gas station's and Night 2's; it's now the first the player meets) crouched at the fire with five dead round it, in place of the Screamer (Night 2's). A quick sweep: its glowing weak spot, it unfolds and turns, "MUTANT". Then a fight. Wyatt's box of 20 rifle rounds at dawn (the morning is rifle and shovel only). *(Undone Nov 23, Aaron's play-test: too intense; the Screamer's sighting is back. See DESIGN.md's first-third table.)*

**The gas station:** it stands, knocks Tom back down the aisle, charges, and backhands him out of the front door onto the forecourt; he lands facing the store as it ducks out after him. Can't die in it. The fight is then among the pumps and the cars, where the witch's cutscene wants him.

**The mutant:** double health. A slam (kept, with a ground shock), a wild backhand (thrown aside), a wild spin (two turns, travelling; then dizzy, its back open: the counter), a leap from range (4.5-14 m, to where he'll be). It aims ahead, turns until just before each blow, chains up to three, and leaps at a man who stands still for 2 s. Every blow has a wind-up of 0.45 s or more. Its blows, charges and landings set off cars and pumps (and it takes the blast).

**The Screamer:** while it screams, a wind blows Tom back (within 30 m, in the open; never off the tower). A snake strike: rears (the tell), lunges a few metres in a blink, neck out and jaw unhinged, hangs there after (the window for its head).

**The grey:** a boss bar (named, the shield in blue over its health). An orb shield that must be worn down (no head bonus through it) and recharges after a few seconds untouched. The quick draw no longer kills: it shatters the shield as it blooms. It flits (blink-dashes with an after-image) and still shoots. A mind scramble ray: rings gather at its hand, then run out along a wide cone; caught, the controls reverse for 5 s (W/S and A/D swap, mouse and sticks inverted, on foot). Lightning arcs at Tom within 7 m while the shield's up. Rounds in the wreck. About a 2-3 minute fight, then the flare and the Mothman as before.

## As built (Nov 16)

Everything above, on the session branch. The numbers and where to change them: OPEN_QUESTIONS #772-783. What to try: PLAYTEST round 84. Code: `encounters/Campsite.js` (the fire group, the horde, the Day 2 mutant), `ai/mutantMoves.js`, `encounters/GasStation.js` (gas.mutant's beats), `ai/Screamers.js`, `encounters/greyBoss.js`, `player/Player.js` (push, glideTo, scramble), `core/Game.js` (the retry point), `story/Cutscenes.js` (captions); cutscenes `sweep.campsite`, `campsite.horde`, `day2.mutant`, `gas.mutant`.
