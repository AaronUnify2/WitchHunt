# Handover

## DO THIS FIRST: Session 29: Aaron's big play-test notes, then the next optional encounter

**Where things stand:** everything to date is on `main` (and `ccr-bb490e1e-s6lk6t`). 1083 tests pass and the build is clean. The story plays from the opening through the crashed plane, Junie taken, the Caller, the old church, the stairs and Junie home. **Three optionals are built: Milo's barn, the railway cutting and the sawmill** (Session 28, with the chainsaw and the station's workbench). Session 28 finished its whole plan; nothing was left half done. Nothing since Session 25 has been played on the tablet.

**1. Aaron's notes first** (rule 10). His **big play-test** still hasn't come back (his notes were empty at the start of Session 28). It covers Milo's barn (PLAYTEST round 56), the Junie stretch (rounds 51-55), the crashed plane (round 49), the railway cutting, the maul and dynamite (rounds 57-59), and now the sawmill, the chainsaw and the workbench (rounds 60-63). Ask for them if they aren't in the conversation. Fix the small ones before anything else, and log each settled call in OPEN_QUESTIONS. The Session 28 calls I'd most like his eye on: #510-511 (what happened at the mill; the day book), #532 (the car radio's recall message: lore I made up), #528-529 (what wakes the dead, and how many), #521 (the stall restarts by itself), #518 (the chainsaw against the maul).

**2. Then the next optional encounter. Ask Aaron which:** the **moonshiners' holler** (rank 1: trip wires and the wire cutters, the auto shotgun proposed, the flamethrower as a killdozer part) or the **mineshaft** (rank 4: the cage lift and a battery, the turret cart, giant moths, the cocoon, the plunger; dynamite again through `game.dynamite.give(n)`; the rock drill head). DESIGN.md has each one's brief. Build it the way the cutting and the sawmill were built:
- **Where:** its optional clearing, dealt every run. `world/clearingFrame.js` `pathFrame(map, key)` gives its frame. `world/SawmillSite.js` is the shortest site to copy for a flat clearing; `world/RailwayCuttingSite.js` and `world/railCutting.js` for one that changes the ground.
- **The set:** one baked mesh with `render/setBuilder.js`. `render/sawmillModel.js` has pieces worth reusing: `deadMan` and `slumpedMan` (posed dead in two kinds), `wrapped`, `sedan`, `log`, `lumberStack`, `peavey`, `axe`, `blood`, and the risers' mesh.
- **The beat:** `encounters/Sawmill.js` is the newest shape: `init(ctx)`, flags for every beat, `reset()` from them, `update(dt, controls, playing, canInteract)`, searches from a `data/<place>.json`, timers on game time (`after()`).
- Set its vehicles to none in `data/vehicles.json` if the set fills the clearing, and add its key to `config.landmarks.built`.

**How to work** (as Sessions 26 to 28 did):
- Config and data first: an encounter's texts go in its own `data/<place>.json`, and new JSON entries go in each data file's own one-line style, so the diff stays small.
- Complete files and small modules.
- No lights added or removed while playing: glows and unlit parts instead.
- Dull colours (the glare rule).
- One draw call where you can.
- Tests for what you build.
- Saves go through story flags.
- Scenes staged as cutscenes, with each line timed to its reading length.
- A sound for every moment (`audio/Sfx.js`).
- Check every batch headless, look at the screenshots critically, then push it to `main`.
- Write it up at the end: STATUS, PLAYTEST from round 64, OPEN_QUESTIONS from #538, DESIGN as built, MORNING, and this file.

## Just finished: Session 28 (Level & Encounter Designer + AI Programmer): the sawmill, the chainsaw, the workbench

