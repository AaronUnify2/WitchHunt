# Handover

## Just finished: Session 21, the map (M10.2; Lead Engineer)

**Status: everything is on `main` (live)** and on `claude/handover-review-zpvgy0`. 814 tests pass (was 759); the build is clean. A bedtime pass, then **Aaron's first look at round 32** and a round of fixes (round 33). `MORNING.md` was the overnight summary; my calls are OPEN_QUESTIONS #353-376, with Aaron's round 32 answers at the top of that section.

**After Aaron's first look at round 32** (all on main):
- **Liked:** the Bigfoot cave area ("the mountain and the tunnel": "some of your best work"); Save and quit works; the plane's cell on the fence works; the shelter's room isn't too dark; the dozer at the east end is fine; **no handcar**.
- **Fixed:** every cutscene keeps the dead moving but unable to notice or hurt Tom, and brakes the quad (he rode into the shelter's horde and died in the sweep); Skip intro leaves the quad outside the station's gate; the outpost's points come off the map as cleared (crates at once, C-7 once visited); **the brush comes away a piece at a time** (22 pieces, each tumbling off as the blade reaches it); no car markers on the maps; **all five optional encounters every run** ("as many as will reasonably fit").
- **Still to test (round 33):** those fixes; more Save and quit at other points in the story; the health floor; his glare list.

**Aaron's answers first** (OPEN_QUESTIONS "Session 21"):
- round 31's last items (Save and quit, the fence's power cell, the health floor) and **his glare list: still to come** (his tablet was off for the night);
- fix the **whole spine** in this pass;
- the road north's end and the railway crossings: Claude's calls ("your recommendation"; "have some fun");
- Earl's store is the **Home of Bigfoot shop at the gas station**;
- the storm shelter's room moves onto the interior system.

**What was built** (each in DESIGN.md as built, with its files):
1. **The fixed story spine:** `src/data/storySpine.json` (positions from home), `world/MapGenerator.js` (`placement: "spine"`):
   - the crashed plane, the clearing crew's dozer (the cordon strip's east end: which end is still open, #354), the old church, the stairs (off the pathways: one faint trail, `offPath`), the crashed UFO, the Car Armory, Ground Zero, the hut;
   - the checkpoint's pathway runs to the crashed plane (`entry`); fixed clearing types; their own vehicle rules (`vehicles.json` `_spine`);
   - the witch's routes avoid them and the cave (`Witch.avoided()`);
   - placeholders are signposts ("Story beat N: built in M1x"). **Each encounter's session builds into its fixed clearing.**
