# Handover

## Just finished: Session 23, QA & Balance: the opening with the new systems (M10 closed)

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

## Next: Session 24, Graphics Engineer / Technical Artist: models for the next stretch

**First:** ask Aaron for round 36 and his glare list; fix the small ones (each tested and pushed to `main`).

**Goal** (DESIGN.md "Build plan", the Session 24 row; part of M17): the models the next stretch needs, ready for the encounter sessions that use them (Session 25: the crashed plane and the Mothman):
- **The Mothman** (DESIGN.md "The Mothman"; the flyer spike's placeholder is `ai/Flyer.js` `build()`, #385): a tall winged figure, glowing red eyes (unfogged, no lights), wings that flap, a dive pose, landing or clinging between swoops.
- **Giant moths** (the mineshaft and the cave; behaviour still to design: model only).
- **Bigfoot** (friendly, can't be harmed; found in a silk cocoon in the cave: the cocoon too).
- **Milo and his animals** (Milo's barn, optional; DESIGN.md "Milo's barn"; the staring donkey).
- **The crashed plane's set** (the spine's first beat, just past the checkpoint; DESIGN.md "The Mothman at the crash site" and the crashed plane; the grey alien who took the pilot's pistol).
- Workshop the looks with Aaron first (rule 10), one at a time, in the model viewer (Session 13's `ModelViewer`, debug); mind the **draw calls and the glare rule** (props under a luma of 0.45; `tests/session19style.test.js`) and the tablet.

Not this session: the encounters' content and AI (Sessions 25-28); touch controls (#389: at the very end).

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

- **Session 23:** #390 (the gun choice's default), and round 36 on the tablet (the gun choice, the rack, Continue after closing at dawn). #391-392 settled.

- **Session 22:** #377-389 (#377, #379, #381, #384 and #389 settled), in particular #382 (the verdict's lines; 57 fps reads Runs great), #378 (the place beyond's look), #385-386 (the flyer's and the parts' looks and numbers).
- **Session 21:** #353-376 (#354, #357, #367, #368 and #370 settled), in particular #353 (the spine's places), #363/#365 (the cave's hints), #371 (the clock inside), #375 (the Day 1 red light), and the south's biome (above).
- **Session 20:** #340-352 (#344, #345, #347 and #349 settled), and his glare list.
- **Session 19:** #282-320, to check in play (#300, #308, #311, #317 and #319 are settled). In particular #302, the draw calls.
- **The experimental vehicles:** #321-339.
- **From the Nov 8 design** (DESIGN.md "Open questions"): the endgame's design; Milo's killdozer part; the heat-scope rifle's spot; the four named-only optional encounters.
- **From before:** #257-281, #225-256, #213-224, #185-197, #171-184, #161-170, #155-160, #143, #136-137, #140-141.

## Session kickoff prompt for the next session

```
You are the Graphics Engineer / Technical Artist on Witch Hunt, Session 24: the models for the next stretch (the Mothman, giant moths, Bigfoot and his cocoon, Milo and his animals, the crashed plane's set), ready for Session 25's crashed plane.
Read HANDOVER.md first, then docs/DESIGN.md ("Build plan": Session 24; "The Mothman"; "Enemies"; the crashed plane and the Mothman at the crash site; the Bigfoot cave; Milo's barn; the art direction), STATUS.md (Sessions 22-23) and OPEN_QUESTIONS.md (#390, #377-389, then the older open ones).
First ask Aaron for PLAYTEST round 36 (the gun choice, the rack, Continue after closing at dawn) and his glare list; fix the small ones, pushing each to main.
Then workshop each model's look with Aaron (rule 10), one at a time, and build it in the model viewer; mind the draw calls, the glare rule and the tablet.
Keep Aaron's rules: config and data first, complete files, no lights added at runtime, one idea at a time over the radio.
Then confirm your role and ask Aaron for his notes.
When he's happy, follow the handover protocol: update STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md for the next session (Session 25), and end with the HANDOVER READY signal.
```
