# Handover

## DO THIS FIRST: Aaron's full play-through notes (Nov 10, evening), then the giant moths, then the crashed plane

Aaron played the whole game through after Session 24 and gave the list below. **None of it is started** (Session 24's chat ran out of room). He wants it done **in one big hit while he sleeps**: work through the batches in order, **each batch tested (`npx vitest run`, `npx vite build`) and pushed to `main`** before the next; don't stop to ask (his answers to the five questions are in the list); write up at the end (STATUS, PLAYTEST: a new round per batch, OPEN_QUESTIONS for any call you make, MORNING). If you run out of room, say exactly where you stopped at the top of this file.

His words are kept close to how he said them; **"Default agreed"** marks an answer he gave to a question. File pointers are where I'd start looking, not a promise.

### Batch 1: quick fixes

1. **No first aid prompt at the start.** "When the game begins you're standing near the first aid kit box on the wall and it says hold X to pick up first aid kits. At the beginning of the game there should be no prompt like that." The comms room's aid box: `base/Station.js` (about line 276, `aidBoxTaken`), drawn by `render/stationInterior.js`. Plan: hide the box's prompt until Tom's health is below full (he can still take them then).
2. **The night forecast: press A to dismiss.** "The night one forecast is on the screen for a bit too long. Make it pop up for the same amount of time, but with a press A to dismiss prompt." `base/NightWatch.js` (`forecastTimer`), `config` `forecastSeconds: 14`. Keep the 14 s; A (and Enter) closes it early; show the hint on the panel. Mind the input isn't also read as a jump (see `tests/inputSwallow.test.js`).
3. **The mutant wakes closer.** "Reduce the distance that it takes to trigger the mutant. Let the player get within 2 metres or something like that." `encounters/GasStation.js` and its config (the dormant mutant's wake trigger).
4. **Zombies don't notice Tom during a cutscene.** "When I arrived at the storm shelter on the quad bike, a lot of the zombies noticed me arrive and started approaching while the cutscene was playing. Make it that the zombies do not notice you during a cutscene." `ai/detection.js` line 69 already has an "unseen" switch for arrival sweeps (Session 19): make it hold for **every** cutscene (and check it covers arriving on the quad: sound as well as sight).
5. **The storm shelter's ceiling.** "If you jump in the storm shelter, you can pop your head out of the room." `encounters/StormShelter.js` (line 71: "its ceiling is under the ground everywhere over it"), `world/Interiors.js`. Clamp Tom's head under the room's ceiling inside an interior (a general rule for interiors, not just this one). Note `Combat.js` line 433 has a debug jetpack: clamp that too.
6. **The donkey's ears aren't attached.** `render/barnAnimals.js` `equineSpec`: the ear masses sit above the head mass with a gap (the ear joint is at head + 0.1). Lower the ears into the skull and check the pony's. Look at it in the model viewer, from the side and the front.

### Batch 2: cameras, sound, set dressing

7. **The tower: a UFO, not a red light.** "When you go up the tower and see the flashing red light in the distance, swap that out for a UFO that briefly is visible, then flies away, maybe zooms away, and then the camera should pan to the smoke coming up from the campground." The tower beat: `story/FirstDay.js`, `data/cutscenes.json` (the tower's cutscene), DESIGN.md "the Day 1 red light is the UFO". `story/cutsceneFlight.js` already has `buildSkyActor({ kind: 'ufo' })` (the dogfight's craft: unlit, fog-free) and moves sky actors: reuse it. Hold on it hanging over the far south for about 2 s, then it zips off fast (accelerating, gone in under a second), then the existing pan to the smoke and lines 3-4. Update PLAYTEST section 3 and DESIGN.
8. **The gas station's arrival sweep goes round the west side.** "Currently the camera sweeps around the eastern side of the building. Make it sweep around the west side: that's the way the character will walk around." `data/cutscenes.json` `sweep.gasStation` (anchors from `encounters/GasStation.js`). It must still end on the HOME OF BIGFOOT sign and not pass through the store or the canopy.
9. **The witch's fly-away sound.** "After the cutscene where the witch is watching you from the trees and then flies away: change the sound effect from the boing kind of noise. The singing's good, but the noise she makes when she flies away is off-putting." Find the sound that scene plays (the gas station's witch-at-the-treeline cutscene in `cutscenes.json`; sounds are synthesised in `audio/Sfx.js`). Replace it with a rush of wind: filtered noise sweeping up and away, about 0.8 s, no pitched "boing". Check whether her ordinary flee uses the same sound (if so it changes everywhere: fine).
10. **The tape is in the VCR.** "You pick up VCR tapes from the shelf, and they contain the footage of Earl and his family arriving at the storm shelter. That footage could exist from the trail cam, but it would have to still be in the VCR. Put the tape in the VCR and have the player take the tape directly from a VCR." `encounters/StormShelter.js` (the `tapes` search, about line 506; `setTaken('tapes')`), `render/StormShelterProps.js`, `data/stormShelter.json`. Build a VCR (with a small monitor) on the shelf or desk, the tape half out of its slot; the prompt becomes taking the tape from the VCR; the shelf's loose tapes go. Lines and papers that say "tapes from the shelf" need rewording (grep `dialogue.json`, `papers.json`, PLAYTEST).
11. **The gas station's sign has power lines through it.** "At the gas station, the Home of Bigfoot sign has the power lines running through it." `render/GasStationProps.js` (about line 792: the pole sign) and wherever the road's power lines are strung (`render/Road.js` or the gas station's props). Move the sign clear of the wires (or the poles), on every seed (the cluster is fixed-seed land, so one check does).
12. **The cave road's sign: the text is too wide.** "At the Home of Bigfoot sign near the Bigfoot cave ('Earl's Gas Bait Gifts just ahead'), the H and the T in BIGFOOT are not on the sign." `render/RoadNorthProps.js` `boards()` (Earl's hand-painted signs; canvas text). Fit the text to the board's width (measure it and shrink the font).
13. **The torch glares off the Bigfoot signs.** "My own flashlight does a huge glare off the Bigfoot signs, the ones next to the road on the way out to the cave." The same boards: their paint is too pale. Their textured boards aren't covered by the glare test (it only checks baked colours): dull the canvas's background and ink (aim for luma under 0.45, see `propKit.lumaOf`), and use a Lambert material with a dark `color` multiplier if they're unlit Basic.
14. **No vehicles on the roads (the witch snagged on a truck).** "At the military compound the witch got snagged on one of the trucks on the road, and I managed to kill her with the shovel. Correct this by moving the military truck out of the road. We shouldn't have any vehicles on the road where the witch can get snagged on them." The outpost's trucks: `data/outpost.json` / `render/OutpostProps.js` / `encounters/Outpost.js`; abandoned vehicles: `world/vehiclePlacement.js`, `data/vehicles.json`. Move the truck onto the shoulder, and **add a test** that no vehicle or set-piece collider sits within the road's width on the road and the road north (the road's centre line: `world/road.js`, `world/roadNorth.js`). Check the experimental vehicles' parking spots too.

### Batch 3: vehicles

15. **The ute's turret can't hit zombies that are close.** "The zombies can get so close to the ute that the turret can no longer aim at them. The bullets shouldn't shoot from the tip of the barrel but more from the trigger part of the gun itself." `world/Ute.js` (the turret's fire: where the ray starts), `render/uteModel.js`. Start the shot's ray at the gun's breech (the pivot), keep the muzzle flash at the muzzle. Check the gun can depress far enough to hit a zombie at the ute's side.
16. **No arms when driving the ute.** "Remove the player arms when driving the ute. It's okay if the steering wheel just moves on its own." `world/Ute.js` / `render/uteModel.js` (the driver's arms).
17. **The ute's headlights and the dozer's light are too bright.** "The ute headlights are a bit bright, making everything reflect more than it should. Make the beam maybe a little wider, but duller." And: "the bulldozer light is also too bright: huge glare when you shine it on anything." `config` (grep `headlight`, the ute's and `config.dozer`'s light), `world/Ute.js`, `world/Dozer.js`. Lower the intensity, widen the cone; **no lights added or removed while playing** (rule): change numbers only.
18. **The dozer destroys rocks.** "The bulldozer gets stopped by the rocks, and that's not very fun." **Default agreed:** loose rocks and boulders in the forest break; the cliffs and the rock round Bigfoot's cave (the spur, `what: 'rock'` in `world/roadNorth.js`) don't. `world/Dozer.js` (how it fells trees and what stops the blade), `world/LandClearing.js` (felled trees are saved: rocks cleared should be saved the same way, so bump nothing unless the save's shape changes), the rocks' colliders and drawing (`render/Forest.js` or the terrain's rocks). A rock the blade pushes into takes a moment (like a big tree) then breaks apart with dust and is gone.
19. **A winched car can't shove the dozer.** "It's possible to shoot the winch and drag a car into the dozer such that the car pushes the dozer and makes it drive along really fast." `world/Dozer.js` (the winch and what it drags). The dragged thing must stop short of the dozer (a minimum rope length) and never add to the dozer's speed: the dozer's motion comes only from its own drive.

### Batch 4: carry every gun, and the weapon cross

Aaron changed his mind about the gun rack idea mid-notes: **"I think the player should be able to carry every gun."** So the gun-choice panel (`ui/GunChoice.js`, Session 23) goes, and so does the two-long-guns limit and the rack as storage.

20. **Carry everything.** `player/Weapons.js`, `combat/WeaponState.js`, `player/loadout.js`, `combat/Combat.js` `giveWeapon()` (about lines 247-260: where it sends a gun to the rack and calls `chooseGun`), `ui/GunChoice.js`, `Game.update` (it holds the world for the gun choice), the ledger's rack tab if it moves guns, `tests/gunChoice.test.js`, `tests/loadout.test.js`, `tests/rackGuns.test.js`. A gun found goes straight to Tom. Saves: an old save with guns on the rack must give them back to Tom on load.
21. **The weapon cross.** "If you press down on the D-pad when you don't have any lore items to watch, it brings up a menu that pauses the game, with the guns arranged in a cross." Simple icons, grid style (he asked for "weapon icons", "simple icons and grid style", not text).
    - **Up:** shotgun, then further out the auto shotgun.
    - **Left:** pistol, then the SMG.
    - **Right:** **service rifle, hunting rifle, then the semi-auto rifle** (default agreed: his list left the service rifle out; it goes first on the right arm).
    - **Down:** flare gun, then dynamite, then the military explosives.
    - Weapons not found yet show as empty slots.
    - **Default agreed:** the d-pad or stick moves along an arm, **A** puts that gun in Tom's hands, **B** closes. The existing swap button then flips between the last two guns used. **Y still fires a flare at any time; the shovel stays on its own button.**
    - D-pad down still plays lore when there's something to watch (that comes first). It pauses the world like the pause menu does (and stays out while a card, paper, cutscene or the viewer is up). Keyboard: give it a key.
    - Draw the icons in code (small canvas or CSS silhouettes from the same shapes as `render/rackGuns.js`).
22. **The gun rack stays as decoration** ("we'll keep the gun rack in the room because it's cool"): it shows the guns Tom has found.

### Batch 5: models

23. **Milo.** "The Milo model is a little too creepy. The smile is a little bit too wide. And the green wig is less clown-like and more its own thing. I think the white suit with polka dots might look better. Just make sure it doesn't look skin tight. At the moment he is a little too tall and his clothing's too tight. Make the feet really big. And the arms really long." His reference is **`docs/reference/milo-lone-clown.jpg`** (pixel art from the story's page: a short rounded green bob of a wig sitting on top of the head like a cap, a white face with a small red mouth, a red collar or scarf, a white suit with sparse red and blue dots, very big red shoes, one very long thin arm reaching out, the barn behind). So, in `render/miloModel.js` and `config.milo`:
    - **A white suit with coloured dots** (it was blue: he'd said blue was fine, then saw it). Off-white, dull enough for the glare rule (luma under 0.45; I had 0x5c563e read as bare skin under the torch, so go greyer-white, e.g. about 0x6c6a64, and keep the dots red and blue and fairly sparse); **loose and baggy** (`baggy` up to about 1.4, sleeves and legs as wide straight tubes, the top hanging from the chest: see `render/familyLooks.js` on why tight reads wrong).
    - **A smaller smile:** a normal-width red mouth, not ear to ear.
    - **A proper clown wig:** a rounded mop like the picture (one smooth dome with a fringe and sides), not my eleven separate balls.
    - **A red collar**, **very big red shoes** (about twice the length), **very long arms** (wrists at or below the knees), **shorter**: 1.9 m down to about 1.75 m.
    - The man's look keeps its broad shoulders and dark hair. Update `tests/milo.test.js`, PLAYTEST, DESIGN's "His look".
24. **The belted grey alien gets trousers.** "On the variant that's wearing a belt, could you put pants on him? It's a bit weird to wear a belt without pants. Just make sure they're not skin tight." `render/alienModel.js` `KIT_STAGES` (the cowboy drift's stages) and `config.aliens.grey.colours`: loose trousers from the belt stage on.

### Batch 6: the campsite as a survival camp

25. "Could we change the campsite to more of a survival camping campsite like Luke from Outdoor Boys would have, with the log wall around the fire?" **Default agreed:** keep every story beat and search (the camcorder, the shotgun, the slashed shelter with blood behind it, the stick figures and X marks, the car, the arrival sweep) and re-skin the camp: a **log reflector wall** behind the fire, **tarp-and-pole lean-tos with bough beds** in place of the three tents (the "torn tent" becomes a slashed tarp shelter), a firewood stack, a pot on a tripod over the fire ring, an axe in a stump. `render/CampsiteProps.js`, `data/campsite.json`, `encounters/Campsite.js` (the search points' names and prompts), `data/dialogue.json` / `cutscenes.json` where a line says "tent", the camcorder clip if it shows tents, PLAYTEST section 4, DESIGN. Keep the glare rule (`config.campsite.look`, tested in `tests/session19style.test.js`).

### Batch 7: giant moths you can shoot (Aaron's last request)

26. "Could you add the giant moths into the game, summonable from the debug menu? I'd really love to shoot some of them." The model and the instanced renderer are built (`render/MothRenderer.js`, `config.moths.giant`; a swarm is 16 to 32). Build a **debug spike like the flyer's** (`ai/Flyer.js` is the pattern: a script, an extra target for the weapons, the debug menu's Spikes category, off while `game.demo.active`):
    - New `ai/Moths.js`: "Moths: send a swarm at me" (16) and "send a big swarm" (32), "send them away".
    - Each moth is one of `combat.weapons.extraTargets` (a small hit shape: about 0.35 m radius; `noAssist` like the flyer or the aim will stick to the whole cloud) with low health (one shotgun blast kills several: check the shotgun's pellets each test extra targets; a service rifle round kills one).
    - Behaviour (a first guess, to tune after he plays): they mill in a loose cloud round a point 3 to 5 m up near Tom (`fly`), and every second or two one or two **dart** at him (`dart`), nip for small damage if they reach him, and peel back to the cloud. Shot: `flinch`, then `dying` (it falls, the eyes go out), a `corpse` on the ground for a few seconds. With the last one dead, or after "send them away", the rest leave.
    - Steering can reuse `ai/flyerPath.js` `steerTo`. One draw call whatever the number; no lights; a `wingbeat`-like flutter sound, quiet, not one per moth per beat.
    - Tests (pure parts: the cloud's points, a dart's reach, a hit kills, the pool's limit), a PLAYTEST round, an OPEN_QUESTIONS row for the numbers.

### Batch 8: the crashed plane's story beats (Session 25's own goal)

"I think once these have all been corrected, then just push on with making the crashed plane story beats unfold. Just go with your recommendation based on what the design doc says, and we'll fine tune it after playtesting." So no workshop first this time. DESIGN.md "Crashed plane" and "The Mothman at the crash site"; the details are in "Next: Session 25" below. In short:
- The grey at its workbench (`crashSite.spots.work`, facing the wing), the camera on it; it turns, sees Tom, lifts the pilot's pistol; control back just before it fires: **the quick draw** (about half a second, config); else its first shot misses, it scrambles to `spots.cover` and a shootout begins from behind the wing.
- Its drops: the pilot's pistol, alien shells, an alien med kit, the small power cell (each through `combat.giveWeapon`, `game.card.show`, the healing pool, the fence's cell: all exist as debug items). The pilot's log at `spots.log` (a paper).
- Wyatt suggests the signal flare (`spots.kit`): a cutscene; then two flyovers and the full attack (`ai/Flyer.js`'s moves on the Mothman's model); hurt enough, it flies off early; else the **10% health floor** (`Combat.setHealthFloor`) and the blackout, red eyes over him.
- **Default agreed:** Tom wakes at the wreck at dawn with the radio quiet, and the story stops there (Junie taken is Session 26). Set `mothmanMet` (flares join the drop tables).
- Story flags in `data/progress.json`, saved; it must survive Save and quit at each step.

### Batch 9: check and write up

- A headless play-through of the opening and the plane on two seeds (the harness notes are under "To carry" and "Gotchas"), no page errors.
- STATUS, PLAYTEST (rounds from 42 on), OPEN_QUESTIONS (a "Session 25" section: Aaron's notes as given, what was done, your calls as numbered rows from #412), DESIGN as built, MORNING, and this file rewritten for the session after.

### Also said in the same notes (no work needed)

- **The crash site:** "Wreckage looks pretty cool, pretty clear, all of that. I'm very excited for when there's an alien there to have an interaction with."
- **The gun rack idea is dropped as storage** (see Batch 4); the Session 23 gun-choice panel is superseded.
- **All five questions I asked: "just go with the default"** (they're marked above).
- Sounds are all placeholders still; only the witch's fly-away is to change now.

## Just finished: Session 24, Graphics Engineer / Technical Artist: models for the next stretch

**Status: everything is on `main` (live)** and on `ccr-970e6328-5u9z1d`. 912 tests pass (was 858); the build is clean. **Everything on the session's list is built.** All of it was checked headless (the model viewer under the torch, the crash site by day on two seeds); none of it on the tablet by me.

**Aaron at the start:** round 36 and his glare list not yet (still owed). The order: the Mothman, then the plane's set, giant moths, Bigfoot and the cocoon, Milo and his animals. The Mothman: "go with your gut", pushed to `main` for him to play from the debug menu (**PLAYTEST round 37**; OPEN_QUESTIONS #393-397).

**Done so far: the Mothman's model** (`render/mothmanModel.js`, `render/MothmanRenderer.js`, `config.mothman`; STATUS "Session 24"). One skinned mesh, one draw call, about 19,000 triangles, no lights; twelve poses; in the model viewer; the flyer spike (`ai/Flyer.js`) wears him.

**Done: the crashed plane's set** (`render/crashedPlaneModel.js`, `world/CrashSite.js`, `config.crashedPlane`; **PLAYTEST round 38**; OPEN_QUESTIONS #398-402). One baked mesh, one draw call, about 19,000 triangles; in its clearing on every seed, solid; its signpost gone. Not checked by torch at night in the world, nor on the tablet.

**Done: giant moths** (Aaron: dog sized, a swarm; `render/mothModel.js`, `render/MothRenderer.js`, `config.moths.giant`; **PLAYTEST round 39**; #403-404). One instanced mesh: a swarm is one draw call. Model only.

**Aaron (Nov 10, mid-session):** he played what was pushed (the Mothman, the crash site): **zero issues, no real feedback**; keep pushing on; a big play-test with notes comes before bed.

**Done: Bigfoot and his cocoon** (`render/bigfootModel.js` on `render/PosedFigure.js`, `config.bigfoot`; **PLAYTEST round 40**; #405-407). Model only.

**Done: Milo and his animals** (`render/miloModel.js`, `render/barnAnimals.js`, `config.milo`, `config.barnAnimals`; **PLAYTEST round 41**; #408-411). The clown and the man; the donkey (the stare), the pony, the turkey, the python. Models only. **Aaron attached The Lone Clown afterwards and the models were corrected to it** (OPEN_QUESTIONS "Corrected from the story"): the polka-dot suit, no nose, no ruff, three knives; the man dark-haired and broad; the donkey grey (and a she), the pony burnt caramel. **For Session 28 (the barn), from the story:** the heat lamp's amber light, the python in a glass tank on a wooden table, coiled round a branch; clean straw, full troughs, hay feeders; the wall of knife holes in the outline of a person; twelve paces; the knives land right shoulder, left shoulder, then over the head, each humming a note; a wooden chest of blankets by the door; his white van with a small wooden crucifix on the mirror; his clown voice is high, musical and bouncing, his own voice warm; a wet, rounded, bouncing chuckle. **Aaron also settled #404: a swarm of moths is 16 to 32.**

### Unfinished

- **Aaron's play-test notes:** rounds 36-38 came back clean; **rounds 39-41** (giant moths, Bigfoot, Milo and the animals) and **his glare list** are still to come (a big play-test with notes, he said, before bed). Ask first; fix the small ones.
- **Not checked by me:** the crash site by torch at night in the world; any of it on the tablet (frame rate).
- **Models only:** the moths have no behaviour designed (#404: how many is a swarm); Bigfoot's cave is M12; Milo's barn is Session 28.
- **From before:** the cave doesn't load yet (M12); the south's biome (below); the trail behind the gas station's draw calls (#302); the common pickups' first-time introductions (#348); the card's turning item is a CSS placeholder (#346).

**For Session 25 (the crashed plane's encounter):**
- `game.crashSite.spots` (world space): `work` (where the grey stands, in front of the wing, facing it), `cover` (behind the wing), `bench` (the wing's top, with the gun laid out), `cockpit`, `kit` (the flare pistol: the signal flare), `log` (the knee-board: the pilot's log). `game.crashSite.place` is `{ x, z, yaw }`; `toWorld(place, x, z)` turns model coordinates into the world's.
- The model's origin is the clearing's middle, in the gouge behind the wreck; the plane heads model +z. Tom comes up the gouge from -z.
- The set has no state and saves nothing. Pickups (the pistol, the shells, the med kit, the power cell) and the grey are the encounter's.

**To carry:**
- **Wings and other membranes** are the figure kit's `sheets` (`render/figureKit.js`): your own grid geometry with uv, painted through `paint(key, p, out, colours, uv)`, skinned from `bone` to `other` between `from` and `to`. The giant moths can reuse `forewingPoint` / `hindwingPoint`'s approach.
- **The Mothman's renderer** takes `{ active, x, y, z, facing, state, timer, flap, pitch, roll, look, flash }`. Standing states are placed by his feet; the `FLYING` ones by his middle (`config.mothman.middle` x his height). `look` turns his head (radians from straight ahead). A wing bone turned about y closes the wings (in flight: beats them); about z sweeps them down his body.
- **Unfogged glow in one draw call:** his shader keeps the colour from before `fog_fragment` and mixes it back by `aGlow` (no second mesh for the eyes).
- **The torch is strong up close:** his colours pass the glare test (luma under 0.45) and are still multiplied by `albedo` 0.3; at 0.8 he came out pale lavender at 4 m.
- **A new character is a spec and a pose function:** `new PosedFigure({ spec, pose, albedo, poseRate })`, then `update(m, dt)`; the pose function gets `h.set / add / rise / tip` and reads `m.state`, `m.timer`, `m.walked`, `m.look`. Use it rather than writing another renderer (the older ones, the Mothman's included, each carry their own copy of this).
- **A swarm in one draw call:** `MothRenderer` is an `InstancedMesh` whose vertex shader turns the wing vertices (`aWing`: -1, 0, 1) about the hinge by each instance's `aBeat` (lift, fold, glow). A wing sheet whose u and v run the other way round (the hindwing's fan) needs its winding flipped, or it shows its dark side (a test checks every wing face).
- **A set as one mesh with a matrix stack:** `crashedPlaneModel.js`'s `Builder` (`push` / `pushOnGround` / `pop`, `put`, `box`, `spot`, `wall`, `post`) builds tilted sub-assemblies (a rolled hull with its wing) in their own frames, on the real ground, and collects colliders and spots through the same frames. Reuse it for the next sets.
- **A place's sign goes when its set is built:** add its key to `config.landmarks.built` (cluster and spine places).
- **Midday for screenshots:** `game.skipToPhase('day')` is dawn light; then set `game.clock.phaseElapsed = game.clock.currentPhase.seconds * 0.5` and pause the clock.
- **My headless viewer harness:** open the viewer (`game.viewer.open(index)`), set `viewer.lightIndex` and `applyLight()`, hide `viewer.el`, `setPose(i)`, set `viewer.orbit.yaw / distance / height`, step `game.update(1/30)` about 40 times (the poses blend), then one `game.loop()` to draw.

## Before that: Session 23, QA & Balance: the opening with the new systems (M10 closed)

**Status: everything is on `main` (live)** and on `ccr-0414acc9-p7wutx`. 858 tests pass (was 845); the build is clean. Aaron was at work during the session (no tablet play): the play-through was headless.

**Aaron's notes** (OPEN_QUESTIONS "Session 23"): the place beyond, the flyer and the dozer's parts hold **about 57 fps** on the tablet, dipping to 40 when hectic: in DESIGN.md's spike table, **M10.3 closed**. Round 35 good. Ammo: he **never ran short** (#391: leave it). Wandering into the outpost early is fine (#392). Glare list: later. Push to `main` as you go.

**What was done:**
1. **The opening played through headless** on seeds 1234, 7 and 4242, Day 1 to past the cordon (every beat, in order), with **Save and quit and Continue** at dawn 2, after the gas station, in the shelter's room, after the outpost and past the cordon. No page errors.
2. **Fixed: the dawn autosave missed dawn's own flags** (`day2`, `shelterCall`'s back-up), so Continue from it left the gas station trail shut another day. `StoryProgress.settle()` / `replay()`.
3. **Fixed: the safe's hunting rifle went to the rack by itself** every run, so the outpost's dogfight was skipped. **Aaron's pick: a choice.** `ui/GunChoice.js`, for any gun found with its slot full.
4. **The gun rack shows its guns** (#343): `render/rackGuns.js`.

M10's "done when" is met (the opening on every seed, a mid-run save that continues, every spike measured); **Aaron's round 36 confirms it on the tablet.**

### Unfinished

- **Aaron's PLAYTEST round 36** (the gun choice, the rack, Continue after closing the browser at dawn) and **his glare list**: ask for both first.
- **From before:** the cave doesn't load yet (M12); the south's biome (below); the trail behind the gas station's draw calls (#302); the common pickups' first-time introductions (#348); the card's turning item is a CSS placeholder (#346).

## Designed for a future session: the south of the railway (Aaron, Session 21)

DESIGN.md "the 1903 railway line" says the south is "more open and less structured". Aaron's pick from four ideas: **a mix of burn country and government ground**, so crossing the line feels like a biome change. Workshop the details with him first (rule 10). The ideas as offered:

- **Burn country:** an old wildfire scar. Sparse, blackened standing trunks, ash-grey ground and young growth coming back. It's open, so you see further and feel exposed (the witch and the dead see you sooner too). Fog lies low in the open: good round the crashed UFO and Ground Zero.
- **Government ground:** forest the portal programme cleared and lost. Stumps in rows, survey stakes with faded tape, straight access tracks between the Car Armory and Ground Zero, a toppled radio mast. Newer scars than the railway's, and more open.
- **How they might mix** (a proposal to confirm): the railway's regrown country just south of the line, giving way to burn country through the south band, and government ground (the cleared rows, the tracks) round the Car Armory and Ground Zero, burnt at its edges. Southness or distance from the spine's places can drive the blend.
- **Where it touches the code:** `world/forestLayout.js` (tree and undergrowth density by a south factor; a burnt-snag tree kind; stumps in rows), `render/treeSprites.js` (blackened trunks, new growth), `world/GroundField.js` and the terrain shader's floor (ash and churned ground by region), `config.forest` and `config.terrain.floor`, `render/Atmosphere.js` (low fog in the open), detection (sight further where it's open?), the map image's colours. Keep the cluster's land untouched (fixed seed north of the cordon) and **mind the draw-call and sprite budgets on the tablet**.
- Open: whether it's open enough to change how fights and the witch play (sight lines), whether the government tracks become pathways on the map, and which session builds it (an art/graphics session after the spikes fits).

## Next: Session 25, Level & Encounter Designer + AI Programmer: the crashed plane and the Mothman at the crash site (M11, part 1)

**First:** ask Aaron for his play-test notes (rounds 39-41, anything more on 36-38) and his glare list; fix the small ones (each tested and pushed to `main`).

**Goal** (DESIGN.md "Build plan", the Session 25 row; "Crashed plane"; "The Mothman at the crash site"):
- **The crashed plane (beat 1):** the grey at its workbench (the camera on it, absorbed; it turns, sees Tom, lifts the pilot's pistol); **the quick draw** (about half a second: one good shot drops it); otherwise its first shot misses, it scrambles behind the wing and a shootout begins. Its drops: the pilot's pistol, alien shells, an alien med kit, the small power cell. The pilot's log.
- **The Mothman at the crash site (beat 2):** Wyatt suggests the signal flare (a cutscene); a flyover, a second, then the full attack; hurt enough, it flies off early, or Tom drops to the 10% health floor and blacks out, red eyes over him.
- **What's ready:** the set and its places (`game.crashSite.spots`: `work`, `cover`, `bench`, `cockpit`, `kit`, `log`; see "To carry"); the grey's model and poses (`render/AlienRenderer.js`: examine, ambush, aim, fire); the Mothman's model and the flyer spike's flight (`ai/Flyer.js`, `ai/flyerPath.js`: flyover, dive, strike; `render/MothmanRenderer.js` has `perch`, `mantle` and `cling` for between swoops); the health floor (`Combat.setHealthFloor`); the pistol, alien shells, the alien med kit and the plane's cell as debug items; `flares` gated on `mothmanMet` in `loot.json`.
- Workshop the encounter's beats with Aaron first (rule 10), one idea at a time.

Not this session: Junie taken and the Caller (Session 26); touch controls (#389: at the very end).

### Gotchas and decisions to carry

- **Config and data first** (rules 5 and 9), complete files, small modules. **No lights added or removed while playing.** One idea at a time over the radio.
- **The map:** the spine's positions are data (`storySpine.json`); changing one moves it on every seed, so **bump `SAVE_VERSION`** when the map moves. The cave and the road north are cluster (fixed seed) land. Nothing but the railway cutting sits on the railway.
- **Interiors:** a new interior is one `define()`; its space goes in the pocket under its entrance (Tom's x, z stay the entrance's, so the minimap and the cordon checks are right). Anything that spawns enemies inside one must give them `space: <id>`, or the tier pass sends them abstract. Its light is `light: { ambientDay, ambientNight, ambientColor, fogColor, fogNear, fogFar }` (the scene's materials expect outdoor-strength light: the shelter needs ambientDay 3.2 to read).
- **Saving:** use `collectSaveOutside()` for any new save path.
- **Things that need the shovel ask `combat.weapons.has('shovel')`.** Guns found later go through `combat.giveWeapon(id, rounds)`. A special item found later goes through `game.card.show(...)`. Story-gated loot uses `"after"` in `loot.json`.
- **Demo mode** (`demo/DemoMode.js`): anything new that runs on its own each frame (story beats, the witch, NightWatch) must stay off while `game.demo.active`; Demo mode swaps `game.saves` for a store that keeps nothing, and `endRun()` respawns instead. Its time of day is set straight (`setTime`), never through phase events.
- **Dynamic resolution:** `Renderer.setScale()` only marks the size dirty; the resize happens at the start of `render()`. Never resize the canvas between a draw and the browser showing it (that was the flicker).
- **Spikes are debug only** (the Spikes category): `PlaceBeyond`, `Flyer` and the dozer's parts aren't in the story. The camera's far plane closes in to the fog inside an interior, so anything meant to be seen in one must sit within `fogFar` + 20 m of Tom.
- **Guns found later** go through `combat.giveWeapon(id, rounds)`; with the slot full it now **asks** (`ui/GunChoice.js`, Session 23): the gun is already on the rack, the choice swaps it in. Anything new that holds the world must also keep the gun choice out (`Game.update`: it waits for a card, paper or cutscene).
- **Dawn's flags:** anything that saves on `phase:dawn` must call `progress.settle()` first (`Game.autosave()` does).
- **The rack's guns** are placeholder shapes from data (`config.station.gunRack.show`, `render/rackGuns.js`): a new rack-able gun needs an entry (a test checks every long gun and sidearm has one).
- **My headless harness** (Sessions 19-23; Session 23's is the fullest: it drives the opening start to end, `scratchpad/h/lib.mjs` style): stop the page's loop (`cancelAnimationFrame(game.rafId)`) and step `game.update(1/30)` yourself, rendering once at the end; inject actions by wrapping `input.readKeyboardMouse` (add to `input.down`) and movement by wrapping `input.computeMove`; **remove `game.onPointerLockChange`** first (headless loses the mouse lock and the pause menu opens, silently stopping everything); Save and quit reloads the page, so wait for `load`, re-wrap, then `startScreen.activate('continue')`; carry a save between runs by dumping `localStorage` and restoring it in `addInitScript`. Older notes: Playwright on `localhost:5173?seed=…` with `game.startScreen.activate('skip')` (or `'new'`, then stop cutscenes until none is active); daylight with `game.skipToPhase('day')` and `game.clock.setPaused(true)`; debug items by label (`game.debugMenu.categories[].items[]`: `label` may be a function, call `onSelect()`); `game.player.teleport()`; swiftshader runs at about 5 frames a second, so hold keys with `waitForFunction` on the state; restart the dev server after editing a module you also import from the page. Demo mode: `game.startScreen.activate('demo')`, then `game.demo.send(n)`, `game.demo.setTime('night')`; the zombies' cost is `game.combat.enemies.simMs` and `lodLine()`.

### Open questions for Aaron

- **Session 24:** #393-411: the Mothman (#393-397), the crashed plane's set (#398-402), giant moths (#403-404), Bigfoot and his cocoon (#405-407), Milo and his animals (#408-411: answered from the story; the blue suit settled). #404 settled (16 to 32).
- **Session 23:** #390 (the gun choice's default). #391-392 settled; round 36 played, no issues.

- **Session 22:** #377-389 (#377, #379, #381, #384 and #389 settled), in particular #382 (the verdict's lines; 57 fps reads Runs great), #378 (the place beyond's look), #385-386 (the flyer's and the parts' looks and numbers).
- **Session 21:** #353-376 (#354, #357, #367, #368 and #370 settled), in particular #353 (the spine's places), #363/#365 (the cave's hints), #371 (the clock inside), #375 (the Day 1 red light), and the south's biome (above).
- **Session 20:** #340-352 (#344, #345, #347 and #349 settled), and his glare list.
- **Session 19:** #282-320, to check in play (#300, #308, #311, #317 and #319 are settled). In particular #302, the draw calls.
- **The experimental vehicles:** #321-339.
- **From the Nov 8 design** (DESIGN.md "Open questions"): the endgame's design; Milo's killdozer part; the heat-scope rifle's spot; the four named-only optional encounters.
- **From before:** #257-281, #225-256, #213-224, #185-197, #171-184, #161-170, #155-160, #143, #136-137, #140-141.

## Session kickoff prompt for the next session

```
You are picking up Witch Hunt where Session 24 stopped. Read HANDOVER.md first: its top section, "DO THIS FIRST", is Aaron's full play-through list (26 items in 9 batches, with his answers) plus the giant moths as a debug spike and then the crashed plane's story beats. None of it is started.
Aaron is asleep: work through the batches in order without stopping to ask, each batch tested (npx vitest run, npx vite build) and pushed to main before the next. His reference picture for Milo is docs/reference/milo-lone-clown.jpg.
Then read docs/DESIGN.md ("Crashed plane"; "The Mothman at the crash site"; "Giant moths"; Weapons), STATUS.md (Session 24) and OPEN_QUESTIONS.md (the top sections) as each batch needs them.
Keep Aaron's rules: config and data first, complete files, small modules, no lights added or removed while playing, dull colours (the glare rule), one draw call where you can, tests for what you build.
Finish with the write-up (STATUS, PLAYTEST rounds 42 on, OPEN_QUESTIONS, DESIGN as built, MORNING, HANDOVER). If you run out of room, say at the top of HANDOVER.md exactly where you stopped.
```
