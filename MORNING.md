# For Aaron in the morning (Session 15b, overnight)

You went to bed and told me to keep building: the gas station's beats (pass 2), then the quad bike (pass 3). Everything below is on `main` (567 tests pass, the build is clean). The open ones are also OPEN_QUESTIONS #198-212, and HANDOVER.md is written for Session 16 (the storm shelter), which starts with your notes on this list. These are the calls I made on my own judgment, for you to check. Each says what I did and where to change it.

## The gas station's beats (pass 2)

1. **The mutant's health: 180** (ordinary mutants are 300 before the zombie level's multiplier). DESIGN says "beatable close up with the shotgun and a handful of shells". In my test it charged as soon as it was up and took Tom from 100 to 40 health before I'd fired. It may be too punishing for a first meeting, or just right. `config.gasStation.mutant.health`.
2. **When it wakes:** about 1.6 m inside the door (`gasStation.json` `shopZ`), in a 3.4 s first-person moment. The camera finds it hunched at the back of the centre aisle, it unfolds (Session 13's dormant/wake poses), and the camera jolts. The world runs on during the moment, so it's already moving when you get control back. Shooting it in its sleep from the door also wakes it, with no cutscene.
3. **To give the mutant a clear line from the door, I moved the shelves** into two runs either side of a centre aisle.
4. **The forecourt pack: 5 citizens hanging about the pumps and cars**, there before you arrive (they don't rise out of the ground). They appear when you're about 35 m from the clearing's edge, so the arrival sweep shows them. `config.gasStation.pack`.
5. **The witch:** straight across the road from the door, about 20 m out at the clearing's edge, framed by the canopy. She stands about 2.8 s, then runs off east into the trees (with the song, then a shriek). She's small on screen at that distance; I can bring her closer. `gasStation.json` `witch`.
   - **I moved a forecourt car** (spot 2) east, out of the line from the door to her.
6. **Draft lines** (all marked `draft` in `dialogue.json`, ids `gas.*`):
   - Arrival, Wyatt: "No lights on. Dad, their truck's gone. Maybe they got out." (your line)
   - The mutant down, Ellen: "Tom? Tom, what was that? That wasn't like the others." (DESIGN's)
   - **The phone, Wyatt (new):** "Their phone's dead too? Then it's not just our line." There's also a toast: "Dead. Not even a dial tone."
   - **The scanner (new wording):** "...all civilians inside the quarantine line are to remain indoors. Do not approach the checkpoint. Repeat, do not approach the che..." Then Ellen: "Quarantine line? Tom, somebody out there knows what's happening."
   - The witch, Ellen: "That was her. The one from the tape. Tom, come home." Junie: "The note said they went to the shelter. That's where the camera was." Junie only speaks once the note's been read: right after the witch if you've read it, or as soon as you read it if you haven't.
   - **The safe opened, Wyatt (new; Session 16 makes this reachable):** "Earl's hunting rifle? Dad, that thing's got a scope. Now we just need rounds for it."
7. **Earl's note shows in the subtitle strip** as "EARL'S NOTE", silent, with no radio crackle. You can read it again. A proper paper close-up could come later.
8. **The safe:** "Locked. A heavy combination dial. A shovel or a shotgun won't touch it." It opens with a new story flag, `earlCombination`, which Session 16 sets from Earl's keys at the storm shelter. It gives the hunting rifle empty (no rounds; any already carried load into it) and sets `rifleClaimed`.
   - **Conflict to resolve:** `rifleClaimed` still has its Session 14 stand-in trigger (both places visited), which opens the outpost early. Session 16 should drop the stand-in. I've left it, since the shelter isn't built yet.
9. **One forecourt car always has a battery** (the first spot's, with no alarm). The others are rolled as normal.
10. **I removed the placeholder signposts** ("Encounter: built in M9") from the campsite and the gas station. The gas station's was standing inside the store. `config.landmarks.built`.
11. **The searches** (hold X, inside the store only): the counter (scrap, maybe ammo), two shelves (one has a sure first aid kit), the coolers, the office's filing cabinet, the stockroom's boxes (shells) and rack.

## The quad bike (pass 3)

12. **Where it is:** behind the gas station, by the stockroom's back door, facing the trail from the campsite, so it's the first thing you see arriving. Earl's, it's implied; nothing says so yet. `config.quad.parked`.
13. **Controls:** hold X by it to get on. Left stick up is the gas, back brakes then reverses, left/right steers. Hold X to get off once it's slowed down. The camera turns with it and you can still look around. A one-time hint shows on mounting.
14. **No shooting from the saddle.** The gun's slung (hidden) and charges and digging are off while riding; get off to fight. I did this for simplicity and so riding stays a travel tool, not a combat platform. Riding and shooting is possible if you'd rather.
15. **The numbers:** top speed 13 m/s (about 47 km/h, nearly twice a sprint) on pathways and roads. The undergrowth holds it to about a third of that (4.5 m/s, under a sprint), so it's for the paths. Trunks and walls stop it with a jolt (most of the speed lost). `config.quad`.
16. **Running the dead over:** above 4 m/s it knocks them down and hurts them (a full-speed hit drops a level-1 citizen) and loses some speed. A mutant takes much less and nearly stops it.
17. **It's loud:** every 1.5 s while the engine runs, the dead within 25 m (idling) to 60 m (flat out) come for you. There's a new engine sound (a held synth note that climbs with speed).
18. **The witch is 1.6x faster while you're on it** (your call): her roaming, her chases and her rushes. `config.quad.witchSpeedScale`.
19. **Saving:** where it's left is saved. You're never saved riding; on loading you're beside it.
20. **No fuel, no damage, no headlamp, no map icon.** The torch still works. All are easy to add if you want them.
21. **Looks:** a dark olive placeholder. From the saddle the torch still lights the handlebars a pale grey at point-blank range. The art pass can fix it properly.
22. **Debug (First day & campsite):** "Quad bike: bring it here" and "back behind the gas station".

## Since then (Aaron's gas station notes, settled)

- 2-3: the mutant is now down the west aisle, waking as you reach its mouth; it's off the minimap until it wakes.
- 9: the car in the east wall is fixed (a spot that doesn't fit is left empty now).
- 12: the back door opens onto the quad, and Wyatt tells you to take it after the witch.
