# Handover

## DO THIS FIRST: Session 27/28: Aaron's notes on Session 26, then Milo's barn and the railway cutting

**Where Session 26 stopped: nothing left over.** All four batches of its plan are built, tested and on `main` (Junie taken; the Caller and comms in the south; the old church and the time capsule; and Session 27's planned batch, the stairs, the place beyond and Junie home), with the write-up. So the next session starts on Aaron's notes, then moves on to **Session 28's work** from DESIGN.md's session order: the two optional encounters of M11, **the railway cutting** and **Milo's barn**.

**1. Ask Aaron first** (rule 10): his notes on PLAYTEST rounds 51-55 and on my calls, OPEN_QUESTIONS #449-475. Fix the small ones first. The ones I'd most like his eye on:
- #452: the trail-camera clip of Junie being taken is 54 s. Too long?
- #454, #461: the Caller's tell, and how subtle the fog that moves wrong is.
- #462-464: the names (Hemlock Gap, Mount Zion, **the Keeper** for Bigfoot) and the 1903 texts (drafts).
- #469: the stairs "lit by nothing" (an unlit material). Eerie, or just unlit?
- #474: Save and quit with Junie following skips the walk home.
- The frame rate on the tablet at the old church and in the place beyond's new look.

**2. Then Session 28: the railway cutting and Milo's barn** (DESIGN.md "The railway cutting: the 1903 line", "Milo's barn"; the M11 row of the milestones). Both are optional encounters the seed deals (`config.map.optional`); each gives a killdozer part. Work like Session 26: config and data first, a set as one baked mesh (`render/setBuilder.js`), a beat module on `CrashedPlane`'s shape, flags for every beat, cutscenes staged in data, a sound for every moment, tests, headless screenshots looked at critically, a push to `main` per batch.

Defaults for the open points, if Aaron isn't there to ask (log each as an OPEN_QUESTIONS row from #488):
- **The railway cutting:** the last train of 1903 (a rusted locomotive, a tender and two carriages swallowed by the forest, full of old belongings), on the line where the seed puts it. **The railroad spike maul** for the melee bar (its slot is already on the weapon cross: slower than the shovel, hits much harder). **Dynamite** from the old powder store: the first handheld throwable (hold to light, throw; it sweats, so a hit blows it in your hand: a new small system, test it well). The killdozer part: the locomotive's **cowcatcher and boiler plate** (armour). **The radio:** the line is south of the comms line, so it's the Caller's ground: a call from inside a carriage, in the voice of someone from 1903 (Amos Pruitt calling for Levi?). Its tie to the time capsule: the luggage of the eleven, tagged with the names on the church's stones.
- **Milo's barn** (the models are built, and Milo redone after Session 26 to Aaron's notes: the baggy ruffled clown, wild green hair, glowing eyes; the man's loose clothes and a foot shorter (OPEN_QUESTIONS #476-479); `render/miloModel.js`, `render/barnAnimals.js`; HANDOVER's Session 24 notes have the story's details: the heat lamp's amber light, the python's tank, the knife-hole outline, twelve paces, right shoulder, left shoulder, over the head, each knife humming a note, the chest of blankets, his white van with a small wooden crucifix on the mirror, his voices and his chuckle). The approach through the dead, the car gates opened with one hand, the act (hold still for three knives; shoot and he deflects it, "I was in character!", out with no reward), the warm line ("Three for three. You didn't flinch."), the morning reveal ("Instant. Sorry."), the donkey's stare (later at the station's treeline), the turkey's look, the sign. **His killdozer part** (open in DESIGN): my default, **his calliope horn** bolted to the dozer, playing his circus tune and drawing every dead thing to it (a lure for the endgame). **The year:** Witch Hunt is years before the story, so the donkey can be the same one. **The radio:** Wyatt thinks he's the coolest thing ever; Ellen is quietly horrified. Where the barn is depends on the comms line: north of it the family talk; south of it, only the Caller (and Milo).
- For building and testing, a debug item that deals each optional onto the map (they're dealt by the seed, so not every run has them).

**How Session 26 ran, for the next autonomous session:** the same headless harness (below), each batch's beat driven end to end on seeds 1234 and 7, then the whole stretch with Save and quit and Continue after every beat. Most of what the screenshots caught was staging: figures too far from a camera, a camera inside a tree, two prompts on one spot, captions timed shorter than they take to read (time a scene's beats to `config.subtitles`: letters at 45 a second plus 1.4 s plus 0.28 s a word).

**After Session 26 (Aaron's asks, in order):** a debug start from the outpost cleared; Milo redone (the baggy creepy clown, a foot shorter; the man stays 1.75 m); then **Milo's barn built** (`encounters/MiloBarn.js`; PLAYTEST round 56; OPEN_QUESTIONS #480-487). So of Session 28's work only **the railway cutting** is left: do it next, after Aaron's notes on the barn.

## Just finished: Session 26 (on its own, Aaron at work): Junie taken, the Caller, the old church, the stairs, Junie home

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

## Just finished: Session 25, Aaron's play-through list, the giant moths, the crashed plane

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
You are picking up Witch Hunt where Session 26 stopped. Read HANDOVER.md first: its top section, "DO THIS FIRST", is the plan: Aaron's notes on Session 26 (PLAYTEST rounds 51-55, OPEN_QUESTIONS #449-475), then Session 28's work, the railway cutting and Milo's barn (the two optional encounters of M11), with defaults for their open points.
Ask Aaron for his notes first if he's there (rule 10); if he isn't, take the defaults, log each call as a numbered row in OPEN_QUESTIONS (from #488), and work through the batches in order. Test each batch (npx vitest run, npx vite build), check it headless (look at screenshots critically and fix what reads badly), and push it to main before the next.
Aaron's direction: "minimum viable product is the enemy of fun." Build each beat as the scene it should be: real sets, staged cutscenes, sound for every moment that matters, lines that carry the dread (and, at Milo's barn, the comedy).
Read docs/DESIGN.md ("The railway cutting: the 1903 line", "Milo's barn", "Weapons", "The radio"), STATUS.md (Sessions 24 and 26) and the code HANDOVER.md points to, as each batch needs them.
Keep Aaron's rules: config and data first, complete files, small modules, no lights added or removed while playing, dull colours (the glare rule), one draw call where you can, tests for what you build, saves through story flags.
Finish with the write-up (STATUS, PLAYTEST rounds from 56, OPEN_QUESTIONS, DESIGN as built, MORNING, HANDOVER rewritten for the session after). If you run out of room, say at the top of HANDOVER.md exactly where you stopped.
```
