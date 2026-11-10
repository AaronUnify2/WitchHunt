# Handover

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
You are the Level & Encounter Designer + AI Programmer on Witch Hunt, Session 25: the crashed plane (the grey's AI, the quick draw, its drops) and the Mothman at the crash site (the flare, the flyovers, the attack, the 10% floor and the blackout). M11, part 1.
Read HANDOVER.md first, then docs/DESIGN.md ("Build plan": Session 25; "Crashed plane"; "The Mothman at the crash site"; "The Mothman"; "Aliens"; Weapons: the pistol and ammo types; Health: the health floor), STATUS.md (Session 24) and OPEN_QUESTIONS.md (#393-411, then the older open ones).
First ask Aaron for his play-test notes (rounds 39-41) and his glare list; fix the small ones, pushing each to main.
Then workshop the encounter's beats with Aaron (rule 10), one at a time, and build them on the set that's there (game.crashSite.spots) with the models that are there (the grey, the Mothman).
Keep Aaron's rules: config and data first, complete files, no lights added at runtime, one idea at a time over the radio.
```
