# For Aaron

**Round 2: your Nov 13 play-test notes. Steps 1 to 4 are built and on `main`.** The first third now runs: Day 1 with the quad and the rifle from the start, the shelter behind Earl's store, a real Night 2 with the Screamer and Wyatt on the tower, Ellen's call at dawn, the shut gate, the Pruitt farm and its moths, and into the outpost by the tear in its fence. 1379 tests pass and the build is clean. Every step was run headless on one seed with screenshots; **none of it has been played by hand.**

The plan and your answers: `docs/FIRST_THIRD_PLAN_2.md`.

## What to try, in play order

1. **Day 1.** The garage is inside the fence, west of the cabin: your quad's in its first bay, the workbench and the shovel in the middle one. Ellen won't open the gate until the rifle's come down from the tower with you (Wyatt owns up to the turkey). At the campsite there's no shotgun: the dead come out of the trees as the camcorder's tape ends.
2. **Day 2.** The sheriff's car on the road has the pistol in its door. The storm shelter is 95 m up a track behind the store (Earl's own spade stands by the track if you left your shovel). Behind the hunting rifle in the safe is the old lever-action Earl let Wyatt shoot.
3. **Night 2.** Get home: dusk waits for you. 45 seconds to fit a battery and spend scrap, then three acts: a horde up the campground trail, two mutants from either side, and the Screamer at the treeline south of the gate, calling five more every 15 seconds until it's down (about 800 health; every hit puts its next scream back). Wyatt shoots from the tower. Then camera seven's catch of the witch at the Pruitts' plot, and a fade to dawn.
4. **Day 3.** Ellen's call. The checkpoint's main gate is chained; the family send you round by the Pruitts' farm, and the afternoon goes while they talk. At the farm the porch light's on and the wall round it is moving. Walk up, shoot from far off, or go round the side and shut Earl's generator down (torch off, or they come to you). Then look at the dead oak. Inside: Marcy's journal on the kitchen table, Earl's shotgun over the stove, and six things that only say something. Down the track, the family plot and what she buried there; then the tear in the army's fence, at night.
5. **Anywhere.** Walk deep into the trees on foot from Day 2 and a moth or two finds you. The chainsaw fells trees (the bar goes over on its side). Info texts stay up long enough to read. Milo straightens up after his bow.

## The things I'd look at first

1. **Night 2's size and the Screamer.** Every number is a first guess (`config.night2`, `config.screamer`). Left alone for 150 seconds headless, the fence box ran flat at 85 seconds and a panel fell at 150; with you shooting it should hold, but only your play can say. **The station can't be overrun on that night for now** (`night2.cantFall`), as on the mega night: say when you want it real.
2. **The porch at dusk.** The moths round the porch light are the best picture in the new stretch.
3. **Wyatt on the tower.** He drops about one every eight seconds. Too much help, too little?
4. **The Screamer and the mutant still wear stand-in looks** (the Screamer is a tall, bone-grey, white-haired zombie sprite). Their models are on the polish list below.

## Placeholder, or not as you asked

- **The Mothman's glimpse** is a first-person look at him crouched in the oak; he throws his wings wide, screams and is gone. It isn't staged beyond that.
- **The shut gate's fade** jumps the clock to late afternoon; the day then holds until you reach the farm (5 minutes at most).
- **The tear in the fence** is the chain gate's model with one leaf peeled back, not a fence of its own.
- **The outpost by night from the east** uses the same waves and peak as before; only the arrival (its sweep, the first soldier on the track, two lines) is new. C-7 is on the far side now, found while exploring.
- **Two small things left out of your notes so far:** none of the family's new stations (Ellen's board, Junie at the monitors) and no fog funnel after Junie's taken: steps 5 and 6.
- All new lines and texts are drafts (`draft: true`), Marcy's journal included.

## Not done yet (in order)

- **Step 5:** Ellen at a desk with her string board (hints on the current goal), Junie at the monitors (tips on the enemies).
- **Step 6:** after Junie's taken, fog shuts everything but the church and the stairs.
- **The polish list:** the cabin's interior, Earl's store, better models for the quad, the mutant, the witch and the Screamer. The garage and the farmhouse are dressed already.
- **Docs:** DESIGN.md hasn't been brought up to date with any of this; `docs/FIRST_THIRD_PLAN_2.md` is the record for now.

---

# Earlier: the build queue (Nov 12)

**The build queue is done: all seven items are scaffolded and on `main`.** The story now plays from Day 1 to Sheriff in his garage: the family's plan and the dozer, the bug-zapper night, the Bigfoot cave, the mega night, the mothership, the Car Armory, and the ute chase home. 1332 tests pass and the build is clean. Every beat was run headless from start to end; **none of it has been played by hand or on the tablet.**

