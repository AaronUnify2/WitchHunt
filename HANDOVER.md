# Handover

## Just finished: Session 22, the spikes (M10.3) and Demo mode (Lead Engineer + AI Programmer)

**Status: everything is on `main` (live)** and on `claude/handover-review-planning-s2li2x`. 844 tests pass (was 814); the build is clean. An overnight pass on Aaron's go-ahead ("work through this entire session on your own recommendations"). `MORNING.md` is the summary for him; my calls are OPEN_QUESTIONS #377-389, his notes at the top of that section.

**Aaron's notes at the start** (OPEN_QUESTIONS "Session 22"):
- round 32's fixes all good; Save and quit and the health floor "seem fine" (not fully tested); **his glare list needs more work**;
- **a black flicker frame every 5-10 s**: fixed (below);
- 150 zombies are easy on the tablet; it usually runs at 40-50 fps;
- **push to `main` as you go**;
- **Demo mode** (his idea), with my four recommendations: no touch controls yet, early weapons and basic zombies only, the fence on with a toggle, the verdict and the remembered preset.

**What was built** (each in DESIGN.md as built, with its files):
1. **The flicker fix:** `Renderer.setScale()` applies at the next `render()`; `DynamicResolution` backs off a raise that fails (`config.render.dynamicResolution` `failedRaiseSeconds`, `raiseBackoff`, `maxRaiseAfterSeconds`).
2. **Demo mode** (DESIGN.md "Demo mode"): `demo/DemoMode.js`, `demo/DemoPanel.js`, `demo/verdict.js`, `config.demo`; `Game.startDemo()`, `Game.startQuality()` (the preset kept in `meta.quality`); the menu's Demo choice (`StartScreen`).
3. **The spikes** (DESIGN.md "Build plan: the M10.3 spikes", each a **go**, headless):
   - 150 zombies: one instanced draw for every zombie; about 2.5 ms of simulation;
   - the place beyond: `encounters/PlaceBeyond.js`, `world/placeBeyond.js`, `config.spikes.placeBeyond`;
   - a flyer: `ai/Flyer.js`, `ai/flyerPath.js`, `config.spikes.flyer`; placeholder sounds `junieCall`, `wingbeat`, `screech` in `Sfx`;
   - dozer parts: `world/dozerParts.js`, `render/dozerParts.js`, `config.spikes.dozerParts`; `Dozer.togglePart()`.
4. **Debug:** a **Spikes (M10.3)** category.

**Checked headless:** Demo mode end to end (no save touched), the place beyond walked, the flyer's passes and strikes, the parts bolted on; New Run and Skip intro unaffected. **Not measured on the tablet yet.**

### Unfinished

- **Aaron's round 34 is in** (OPEN_QUESTIONS "Session 22"): **150 zombies at night: 57 fps on the tablet, Runs great** (in DESIGN.md's table); the caption stays (#379); the way back leads out (#377); Demo mode's weapons are right (#381); no aim assist on the flyer (#384); **touch controls at the very end** (#389). The armour plating blocked the dozer's view: fixed (waist high), PLAYTEST round 35.
- **Still wanted on the tablet:** the frame rate in the place beyond, with the flyer and with the dozer's parts (the spikes' other numbers); and whether the flicker is gone on both devices.
- **His glare list**, and Save and quit at more points, the health floor (he says they seem fine).
- **From before:** the cave doesn't load yet (M12); the south's biome (below); the trail behind the gas station's draw calls (#302); the rack shows no guns (#343); the common pickups' first-time introductions (#348); the card's turning item is a CSS placeholder (#346).

## Designed for a future session: the south of the railway (Aaron, Session 21)

DESIGN.md "the 1903 railway line" says the south is "more open and less structured". Aaron's pick from four ideas: **a mix of burn country and government ground**, so crossing the line feels like a biome change. Workshop the details with him first (rule 10). The ideas as offered:

- **Burn country:** an old wildfire scar. Sparse, blackened standing trunks, ash-grey ground and young growth coming back. It's open, so you see further and feel exposed (the witch and the dead see you sooner too). Fog lies low in the open: good round the crashed UFO and Ground Zero.
- **Government ground:** forest the portal programme cleared and lost. Stumps in rows, survey stakes with faded tape, straight access tracks between the Car Armory and Ground Zero, a toppled radio mast. Newer scars than the railway's, and more open.
- **How they might mix** (a proposal to confirm): the railway's regrown country just south of the line, giving way to burn country through the south band, and government ground (the cleared rows, the tracks) round the Car Armory and Ground Zero, burnt at its edges. Southness or distance from the spine's places can drive the blend.
- **Where it touches the code:** `world/forestLayout.js` (tree and undergrowth density by a south factor; a burnt-snag tree kind; stumps in rows), `render/treeSprites.js` (blackened trunks, new growth), `world/GroundField.js` and the terrain shader's floor (ash and churned ground by region), `config.forest` and `config.terrain.floor`, `render/Atmosphere.js` (low fog in the open), detection (sight further where it's open?), the map image's colours. Keep the cluster's land untouched (fixed seed north of the cordon) and **mind the draw-call and sprite budgets on the tablet**.
- Open: whether it's open enough to change how fights and the witch play (sight lines), whether the government tracks become pathways on the map, and which session builds it (an art/graphics session after the spikes fits).

## Next: Session 23, QA & Balance: the opening with the new systems

**First:** ask Aaron for his round 34 notes (the flicker, Demo mode, the spikes) and **the tablet's numbers**; fix the small things first, one at a time, pushing each to `main`. Then his glare list if it's ready.