2. **The optional encounters:** `placement: "optional"` in `encounters.json`, `config.map.optional` (3-4 of the five designed, equally likely, anywhere; the railway cutting `onRailway`). `map.dealt` lists them. 30 clearings (`config.map.clearingCount`); `config.map.wildBandWeights`.
3. **The road north and the cave's brush:**
   - `world/road.js` `buildBranch` (it forks off the main road at `branchAlong`), `openingCluster.json` `roadNorth` and its `roadNorth` gate (a fallen oak until `day2`); the cluster pathway gas station → cave (`road: "north"`);
   - `world/roadNorth.js` (pure layout: the tunnel portal, the barrier, the spur of rock, the mouth, the brush, Earl's signs, the prints, open ground), `world/RoadNorth.js` (in play: the bumps, the dozer clearing the brush, `caveFound`, saved as `roadNorth`), `render/RoadNorthProps.js`; `config.map.roadNorth`;
   - the cave is a cluster clearing with `hiddenAs` ("Road's end") until `revealedBy` (`caveFound`): `World.clearingName()` asks the story flags.
4. **The 1903 railway line:** `world/railway.js` (the line, `railZAt`, `railCrossings`), `world/GroundField.js` (`rasterRailway`, `regrowthAt`, the grade and the tunnel hills in `railHeight`), `world/forestLayout.js` (saplings and brush back on the bed), `render/Railway.js`; `config.map.railway`. Clearings keep `clearance` off it. The map draws it (`ui/mapImage.js` `drawLines`).
5. **The interior system:** `world/Interiors.js`, `ui/InteriorHud.js`, `config.interiors`:
   - `interiors.define({ id, name, entrance, surfaceY, load(scene, floorY), platform, spawn, exit, light, onEnter?, onLeave? })`; `enter(id)` / `leave()`; `saveSpot()`;
   - the pocket is `config.interiors.depth` (1200 m) under the entrance; `player.space` and `combat.inside` are the interior's id; `EnemyManager.assignTiers` sends every zombie whose `space` differs to the abstract tier; `Sky.interior`, `Atmosphere.inside`, `Sfx.muffled`, `Flashlight.wallHit()`;
   - the storm shelter defines its room (`StormShelter.defineInterior()`); `StormShelterProps.loadRoom()` builds it on the way down.
6. **SAVE_VERSION 4**; `Game.collectSaveOutside()` (the autosave and Save and quit) puts Tom outside an interior.
7. **Debug, Teleport & map:** next story place, next optional encounter, next railway crossing, the railway's tunnels, the road north's barrier and brush, bring the dozer to the brush, clear the brush.

**Checked headless** (seeds 1234, 7, 4242, 99): the opening's cutscenes on a New Run; every cluster place, the fork, the cave and the crashed plane (no page errors, about 85-105 draw calls at the default quality, against about 80-140 on `main` at the same spots: within a few calls of it); the dogfight; down the shelter and back; the brush (stopped on foot, cleared by the dozer); a save made down the shelter, reloaded and continued (beside the hatch); Night 1's waves. **Not played end to end** (round 32).

### Unfinished

- **Aaron's review of all of it** (round 32), plus round 31's last items and his glare list. Fix the small ones first, one at a time, each pushed; bigger ones to OPEN_QUESTIONS for Session 23. **Merge to `main`** once he's happy (the live build deploys from `main`).
- **The cave doesn't load yet** (a prompt at the mouth): it's M12's seeded interior on the new system.
- **The south's biome change (#368): Aaron chose a mix of burn country and government ground** (see "Designed for a future session: the south of the railway" below). Not built.
- **From before:**
  - the trail behind the gas station's draw calls (#302);
  - the rack shows no guns on it (#343); the common pickups' first-time introductions (#348); the card's turning item is a CSS placeholder (#346).

## Designed for a future session: the south of the railway (Aaron, Session 21)

DESIGN.md "the 1903 railway line" says the south is "more open and less structured". Aaron's pick from four ideas: **a mix of burn country and government ground**, so crossing the line feels like a biome change. Workshop the details with him first (rule 10). The ideas as offered:

- **Burn country:** an old wildfire scar. Sparse, blackened standing trunks, ash-grey ground and young growth coming back. It's open, so you see further and feel exposed (the witch and the dead see you sooner too). Fog lies low in the open: good round the crashed UFO and Ground Zero.
- **Government ground:** forest the portal programme cleared and lost. Stumps in rows, survey stakes with faded tape, straight access tracks between the Car Armory and Ground Zero, a toppled radio mast. Newer scars than the railway's, and more open.
- **How they might mix** (a proposal to confirm): the railway's regrown country just south of the line, giving way to burn country through the south band, and government ground (the cleared rows, the tracks) round the Car Armory and Ground Zero, burnt at its edges. Southness or distance from the spine's places can drive the blend.
- **Where it touches the code:** `world/forestLayout.js` (tree and undergrowth density by a south factor; a burnt-snag tree kind; stumps in rows), `render/treeSprites.js` (blackened trunks, new growth), `world/GroundField.js` and the terrain shader's floor (ash and churned ground by region), `config.forest` and `config.terrain.floor`, `render/Atmosphere.js` (low fog in the open), detection (sight further where it's open?), the map image's colours. Keep the cluster's land untouched (fixed seed north of the cordon) and **mind the draw-call and sprite budgets on the tablet**.
- Open: whether it's open enough to change how fights and the witch play (sight lines), whether the government tracks become pathways on the map, and which session builds it (an art/graphics session after the spikes fits).

## Next: Session 22, Lead Engineer + AI Programmer: the spikes (M10.3)

**First:** ask Aaron for his round 33 notes (the round 32 fixes), more Save and quit at other points in the story, the health floor, and his glare list; fix the small ones first, one at a time, pushing each.

**Goal** (DESIGN.md "Build plan", M10.3 and the Session 22 row): rough, debug-only spikes on the riskiest tech, **measured on the tablet**, each with a go / change-the-design answer written into DESIGN.md:
1. **About 150 zombies at the station** (the mega night): the active cap is about 25; the marches and sim tiers need a plan.
2. **The procedural four-path forest** (the place beyond the stairs; later the realm of stories): **build it on the interior system** (`world/Interiors.js`): a seeded set of foggy clearings, four paths each, loaded in a pocket under the stairs. Its entrance is the stairs' fixed clearing.
3. **A flying enemy** (the Mothman's flyovers and dives).
4. **A part bolted onto the dozer** (the killdozer's parts).

Not this session: any encounter's content (the crashed plane is Session 25).

### Gotchas and decisions to carry

- **Config and data first** (rules 5 and 9), complete files, small modules. **No lights added or removed while playing.** One idea at a time over the radio.
- **The map:** the spine's positions are data (`storySpine.json`); changing one moves it on every seed, so **bump `SAVE_VERSION`** when the map moves. The cave and the road north are cluster (fixed seed) land. Nothing but the railway cutting sits on the railway.
- **Interiors:** a new interior is one `define()`; its space goes in the pocket under its entrance (Tom's x, z stay the entrance's, so the minimap and the cordon checks are right). Anything that spawns enemies inside one must give them `space: <id>`, or the tier pass sends them abstract. Its light is `light: { ambientDay, ambientNight, ambientColor, fogColor, fogNear, fogFar }` (the scene's materials expect outdoor-strength light: the shelter needs ambientDay 3.2 to read).
- **Saving:** use `collectSaveOutside()` for any new save path.
- **Things that need the shovel ask `combat.weapons.has('shovel')`.** Guns found later go through `combat.giveWeapon(id, rounds)`. A special item found later goes through `game.card.show(...)`. Story-gated loot uses `"after"` in `loot.json`.
- **My headless harness** (Sessions 19-21): Playwright on `localhost:5173?seed=…` with `game.startScreen.activate('skip')` (or `'new'`, then stop cutscenes until none is active); daylight with `game.skipToPhase('day')` and `game.clock.setPaused(true)`; debug items by label (`game.debugMenu.categories[].items[]`: `label` may be a function, call `onSelect()`); `game.player.teleport()`; swiftshader runs at about 5 frames a second, so hold keys with `waitForFunction` on the state; restart the dev server after editing a module you also import from the page.

### Open questions for Aaron

- **Session 21:** #353-376 (my calls; #354, #357, #367, #368 and #370 settled), in particular #353 (the spine's places), #363/#365 (the cave's hints), #371 (the clock inside), #375 (the Day 1 red light), and the south's biome (above).
- **Session 20:** #340-352 (#344, #345, #347 and #349 settled), and his glare list.
- **Session 19:** #282-320, to check in play (#300, #308, #311, #317 and #319 are settled). In particular #302, the draw calls.
- **The experimental vehicles:** #321-339.
- **From the Nov 8 design** (DESIGN.md "Open questions"): the endgame's design; Milo's killdozer part; the heat-scope rifle's spot; the four named-only optional encounters.
- **From before:** #257-281, #225-256, #213-224, #185-197, #171-184, #161-170, #155-160, #143, #136-137, #140-141.

## Session kickoff prompt for the next session

```
You are the Lead Engineer (with the AI Programmer) on Witch Hunt, Session 22: the spikes (M10.3): about 150 zombies at the station, the procedural four-path forest (on Session 21's interior system), a flying enemy, a part bolted onto the dozer; each rough, debug only, measured on the tablet.
Read HANDOVER.md first, then docs/DESIGN.md ("Build plan": M10 and Session 22; "Interiors (shared system)"; "Stairs in the woods: the place beyond"; "The Mothman"; "The endgame: the killdozer"; "Performance and simulation LOD"), STATUS.md (Sessions 20-21) and OPEN_QUESTIONS.md (#353-376, then the older open ones).
First ask Aaron for his notes on PLAYTEST rounds 32-33 (the map, and its fixes), more Save and quit tests, the health floor, and his glare list, and fix the small ones, pushing each.
Then build the spikes one at a time, each tested and pushed, each with a measured go / change-the-design answer written into DESIGN.md; keep the opening playable on every seed.
Keep Aaron's rules: config and data first, complete files, no lights added at runtime, one idea at a time over the radio.
Then confirm your role and ask Aaron for his notes.
When he's happy, follow the handover protocol: update STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md for the next session (Session 23, QA & Balance: the opening with the new systems), and end with the HANDOVER READY signal.
```