**How to play any of it:** new game, then the debug menu's first section. "Continue story" has 22 entries, one for the start of each main story beat from the crashed plane to Sheriff home. They build on a fresh run, so start a new game before each.

**What scaffolding means here:** each beat is playable start to end with its goals, flags, a save, draft lines and placeholder sets. None of it is tuned, staged or written properly: that's the debug and design session on each encounter. Each item's section below says what plays, what's placeholder, and where its open questions are.

**The three things I'd look at first:**
1. **The mega night can't be lost yet** (#728). With the fence drained the night before, the family were dead by the third wave in my first run, so for now the station holds out whatever happens. It needs your call on how it's meant to be survived.
2. **The ute chase has nothing on its road** (#757): it's waves round the truck until you're 350 m clear. It's the beat furthest from what DESIGN describes.
3. **Bigfoot standing over you by torchlight with his hands out** (item 3) is the best moment in the new stretch as it stands. Worth seeing early.

**Not built** (you cut the queue at seven): the killdozer and Ground Zero, the realm of stories, and the hut and ending joined to the story.

# Build queue, item 7: the ute chase and the garage

**Scaffolded and on `main`.** 1332 tests pass; checked headless; not played by hand.

- **To try it:** new game, debug menu, "Continue story: The ute chase".
- **What plays:** get in the ute → Sheriff's on the gun → out of the gate with the base's dead coming from every side → clear; he's hurt → drive home → the family's lines → a garage outside the gate, the turret up, Sheriff at his bench selling three upgrades for scrap.
- **What's placeholder:** the chase has nothing on its road (no route, no set pieces); the garage is a shed; the upgrade list is three stand-ins.
- **Not checked:** a whole chase steered by hand. Headless, the ute drives straight and I skipped the last stretch.
- **For our session on it:** #756-765; PLAYTEST round 82.

# Build queue, item 6: the Car Armory and Sheriff

**Scaffolded and on `main`.** 1326 tests pass; checked headless; not played by hand.

- **To try it:** new game, debug menu, "Continue story: The Car Armory".
- **What plays:** the base's gate → dead agents in the yard → walk in upright and three living ones open up from behind sandbags; crouch and they lose you → the supply hall: ammunition, kits, armour, the turret in its crate, a locker of charges that refills every visit, the five files → the cages at the back: break Sheriff's lock; he says his piece; a bell starts.
- **What's placeholder:** the compound's layout; the stealth is one rule (crouch); the files have no text; Sheriff has no white hat or star yet.
- **A question for you (#749):** you can shoot the survivors. Should that cost something?
- **For our session on it:** #744-755; PLAYTEST round 81.

# Build queue, item 5: the crashed UFO and the mothership

**Scaffolded and on `main`.** 1317 tests pass; checked headless; not played by hand.

- **To try it:** new game, debug menu, "Continue story: The crashed UFO".
- **What plays:** the saucer and its beam → hold X in the light → aboard: a corridor, a core room, a hangar, five greys getting more cowboy as you go → take the core → Earl's quad on a cradle: take it down the beam → ride the alien quad home → fit the core: 3000 on the fence.
- **What's placeholder:** the ship is four boxes in a line; the greys stand and shoot; going up and down has no scene; the alien quad isn't saved or on the map yet.
- **For our session on it:** #735-743; PLAYTEST round 80.

# Build queue, item 4: the missing quad and the mega night

**Scaffolded and on `main`.** 1311 tests pass; checked headless; not played by hand.

- **To try it:** new game, debug menu, "Continue story: The missing quad and the mega night".
- **What plays:** go for the quad → a scorched ring, no quad → the radio erupts → get home → six waves, about 150, with a Hollow that walks through the fence and a Screamer that calls more → dawn → Ellen asks for the ship's core.
- **The big question for you (#728):** with the fence drained the night before, the family were dead by the third wave in my first run. For now the station can't fall on this night, so you can play it. How should it be survivable?
- **What's placeholder:** the Hollow is a mutant, the Screamer looks like any other, the Hanged just lands beside you; nothing gets harder afterwards.
- **For our session on it:** #723-734; PLAYTEST round 79.

# Build queue, item 3: the Bigfoot cave

**Scaffolded and on `main`.** 1302 tests pass; checked headless; not played by hand.

- **To try it:** new game, debug menu, "Continue story: The Bigfoot cave". The dozer's beside you, facing the brush.
- **What plays:** push through the brush → hold X at the mouth → the tunnel, the eggs (beetles hatch) → the last chamber: the Mothman on the ground, and it can die → cut Bigfoot out of the cocoon; he stands and holds out the Blessing → home, bury it at the star in the yard → the family's voices are back for good.
- **The best moment so far:** Bigfoot standing over you by torchlight with his hands out.
- **What's placeholder:** the cave is one fixed layout, roughly dressed; no giant moths; nothing is said or staged when he's freed.
- **For our session on it:** #711-722; PLAYTEST round 78.

# Build queue, item 2: the bug-zapper night at the station

**Scaffolded and on `main`.** 1293 tests pass; checked headless; not played by hand.

- **To try it:** new game, debug menu, "Continue story: The bug-zapper night".
- **What plays:** fire the lure flares from the yard → night → the Mothman → get on the dozer and hook it (B at it) → it thrashes on the cable while you and Wyatt shoot it → it falls on the fence, the fence goes to 0, it flies north → Ellen sends you to the cave.
- **What's placeholder:** both scenes (the flares, the fence); the spot in the yard has nothing standing on it; hooking is easy; Ellen's floodlights aren't in.
- **For our session on it:** #702-710; PLAYTEST round 77.

# Build queue, item 1: the family's plan and the army's dozer

**Scaffolded and on `main`.** 1286 tests pass; checked headless on two seeds; not played by hand.

- **To try it:** new game, debug menu, first section, "Continue story: The family's plan". Walk into the cabin.
- **What plays:** the family's plan (five lines) → Earl's maps from the storm shelter's corkboard (a paper with his map) → the family work it out over the radio → east along the cordon to the clearing crew's camp (a sweep, six dead engineers) → keys from the job box, a battery from beside the generator → drive the dozer home.
- **What's placeholder:** the plan is talk, not a staged scene; the camp is a first set; nothing happens on the drive home.
- **"Continue story"** now has ten entries, the crashed plane through to the dozer home. Use them from a fresh run.
- **For our session on it:** #691-701 in OPEN_QUESTIONS; PLAYTEST round 76.

# Session 33: your play-through notes, part 2

**All six notes from your second sitting are built,** with your answers, and on `main` in three batch commits plus the write-up. 1272 tests pass and the build is clean. I checked each batch headless on two seeds. None of it has been played on the tablet, and I can't hear the game, so the new static is untested by ear.

## Your four answers at the start

- **Save and quit:** left at home.
- **The wake-up scene: trimmed.** About 67 seconds where it was about two minutes. The account is four lines, the clip 26 seconds. OPEN_QUESTIONS #670 lists every line I cut; say which you want back.
- **The standoff's zoom** and **the quick draw's half second:** kept.

## What changed, in your list's order

1. **The maps:** in the place beyond and down the mine the minimap is a black disc, and D-pad up says there's no map ("No map of this place"; "The map's no use down here"). I also found that walking under the forest in either place was lifting the fog of war on the map above; it doesn't now.
2. **Static, not a whistle:** Junie's call in the place beyond and the Caller's voice from the trees are both radio hiss in the shape of a call, still from a direction. The Caller's lines over the radio are unchanged.
3. **Junie's shine:** she had two problems by torch: colours made for the cabin's lamps, and the torch never dimmed for her as it does for the dead. Both fixed. At arm's length her face is a face.
4. **Junie on the quad:** she sits on the rack behind you, with "Junie climbs on behind you and holds on" the first time. Ride through the gate and the homecoming plays (it used to wait for you to get off).
5. **The Caller:** silent from the moment she's found until she's home, and never again near the stairs.
6. **The power cell:**
   - **At the plane:** when the grey goes down, something leaves its hand and lands toward you: a teal crystal with a glow and a thin wisp of light standing off it. The screen says so, Wyatt says so, and the goal is "Search the creature. It dropped something."
   - **After the reunion:** Ellen asks whether it would run the fence, Wyatt says try it, and the goal is the fence box.
   - **If you never searched the grey:** she sends you back to the plane. In a fresh run that can't happen (the flare needs the search), so it only covers old saves.

**PLAYTEST round 75** walks through each. **OPEN_QUESTIONS #669-690** are my calls.

## Things to know

- **Ellen's and Wyatt's new lines are drafts** for you to rewrite (#687, #689).
- **The wisp of light on the drop** is the most game-like marker in the game so far. Say if it's too much (#686).
- **Junie shares the quad's rack with the fuel can** (#681). I can move the can to the front rack.
- **Is Junie too dark by day now** (#678)?
- **Four new debug start points** (the debug menu's first section): the grey down at the plane, waking at the wreck, Junie found at the stairs with the quad beside you, Junie home. They'll get you to each of these in one press.

## Not done

- **The tablet**, and any of it played by hand.
- **The static by ear.**
- Everything in the earlier lists still stands (the mine's untested numbers, the smashed radio's leftover code, the ferns in the place beyond).

## Next

Keep playing and narrating: the optional places and the mine are still to play. After the play-test, my suggestion is still the story's next stretch: the family's plan and the military's dozer.