**Goal** (DESIGN.md "Build plan", the Session 23 row): play-test the opening (Day 1 to the frontier) with everything M10 added: the healing pool, the loadout and rack, ammo types, inspect cards, one power unit, no flares, the health floor, Save and quit (on the tablet, at several points), the map (spine, road north, railway, optional encounters), interiors (the shelter). Full runs through the opening on two or three seeds; pacing, ammo and loot, bugs. Close M10: its "done when" (the opening plays through on every seed; a save mid-run quits and continues; each spike has a measured answer).

Not this session: any encounter's content (the crashed plane is Session 25); touch controls (#389: at the very end of the project).

### Gotchas and decisions to carry

- **Config and data first** (rules 5 and 9), complete files, small modules. **No lights added or removed while playing.** One idea at a time over the radio.
- **The map:** the spine's positions are data (`storySpine.json`); changing one moves it on every seed, so **bump `SAVE_VERSION`** when the map moves. The cave and the road north are cluster (fixed seed) land. Nothing but the railway cutting sits on the railway.
- **Interiors:** a new interior is one `define()`; its space goes in the pocket under its entrance (Tom's x, z stay the entrance's, so the minimap and the cordon checks are right). Anything that spawns enemies inside one must give them `space: <id>`, or the tier pass sends them abstract. Its light is `light: { ambientDay, ambientNight, ambientColor, fogColor, fogNear, fogFar }` (the scene's materials expect outdoor-strength light: the shelter needs ambientDay 3.2 to read).
- **Saving:** use `collectSaveOutside()` for any new save path.
- **Things that need the shovel ask `combat.weapons.has('shovel')`.** Guns found later go through `combat.giveWeapon(id, rounds)`. A special item found later goes through `game.card.show(...)`. Story-gated loot uses `"after"` in `loot.json`.
- **Demo mode** (`demo/DemoMode.js`): anything new that runs on its own each frame (story beats, the witch, NightWatch) must stay off while `game.demo.active`; Demo mode swaps `game.saves` for a store that keeps nothing, and `endRun()` respawns instead. Its time of day is set straight (`setTime`), never through phase events.
- **Dynamic resolution:** `Renderer.setScale()` only marks the size dirty; the resize happens at the start of `render()`. Never resize the canvas between a draw and the browser showing it (that was the flicker).
- **Spikes are debug only** (the Spikes category): `PlaceBeyond`, `Flyer` and the dozer's parts aren't in the story. The camera's far plane closes in to the fog inside an interior, so anything meant to be seen in one must sit within `fogFar` + 20 m of Tom.
- **My headless harness** (Sessions 19-22): Playwright on `localhost:5173?seed=…` with `game.startScreen.activate('skip')` (or `'new'`, then stop cutscenes until none is active); daylight with `game.skipToPhase('day')` and `game.clock.setPaused(true)`; debug items by label (`game.debugMenu.categories[].items[]`: `label` may be a function, call `onSelect()`); `game.player.teleport()`; swiftshader runs at about 5 frames a second, so hold keys with `waitForFunction` on the state; restart the dev server after editing a module you also import from the page. Demo mode: `game.startScreen.activate('demo')`, then `game.demo.send(n)`, `game.demo.setTime('night')`; the zombies' cost is `game.combat.enemies.simMs` and `lodLine()`.

### Open questions for Aaron

- **Session 22:** #377-389 (#377, #379, #381, #384 and #389 settled), in particular #382 (the verdict's lines; 57 fps reads Runs great), #378 (the place beyond's look), #385-386 (the flyer's and the parts' looks and numbers).
- **Session 21:** #353-376 (#354, #357, #367, #368 and #370 settled), in particular #353 (the spine's places), #363/#365 (the cave's hints), #371 (the clock inside), #375 (the Day 1 red light), and the south's biome (above).
- **Session 20:** #340-352 (#344, #345, #347 and #349 settled), and his glare list.
- **Session 19:** #282-320, to check in play (#300, #308, #311, #317 and #319 are settled). In particular #302, the draw calls.
- **The experimental vehicles:** #321-339.
- **From the Nov 8 design** (DESIGN.md "Open questions"): the endgame's design; Milo's killdozer part; the heat-scope rifle's spot; the four named-only optional encounters.
- **From before:** #257-281, #225-256, #213-224, #185-197, #171-184, #161-170, #155-160, #143, #136-137, #140-141.

## Session kickoff prompt for the next session

```
You are QA & Balance on Witch Hunt, Session 23: play-test the opening (Day 1 to the frontier) with everything M10 added, Save and quit on the tablet, and close M10 (each spike's tablet number in DESIGN.md).
Read HANDOVER.md first, then docs/DESIGN.md ("Build plan": M10 and Session 23; "Build plan: the M10.3 spikes"; "Demo mode"; "Performance and simulation LOD"), STATUS.md (Sessions 21-22) and OPEN_QUESTIONS.md (#377-389, then #353-376 and the older open ones).
First ask Aaron for his notes on PLAYTEST round 34 (the flicker fix, Demo mode, the spikes) and the tablet's numbers for each spike, and his glare list; fix the small ones, pushing each to main.
Then full runs through the opening on two or three seeds (headless, and Aaron's on the tablet): pacing, ammo and loot, Save and quit at several points, bugs; fix one at a time, each tested and pushed to main.
Keep Aaron's rules: config and data first, complete files, no lights added at runtime, one idea at a time over the radio.
Then confirm your role and ask Aaron for his notes.
When he's happy, follow the handover protocol: update STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md for the next session (Session 24), and end with the HANDOVER READY signal.
```
