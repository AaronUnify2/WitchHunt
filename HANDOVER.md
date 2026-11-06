# Handover

## Just finished: Session 19, Graphics Engineer: style pass 2 (the opening cluster's places and their camera looks), then three rounds of Aaron's notes

**Status: everything is on `main` (live).** 680 tests pass and the build is clean. Details: `STATUS.md` (Session 19 and its rounds 2 and 3), `PLAYTEST.md` rounds 28-30, `OPEN_QUESTIONS.md` #282-320.

**How we worked:**
- Aaron answered the kickoff questions up front:
  - no new notes from rounds 25-27;
  - a 155 draw-call budget to start with (he's never seen the frame rate dip);
  - textures on big surfaces were my call (I stayed with vertex colours);
  - no letterbox added to the sweeps;
  - push to main as I go.
- Then: "complete the full pass unassisted, save the questions for the end". Six passes, each pushed to the session branch and to main.
- Then two rounds of his playtest notes (rounds 2 and 3, below), each built and pushed.
- **Rounds 28-30 aren't fully play-tested yet.** Aaron plans a thorough playtest.

### What was done

**The style pass (PLAYTEST round 28, #282-303):**
- **The props kit** (`render/propKit.js`, `config.props.weather`):
  - `bakeParts()` turns a place's colour-sorted geometries into one vertex-coloured mesh, weathered as it's baked: grime from the ground or floor, mottling, per-piece shade, darker undersides, rust on the metal;
  - the glare rule's ceiling (`maxLuma` 0.45; `keepBright` for the exceptions) is enforced in the bake and tested over every palette;
  - also `noise3`, `segBox`, `sagStrip`, `pillowGeometry`.
- **The places dressed:**
  - the campsite (`campsite.json` `props.dressing`);
  - the gas station (`gasStation.json` `dressing`, with colliders);
  - the storm shelter, up top and below;
  - the outpost: sandbags, camo net, concertina wire, brass. **C-7 is seated on its slope** (`OutpostProps.containerY()`).
- **The rest of the cluster:**
  - the barricades at home;
  - the cordon;
  - the road;
  - the gates.
- **The camera looks** (`PostFX`; `config.postFX.looks` and `treatments`; `config.cutscenes.treatments` and `osd`):
  - the camcorder's focus hunting, date stamp and counter;
  - the trail cams' data strip;
  - the scope's mil-dot reticle and sway;
  - the sweeps' grade;
  - the reveals' jolt (`"jolt": true`).
- **Draw calls (headless):**
  - the worst spot, the trail in behind the gas station, 203 → 157;
  - the outpost's barricade peak by night, 119 → 117.

**Round 2, Aaron's playtest notes (PLAYTEST round 29, #304-314):**
- The campsite's axe and its stump are gone. They read as a weapon to pick up.
- The postcard rack is off the gas station's counter.
- Earl's office is dressed (`GasStationProps.officeDressing()`).
- The shelter's and the gas station's sweeps run the world (`"world": "run"`) **unseen** (`"unseen": true`: `Game` sets `combat.unseen`, and `detection.playerSenses()` zeroes sight, hearing and touch).
- The diary's blank page is out.
- The field report is signed CPT R. **Mercer** (Hale is the family's name).
- The armoury's lockers are against the comms hut's back wall (`armoury.face`).
- **Working floodlights at the outpost** (`OutpostProps.lights()` / `buildFloods()` / `updateFloods()`; `config.outpost.look.floods`; `outpost.json` `floods`):
  - the barricade's three run off the generator (`Outpost.fitGenerator()`, saved as `floods`);
  - one at each gate and one at C-7 are always on, dusk to dawn;
  - three real point lights are handed to the lit lamps nearest the camera. They are always in the scene, at 0 intensity when unused, so there are no shader recompiles.

**Round 3 (PLAYTEST round 30, #315-320):**
- **The generator is at the foot of the watchtower**, by the ladder. Wyatt points it out the first time Tom's within 22 m once the fight's on (`outpost.floods.hint`, queued with `playLater`).
- **An objective step can carry several points** (`ats`, drawn on the map and the minimap; `at` is the first):
  - `outpostFight`: the barricade, the generator, the machine gun and the gun pit's rifle rounds, each dropping off when done (**Aaron: the rounds stay on the list**);
  - `outpostPeak`: the same while the barricade's peak is on;
  - `outpostCompound`: every point of interest not yet seen to, in any order;
  - then the checkpoint.
- **The dogfight is ready once the barricade's down** (`Outpost.dogfightReady`; Aaron is happy with it no longer waiting on the beetles). Wyatt's ask to scope still comes once the beetles are down, as a nudge.

### Unfinished

- **Aaron's play-test of rounds 28-30.** His notes come first next session.
- **The trail in behind the gas station is at 157 draw calls**, 2 over the 155 start: forest, the quad's 9 meshes, and outpost pieces at the far plane. His tablet hasn't dipped (#302).
- **Ideas, not built** (#303, #286):
  - the quad as one mesh;
  - a distance cull per place;
  - grime textures up close;
  - the propane cage going up like the pumps.
- **Later sessions':**
  - the frontier (Sessions 20-22);
  - style pass 3 (Session 27);
  - the audio pass (Session 29);
  - a jeep model;
  - the CCTV placeholder `clip.mothmanContainer`.

## Side pass after Session 19: the experimental vehicles (debug menu only)

Aaron asked for a quick experimental pass (not minimum viable): **a ute with a turret** and **an alien-upgraded quad** (neon, a 3 s boost, plasma), in the debug menu's **Experimental vehicles**, not in the story yet (maybe end-of-game unlocks). Built, tested headless (Playwright on the road, day and night), 710 tests pass. Details: `STATUS.md` ("Side pass after Session 19"), `OPEN_QUESTIONS.md` #321-331. **Aaron hasn't driven them yet:** ask how they feel when he has. Gotchas for whoever picks them up:
- They ride on `world/Quad.js`'s rules (`Ute` and `AlienQuad` extend `Quad`), but are their own things: `Game.experimental` updates them after Earl's quad; only one vehicle offers its prompt at a time.
- `Player.update` calls `riding.placeCamera(player)` after its own camera (the ute's cab tilts with it). `Combat.onStrike` asks `riding.strikeScale()`.
- Their lights are made on first `bring()` (`ensureLights()`): never add lights while playing normally.
- The ute's rear-view mirror is a `Renderer.preRender` hook (every third frame, in the cab only).
- The config's `ute.view` is the cab's look limits; `ute.look` is its colours.
- Driving up the road toward the gas station plays its arrival sweep (as on foot).
- **Part 2, the dozer** (`world/Dozer.js`, `world/LandClearing.js`, `render/dozerModel.js`): it edits the world: `Forest.fellTree()` hides a tree's instance and turns its collider off; `GroundField.carve()` changes the masks, `Terrain.updateMasks()` re-sends the texture (a few times a second while it works), `repaintMapCells()` redraws the map there. Felled trees and carved ground are saved (`clearing`). `Vehicles.moveVehicle()` moves an abandoned car (its colliders, spots and every instance). Aaron hasn't driven it yet.

## Next: Session 20, Level & Encounter Designer (+ AI Programmer): the north frontier (M10 part 1)

**First:** ask Aaron for his notes from the rounds 28-30 playtest. Fix the bugs and small ones first, one at a time, pushing to main. Bigger changes go in OPEN_QUESTIONS for a QA session.

**Goal (DESIGN.md "Build plan", Session 20):** the north frontier's encounters:
- the old barn (Milo the Clown);
- the crashed plane (fresh from the dogfight: smoke, the pilot, the lone grey alien, the first alien drops);
- the abandoned mineshaft (dark, the Mothman's origin, beetles, one charge).

**DESIGN.md says these wait on Aaron's encounter redesign** ("More to come", Oct 17). Ask whether it's ready, and take the designs from him before building (rule 10).

**For that session:**
- **Build each place the Session 19 way:**
  - static props through `render/propKit.js` `bakeParts()`, with a `baseAt` and the place's `look.weather` (metal colours in `rust`);
  - what changes in groups of its own;
  - several small textured boards merged into one mesh (an atlas, as the outpost's container codes);
  - dull, dark colours. Add each new place to the glare test in `tests/session19style.test.js`.
- **Objectives:** a beat-rich place with no fixed order can point at several spots at once (`steps(id, text, [points])` in `Objectives.work()`).
- **The crash sites** are where the dogfight shows them coming down (`Outpost.sites`; the smoke columns, `OutpostProps.buildCrashSmoke()`).
- **The interior system** is Session 21's. The mineshaft is "a short linear tunnel": decide with Aaron whether it waits for that.
- **Cutscenes:**
  - an arrival sweep per place (the sweep grade is automatic);
  - `"world": "run", "unseen": true` if the dead should keep moving in it;
  - `"jolt": true` on a first-person reveal;
  - every cutscene goes in the debug menu's Cutscenes category.
- **Lights:** a place that wants lamps can reuse the outpost's floodlight pool pattern (a few always-present point lights handed to the nearest lit lamps). Don't add or remove lights at runtime: it recompiles every shader.

### Gotchas and decisions from Session 19

- **Props:**
  - geometries go into `parts` (colour → list, world space, non-indexed, no `uv`); `flush()` / `ownGroup()` bake them;
  - a colour in `look.weather.rust` gets rust streaks, one in `keepBright` escapes the luma cap;
  - big boxes need segments for the weathering to show.
- **Grime runs up from `baseAt(x, y, z)`:** the store's floor, the shelter's room floor, the ground elsewhere.
- **Containers stand on `OutpostProps.containerY(frame, ground, c)`**, the colliders too.
- **Instanced meshes** take a shade per instance with `setColorAt()`.
- **The look pass:**
  - `PostFX.setLook()` sets a camera look, `setTreatment(name, amount)` a light treatment while no look is on;
  - the OSD reads `data-look` for its layout.
- **The letterbox bars** have always been on every non-CCTV cutscene (#300 asks whether to drop them from the sweeps).
- **`Dialogue.playLater(id, s, when)`** waits for the subtitles to be free; a `when` that's false drops the line.
- **The outpost's state** saves `floods`. `told` gains `generatorHint`.
- **My headless harness:**
  - Playwright on `localhost:5173?seed=1234` with `game.startScreen.activate('skip')`;
  - debug items by label (`game.debugMenu.categories`);
  - set and pause the clock (`clock.phaseIndex`, `phaseElapsed`, `setPaused`);
  - `game.player.teleport()` in a place's frame (`x = f.x + f.rx*x + f.fx*z`, the same for z);
  - `game.renderer.stats` for draw calls;
  - canvas screenshots with the HUD hidden;
  - `game.cutscenes.play(id)`, then wait on `.current.t`;
  - run the dev server as a background task.

### Open questions for Aaron

- **Session 19:** #282-320, to check in play (#317 and #319 settled). In particular:
  - #311: a battery of the generator's own (it competes with the machine gun for the truck's);
  - #308: the campsite's and outpost's sweeps running too;
  - #300: the sweeps' letterbox bars;
  - #297: the camcorder's date, 13 October;
  - #290: razor wire slowing the dead;
  - #313: the floodlights' brightness;
  - #302: draw calls.
- **From before:** #257-281 (Session 18), #225-256 (Session 17), #213-224, #185-197, #171-184, #161-170, #155-160, #143, #136-137, #140-141. Aaron: the backlog will be worked through soon.

## Session kickoff prompt for the next session

```
You are the Level & Encounter Designer (+ AI Programmer) on Witch Hunt, Session 20: the north frontier (M10 part 1): the old barn, the crashed plane and the abandoned mineshaft.
Read HANDOVER.md first, then STATUS.md (Session 19 and its rounds 2 and 3, Sessions 18 and 17), docs/DESIGN.md ("Build plan", "Encounters": the north band's old barn, crashed plane and mineshaft, "Aliens", "Giant beetles", "The Mothman", "Cutscenes") and OPEN_QUESTIONS.md (#282-320, then the older open ones).
First ask Aaron for his notes from the PLAYTEST rounds 28-30 playtest and fix the small ones, pushing each to main.
Then ask whether his encounter redesign for the frontier is ready; per rule 10, propose a build plan for each encounter (how it's made, what it looks like, how it plays, its cost in draw calls) and workshop it with him before building. Build the props the Session 19 way (render/propKit.js). Keep his rules: dull and dark props (pale ones glare under the torch), one idea at a time over the radio, cutscenes talk except the dogfight.
Then confirm your role and ask Aaron for his notes.
When he's happy, follow the handover protocol: update STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md for the next session, and end with the HANDOVER READY signal.
```