**Status:** all of it is on `main` and on `ccr-bb490e1e-s6lk6t`, in five commits (one per batch, then the write-up). 1083 tests pass and the build is clean. Checked headless; **none of it played on the tablet**. Aaron's answers at the start: no notes yet; go with my three defaults (what happened at the mill; loggers get up first, then the agents; Tom carries all three melee weapons). For Aaron: PLAYTEST rounds 60-63; OPEN_QUESTIONS #510-537; MORNING.md.

**Done, by batch** (STATUS "Session 28" has the detail):
1. **The set** (`render/sawmillModel.js`, `world/SawmillSite.js`, `config.sawmill`).
2. **The chainsaw** (`combat/Chainsaw.js`, `combat/chainsawState.js`, `config.chainsaw`).
3. **The workbench** (`config.station.workbench`, `base/Station.js` `benchOffer`).
4. **The beat** (`encounters/Sawmill.js`, `data/sawmill.json`), with a logger zombie look.

**Not done or not checked:**
- **The tablet**, for all of it. The set is about 25,000 triangles in six draw calls; then sixteen dead.
- **A real fight played by hand:** the headless runs killed the waves by debug. The wave sizes and timings are guesses (#529), and so are the chainsaw's numbers (#517-522).
- **The killdozer** isn't built, so the head saw is a card and a lore item, as the cowcatcher and Milo's horn are.
- **The workbench** only sharpens the chainsaw (DESIGN's idea of Sheriff's upgrades there is open).
- **The sounds** are placeholders (synthesised), like every sound in the game.

**To carry (Session 28):**
- **Dead bodies that get up:** build each with its own `SetBuilder`, bake them one after another into one mesh and remember each one's run of vertices (`risers[i].start`, `count`). Folding a body away is setting that run of positions to zero (`hideRiser`); a copy of the laid-out positions puts them back (`showRisers`). The encounter spawns a zombie with `rise: true` at the body's spot.
- **Grime blacks out anything lying on the ground:** `bakeParts`'s `baseAt` darkens everything within `grimeHeight` of the ground. The sawmill's is 0.16 for that reason; the risers bake with no `baseAt`.
- **Model +x is the walker's left** in a set placed with `CrashSite.toWorld` and a path frame's yaw. A cutscene anchor's x is the walker's right, so a sweep's camera x is the model's x negated (`sweep.sawmill`).
- **A weapon with its own trigger:** give it a kind `Weapons.updateFiring` skips (`thrown`, `saw`) and run it from its own system after `combat.update` (the order matters: `Weapons` resets `player.moveMultiplier` each frame, so a system that slows Tom takes the `Math.min` afterwards).
- **A second held engine note:** `Sfx.engine(on, speed, throttle, voice, boost, channel)` keeps its nodes under `channel`; `Sfx.saw(on, rev, load)` is the chainsaw's. A voice's `boost` can be negative (it bogs down in a cut) with `boostOpen` for the filter.
- **A zombie look without new art:** `config.zombies.texture.looks.<name>` with `as: '<variant>'` borrows that variant's sprite blocks; `hairs` limits the hairstyles; its own `shirt` / `trousers` palettes are added to the palette table. It needs a `variants.<name>` (health) and a table in `data/loot.json` (a test checks).
- **A station fixture you can use:** add it to `stationLayout`'s `furniture` (it gets a collider), draw it in `render/stationInterior.js`, and offer it in `Station.pickInteraction`. An offer with `stroke: seconds` plays `fileStroke` on that beat while X is held.
- **A caption that isn't the family or the Caller:** a `dialogue.json` line with `channel: "caption"` and a speaker in `config`'s speakers (`dispatch`), played with `dialogue.play(id)`.
- **A HUD state set after the line that reads it throws** (the headless run caught `sawText`): the unit tests don't draw the HUD, so run a headless pass after touching `ui/Hud.js`.
- **My headless harness** (the scratchpad, not kept): Playwright from the global install; `document.removeEventListener('pointerlockchange', game.onPointerLockChange)`; `startScreen.activate('skip')`; cancel the loop and step `game.update(1/30)`; draw with `game.renderer.render(dt)`; hold an action by wrapping `input.isDown` (`held.add('attack')`); look from a model point to a model point with `player.teleport` and `player.yaw = atan2(-dx, -dz)`; kill a wave with `enemies.damage(z, 9999, ...)`; Save and Continue as `saveAndQuit()`, wait for the reload, `startScreen.activate('continue')`.

## Before that: Session 27 (Level & Encounter Designer + AI Programmer): the railway cutting, the spike maul, dynamite

**Status:** all of it is on `main` and on `ccr-32834d0b-9inowu`, in six commits (one per batch, the family's lines, then the write-up). 1031 tests pass and the build is clean. Checked headless; **none of it played on the tablet**. Aaron's answers at the start: skip his notes until the big play-test, the defaults, dynamite blows up in your hand, scarce, the sawmill next, and "detailed work rather than finish early; fun comes first". For Aaron: PLAYTEST rounds 57-59; OPEN_QUESTIONS #488-509; MORNING.md.

**Done, by batch** (STATUS "Session 27" has the detail):
1. **The cutting and the train:** the banks in the ground (`world/railCutting.js`); the set (`render/railwayCuttingModel.js`, `world/RailwayCuttingSite.js`).
2. **The spike maul** (`config.weapons.spikeMaul`, the cleave, `smashPose`).
3. **Dynamite** (`combat/Dynamite.js`, `combat/dynamiteFlight.js`).
4. **The beat** (`encounters/RailwayCutting.js`, `data/railwayCutting.json`), then the family's lines on the hand-ins.

**Not done or not checked:**
- **The tablet**, for all of it. The set is 23-34k triangles, depending on the seed's banks, in one draw call plus about ten small ones; then 17 dead and the dynamite's fireballs.
- **A real fight played by hand:** the headless runs killed the waves by debug. The wave sizes and timings are guesses (#506).
- **The killdozer** isn't built, so the cowcatcher is a card and a lore item, as Milo's horn is.
- **Dynamite elsewhere:** only the powder store gives it so far (the mineshaft is meant to as well).
- **The sounds** are placeholders (synthesised), like every sound in the game.

**To carry (Session 27):**
- **Changing a clearing's ground:** a pure module that gives a lift at (x, z), added in `GroundField.heightFormula` after the railway's grade (`world/railCutting.js` `liftAt`; `GroundField.cutting` holds its frame). Everything that asks for the ground's height follows it. The ground's grid is 4 m, so shapes need to be 8 m or more across; dress the faces with set pieces laid on the real slope.
- **Rooms in the world** (not interiors): `player.setPlatform({ room, aboard: true, x, z, y, hx, hz, rx, rz, fx, fz, roofY, blocks }, x, z)` keeps Tom inside a box with blocks (the coaches). `setPlatform(null, x, z)` puts him back on the ground. `RailwayCutting.board` and `leave` show how.
- **A heavy melee weapon:** `swing: 'smash'` in its config uses the view model's `smashPose` instead of the slash. `cleave`, `cleaveKeep`, `slowSeconds`, `shake` and `thudShake` are all config. `weapon:swing` and `weapon:hit` now carry `id` (the director's noise and the sounds use it).
- **A thrown weapon:** `kind: 'thrown'`. `Weapons` doesn't fire it; its own system reads RT (`combat/Dynamite.js`). `Weapons.setSlot(id, present)` keeps it in hand while there's something to throw.
- **Something that goes up when it's knocked:** `game.dynamite.addHazard({ x, y, z, r, h, blast, onBlow })`. It's a target for shots and swings, and nearby blasts chain into it. `removeHazard(h)`.
- **Extra targets** (`weapons.extraTargets`) take melee swings too, and the maul's cleave can catch them.
- **The view model's muzzle flash** now needs a `muzzle` on the model (a weapon without one never flashes).
- **My headless harness** (the scratchpad, not kept) is Sessions 25-26's: Playwright from the global install, presses through a wrapped `input.readKeyboardMouse`, `game.update` stepped by hand, then `game.renderer.render(dt)`. New in this session: close the night forecast with `nightWatch.forecastDue = false; nightWatch.closeForecast()` after `skipToPhase`; the torch with `flashlight.setOn(true)`; and Save and Continue as `saveAndQuit()`, wait for the reload, then `startScreen.activate('continue')`. Mind the cutting's boulders when lining up a test shot.

## Before that: after Session 26 (Aaron's asks)

1. **Start from a story point** (debug menu, first section; `debug/storyStart.js`): the outpost cleared (the compound to explore, or explored). It builds on Skip intro, sets the flags and loads each opening encounter's end state through its own `loadState`. Add later start points the same way (the plane's end, Junie home) when they'd help testing.
2. **Milo redone** (`render/miloModel.js`): the clown a baggy, ruffled, wild-green-haired creepy clown with glowing eyes and too-long fingers, 1.45 m (a foot shorter: funnier); the man in loose clothes with a belt that fits, **1.75 m** (Aaron: it'll be funnier, trust him). The figure kit's masses take a `lo` flag (coarse spheres, for many small pieces). OPEN_QUESTIONS #476-479.
3. **Milo's barn** (`render/miloBarnModel.js`, `world/MiloBarnSite.js`, `encounters/MiloBarn.js`, `config.milosBarn`; PLAYTEST round 56; OPEN_QUESTIONS #480-487): the siege, the car gates, the act, thrown out for shooting him, the morning after, the donkey's stare. Notes for whoever touches it:
   - The barn's model space has **+x on the walker's left** (three.js turns +z ahead with +x left); its config is in the frame (x right), negated in the model; `MiloBarnSite.modelToWorld()` and `site.at(x, z)` (frame) convert.
   - The swinging cars keep their collider keyed in the grid at the hinge with a reach covering the swing (`SpatialGrid` never moves an entry): copy that for anything else that moves.
   - The encounter's timers run on game time (`later()`), not `setTimeout`.
   - Not checked: the tablet; a long stay at the barn at night by torch.

## Before that: Session 26 (on its own, Aaron at work): Junie taken, the Caller, the old church, the stairs, Junie home

**Status:** all of it is on `main` and on `ccr-0f2c285b-r1djeq`, in six commits (one per batch, then the write-up). 976 tests pass and the build is clean. Checked headless; **none of it played on the tablet**. For Aaron: PLAYTEST rounds 51-55; my calls: OPEN_QUESTIONS #449-475; MORNING.md.

**Done, by batch** (STATUS "Session 26" has the detail):
1. **Junie is taken** (`encounters/JunieTaken.js`): both plane endings end at dawn (driven off, the radio's smashed mid-line: `plane.radioSmashed`); Junie gone from home, her rabbit on the bunk; the family's account (radio, or face to face at home and the spare handset); the south path camera's clip (`clip.junieTaken`); Find Junie. Head south.
2. **The Caller and comms in the south** (`story/Comms.js`, `story/Caller.js`, `ui/RadioStatus.js`, `render/wrongFog.js`): the comms line with hysteresis, Ellen's warning, NO SIGNAL; 25 draft lines in the family's voices over the radio and from the trees (positional, with which way); the tell; the fog that moves wrong.
3. **The old church and the time capsule** (`render/oldChurchModel.js`, `world/OldChurchSite.js`, `encounters/OldChurch.js`): the set; the sweep; the Caller inside the church and the cracked bell; the plaque, the stones, the dig, the copper box, the 1903 account with Amos Pruitt's drawing (`ui/paperDrawings.js`); the stairs on the map.
4. **The stairs, the place beyond, Junie home** (`render/stairsModel.js`, `world/StairsSite.js`, `encounters/Stairs.js`, `encounters/PlaceBeyond.js` promoted): the first sight, the climb, the place beyond's look and Junie's voice, the find, Junie following, the homecoming.
5. **Checked headless:** each batch on seeds 1234 and 7; the whole stretch on both seeds with Save and Continue after every beat; no page errors.

**Not done or not checked:**
- **The tablet**, for all of it (the church is about 15,000 triangles; the place beyond's look is the spike's draw calls, recoloured).
- **The fog that moves wrong by torch at night** (checked by day, and by the numbers).
- **The sounds** are placeholders (synthesised), like every sound in the game.
- **The Blessing** (`blessingBuried`) ends the Caller's hold on the south: nothing sets it yet (M12, the Bigfoot cave).

**To carry (Session 26):**
- **The radio's reach is `game.comms`** (`ok`, `dead`, `south`). A family line over the radio is dropped when it can't reach (`Dialogue.deliver`, `Comms.blocks`). A line with `caller: true` always comes through and shows the tell; give the Caller's lines `callerPool` (`radio`, `trees`, `beyond`, `beyondLoop`) to put them in its pools.
- **Someone not at home:** `Station.setPresent(i, present)` (figure and collider) and `Dialogue.absent(speaker)` (their face and radio lines; captions on clips still show).
- **A call from a place:** `game.caller.callFrom({ x, z }, lineId, 'From inside the church')` (the voice, the line with its direction, the fog).
- **The fog that moves wrong:** set `atmosphere.wrongFog` to `{ id, x, z, tx, tz, inhale, exhale, radius, speed, amount, reverse, gather, spread, bank }` (or null); `Caller.fogAt(t, cfg)` gives the timing.
- **A paper can have a drawing:** a page's `"drawing": "<id>"` (`ui/paperDrawings.js`, inline SVG). New paper kinds: `plaque`, `rubbing`, `letter1903`.
- **A set:** `render/setBuilder.js`'s `SetBuilder` (the crash site's Builder, shared). A world site module places it in its clearing (`world/OldChurchSite.js` is the shortest example) and adds its key to `config.landmarks.built`.
- **A secret clearing's name:** `hiddenAs` and `revealedBy` (a flag) in `encounters.json`; lift its fog with `mapUi.fog.reveal(x, z, r)`.
- **The place beyond in the story:** `placeBeyond.enter({ story: true })`, `leave()`; it emits `beyond:found` { x, z, yaw, dy } (dy puts a cutscene anchor on the pocket's floor, which is far below the ground).
- **A follower:** `encounters/Stairs.js` `followStep` and a one-person `FamilyRenderer` (Junie walking home).
- **Cutscene timing:** time a scene's lines to their reading length (letters at 45 a second, plus 1.4 s, plus 0.28 s a word, plus the 0.25 s gap), or the captions lag behind the action. Session 26 placed each line after the last one's length and hung the moves off them.
- **Start from a story point** (debug menu, first section; `debug/storyStart.js`, Aaron's ask after Session 26): "Outpost cleared" (the compound to explore, or explored). It builds on Skip intro, sets the flags (`OUTPOST_CLEARED_FLAGS`) and loads each opening encounter's end state through its own `loadState`. When a later beat is done, add the next start point the same way (the flags, the encounters' states, what Tom carries, where he stands).
- **My headless harness** (the scratchpad, not kept): Session 25's (draw with `game.renderer.render(dt)`, presses by wrapping `input.readKeyboardMouse`), plus Playwright loaded from the global install (`createRequire('/opt/node22/lib/node_modules/')`), `saveContinue()` (save and quit, wait for the reload, re-wrap, Continue), and waiting on cutscenes long enough (a 54 s clip outlasts a 40 s wait).

## Before that: Session 25, Aaron's play-through list, the giant moths, the crashed plane

**Status:** all of it is on `main` and on `ccr-c4151e90-199ypg`, in eight commits (one per batch). 936 tests pass and the build is clean. I checked it headless, but **none of it has been played on the tablet**. For Aaron: PLAYTEST rounds 42-49; my calls: OPEN_QUESTIONS #412-445; MORNING.md. Aaron's notes as he gave them are in this file's previous version (commit 7f5de33).

**Done, by batch:**
1. **Quick fixes:** no aid box prompt at full health; A / Enter closes the night forecast (`NightWatch.handleDismiss`, before the player reads the press); the mutant wakes at 2 m; cutscenes: no noise carries and distant chasers forget Tom (`EnemyManager.quiet`, `forgetPlayer`); Tom's head stays under a room's roof (`Player.updateVertical`); the donkey's and the pony's ears attached.
2. **Cameras, sound, dressing:**
   - the tower's UFO (`day1.tower`);
   - the gas station's west sweep;
   - `witchRush`;
   - Earl's tape in the VCR;
   - the pole sign moved off the power line;
   - Earl's signs: `fitText` and duller paints;
   - **nothing on the roads**: `placeVehicles` refuses the asphalt; the wrecks are on the shoulder; C-7 moved; `tests/vehiclesOffRoad.test.js`.
3. **Vehicles:**
   - the ute's gun dips to -0.8 over the sides (`pitchFloor`); no hands on its wheel;
   - duller, wider lamps (numbers only);
   - **the dozer breaks loose rocks** (`Terrain.breakRock`; `LandClearing.rocksNear` / `breakRock`, saved as `clearing.rocks`);
   - a winched car stops short of the dozer (`Dozer.carClear`).
4. **Every gun carried:**
   - `Weapons.take` always carries; `rack` and `belt` are kept empty, and old saves hand their guns back.
   - The gun-choice panel is deleted.
   - **The weapon cross** (`ui/WeaponCross.js`, `config.weapons.cross`). Round 2, after Aaron played it: RB / LB / the wheel rotate through the kinds (`Weapons.rotate`, `config.weapons.rotation`), each kind bringing out its last pick. The camp now sits round its heat shield, and the debug menu has an Enemies section with tabs (PLAYTEST round 50).
   - The rack is decoration (`weapons.found`).
5. **Models:** Milo redone to `docs/reference/milo-lone-clown.jpg` (`WRIST`, `dotAt`, the smock, the wig dome, the collar, the shoes; 1.75 m); trousers for the belted grey (`KIT_STAGES.trousers`).
6. **The survival camp:** the `leanto` kind in `CampsiteProps`, `props.reflector`, `props.tripod`; colliders for both; "shelters" in the lines.
7. **Giant moths, a debug spike** (`ai/Moths.js`, `config.spikes.moths`): the cloud, darts, nips; extra targets; death and corpses; leaving.
8. **The crashed plane** (`encounters/CrashedPlane.js`, `config.crashedPlane.encounter`):
   - the standoff (`plane.standoff`, the world running), the quick draw, the hop into cover and the shootout;
   - the drops and the pilot's log (`papers.json` `pilotLog`), the cell fitted at the fence box (`Station.fitPlaneCell`);
   - the signal flare (`plane.flare`) and the Mothman (`Flyer.send({ script, story })`);
   - the 10% floor, then `plane.blackout` and the wake at dawn, or he's driven off.
   - Flags `planeStandoff` to `planeDone`, and `mothmanMet`. Objectives cover it.
9. **Checked headless:**
   - the plane end to end on seeds 1234, 7 and 4242 (quick draw and shootout);
   - Save and Continue at each step of it;
   - an opening smoke run on seeds 1234 and 7 (new game, tower, every place's arrival, a night): no page errors.

**Not done or not checked:**
- **The tablet**, for all of it: frame rate with a moth swarm, at the plane, and the weapon cross by touch.
- **A full opening play-through** like Session 23's: this session's was a smoke run (arrivals by teleport).
- **The grey's model** holds a shotgun but drops the pilot's pistol (#438).
- **Pistol sounds:** there's no own sound for the pistol in Tom's hands (it uses the existing gun sounds).

**To carry (Session 25):**
- **The debug menu has tabs** (`menu.tab(DEBUG.enemies, ENEMY_TABS.x)`). Every spawn-anywhere enemy tool goes in the Enemies section's tab for it.
- **A new encounter** on a spine place: copy `CrashedPlane`'s shape. That means `init(ctx)` with a `hud`; `update(dt, controls, playing, canInteract)`; flags for every beat; `reset()` from the flags, called in `init`, on `player:respawned` and after `Game.applySave` (Game calls `plane.reset()` there).
- **Named cutscene anchors** an encounter sets: `cutscenes.namedAnchors.set(name, () => ({ x, z, yaw, dy }))`. A first-person cutscene with `"world": "run"` lets the encounter's own actors move while it plays.
- **Skipping the clock** (`Game.skipToPhase`) runs every phase event on the way, so close the forecast after it (see `skipToDawn`).
- **The weapon cross holds the world** like the pause menu. Anything new that pauses should check `weaponCross.isOpen` where it checks `pauseMenu.isOpen`.
- **A gun found** goes straight to Tom (`combat.giveWeapon`); there's no choice panel any more.
- **My headless harness** is in the scratchpad (not kept). It's Session 23's approach with two changes: draw with `game.renderer.render(dt)`, not `game.loop()` (which restarts the requestAnimationFrame loop); and inject presses by wrapping `input.readKeyboardMouse`. Close cards with `card.choose('keep')` and papers with `paper.close()`.

## Before that: Session 24, Graphics Engineer / Technical Artist: models for the next stretch

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

### Gotchas and decisions to carry

- **Config and data first** (rules 5 and 9), complete files, small modules. **No lights added or removed while playing.** One idea at a time over the radio.
- **The map:** the spine's positions are data (`storySpine.json`); changing one moves it on every seed, so **bump `SAVE_VERSION`** when the map moves. The cave and the road north are cluster (fixed seed) land. Nothing but the railway cutting sits on the railway.
- **Interiors:** a new interior is one `define()`; its space goes in the pocket under its entrance (Tom's x, z stay the entrance's, so the minimap and the cordon checks are right). Anything that spawns enemies inside one must give them `space: <id>`, or the tier pass sends them abstract. Its light is `light: { ambientDay, ambientNight, ambientColor, fogColor, fogNear, fogFar }` (the scene's materials expect outdoor-strength light: the shelter needs ambientDay 3.2 to read).
- **Saving:** use `collectSaveOutside()` for any new save path.
- **Things that need the shovel ask `combat.weapons.has('shovel')`.** Guns found later go through `combat.giveWeapon(id, rounds)`. A special item found later goes through `game.card.show(...)`. Story-gated loot uses `"after"` in `loot.json`.
- **Demo mode** (`demo/DemoMode.js`): anything new that runs on its own each frame (story beats, the witch, NightWatch) must stay off while `game.demo.active`; Demo mode swaps `game.saves` for a store that keeps nothing, and `endRun()` respawns instead. Its time of day is set straight (`setTime`), never through phase events.
- **Dynamic resolution:** `Renderer.setScale()` only marks the size dirty; the resize happens at the start of `render()`. Never resize the canvas between a draw and the browser showing it (that was the flicker).
- **Spikes are debug only** (the Spikes category): `PlaceBeyond`, `Flyer` and the dozer's parts aren't in the story. The camera's far plane closes in to the fog inside an interior, so anything meant to be seen in one must sit within `fogFar` + 20 m of Tom.
- **Guns found later** go through `combat.giveWeapon(id, rounds)`; Session 25: always carried (the gun choice is gone).
- **Dawn's flags:** anything that saves on `phase:dawn` must call `progress.settle()` first (`Game.autosave()` does).
- **The rack's guns** are placeholder shapes from data (`config.station.gunRack.show`, `render/rackGuns.js`): a new rack-able gun needs an entry (a test checks every long gun and sidearm has one). Session 25: the rack shows the guns found (`weapons.found`); the weapon cross draws its icons in `ui/WeaponCross.js` `drawIcon()`.
- **My headless harness** (Sessions 19-23; Session 23's is the fullest: it drives the opening start to end, `scratchpad/h/lib.mjs` style): stop the page's loop (`cancelAnimationFrame(game.rafId)`) and step `game.update(1/30)` yourself, rendering once at the end; inject actions by wrapping `input.readKeyboardMouse` (add to `input.down`) and movement by wrapping `input.computeMove`; **remove `game.onPointerLockChange`** first (headless loses the mouse lock and the pause menu opens, silently stopping everything); Save and quit reloads the page, so wait for `load`, re-wrap, then `startScreen.activate('continue')`; carry a save between runs by dumping `localStorage` and restoring it in `addInitScript`. Older notes: Playwright on `localhost:5173?seed=…` with `game.startScreen.activate('skip')` (or `'new'`, then stop cutscenes until none is active); daylight with `game.skipToPhase('day')` and `game.clock.setPaused(true)`; debug items by label (`game.debugMenu.categories[].items[]`: `label` may be a function, call `onSelect()`); `game.player.teleport()`; swiftshader runs at about 5 frames a second, so hold keys with `waitForFunction` on the state; restart the dev server after editing a module you also import from the page. Demo mode: `game.startScreen.activate('demo')`, then `game.demo.send(n)`, `game.demo.setTime('night')`; the zombies' cost is `game.combat.enemies.simMs` and `lodLine()`.

### Open questions for Aaron

- **Session 28:** #510-537 (the set #510-516, the chainsaw #517-525, the workbench #526-527, the beat #528-537).
- **Session 27:** #488-509 (the cutting and the train #488-492 and #507, the maul #497-499, dynamite #500-505 and #508, the beat #493-496, #506 and #509).
- **Session 26:** #449-475 (Junie taken #449-456, the Caller #457-461, the old church #462-468, the stairs and Junie home #469-475).
- **Session 25:** #412-445; #446-448 settled.
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
You are picking up Witch Hunt after Session 28 (the sawmill, the chainsaw, the station's workbench). Read HANDOVER.md first: its top section, "DO THIS FIRST", is the plan: Aaron's big play-test notes (Milo's barn, the Junie stretch, the crashed plane, the railway cutting, the maul, dynamite, the sawmill, the chainsaw, the workbench), then the next optional encounter (the moonshiners' holler or the mineshaft: Aaron's pick), with defaults for its open points.
Ask Aaron for his notes first if they aren't here (rule 10) and fix those before building. Then build the next encounter in batches: test each (npx vitest run, npx vite build), check it headless (look at screenshots critically and fix what reads badly), and push it to main before the next. Log your calls as numbered OPEN_QUESTIONS rows from #538.
Aaron's direction: "minimum viable product is the enemy of fun", and "detailed work rather than finish early; fun comes first". Build each beat as the scene it should be: a real set, staged cutscenes, sound for every moment that matters, lines that carry the dread.
Read docs/DESIGN.md (the encounter's section, "Weapons", and "Men in Black" or "Giant moths" as it needs), STATUS.md (Session 28 and after) and the code HANDOVER.md points to, as each batch needs them.
Keep Aaron's rules: config and data first, complete files, small modules, no lights added or removed while playing, dull colours (the glare rule), one draw call where you can, tests for what you build, saves through story flags.
Finish with the write-up (STATUS, PLAYTEST rounds from 64, OPEN_QUESTIONS, DESIGN as built, MORNING, HANDOVER rewritten for the session after). If you run out of room, say at the top of HANDOVER.md exactly where you stopped.
```
