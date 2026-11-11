# Handover

## DO THIS FIRST: Session 26 (+27 if there's room): Junie taken, the Caller, the old church, the place beyond, Junie home

**How to work this session (Aaron, Nov 11):** Aaron is at work and the session runs on its own. **Don't stop to ask anything.** Every open design question below already has a default; take it, build it, and log the call as a numbered row in OPEN_QUESTIONS (from #449). Work through the batches in order. Each batch is **tested (`npx vitest run`, `npx vite build`), checked headless (screenshots of anything visual), and pushed to `main`** (and to the session's branch) before the next. Write up at the end. If you run out of room, say exactly where you stopped at the top of this file.

**Aaron's standing direction: "minimum viable product is the enemy of fun."** Build each beat as the scene it should be, not the least that technically works:
- a real set, not a signpost;
- a cutscene with staging and timing, not a toast;
- sound for every moment that matters;
- lines that carry the dread;
- the radio used as a weapon against the player.

Spend the effort where the player feels it. Take a screenshot, look at it critically, and fix what reads badly before moving on, as Session 25 did.

**Aaron's notes on Session 25 (Nov 11):**
- The giant moths and the vehicle fixes worked great.
- The crashed plane's alien cutscene is a good placeholder. He'll direct it better later; leave it alone this session.
- The rotation order (pistols, rifles, shotguns, the shovel) is right.
- The fire wall stays where it is.
- Melee weapons live in the weapon cross's bottom bar.
- Nothing else came back: treat PLAYTEST rounds 42-50 as passed unless something breaks.

### Where the story stands

Tom fights the Mothman at the crashed plane (`encounters/CrashedPlane.js`) and either:
- **blacks out** at the 10% health floor and wakes at the wreck at dawn with "Dawn. Your radio's quiet"; or
- **drives him off** (Ellen's line; the clock runs on).

Both set `mothmanMet` and `planeDone` and emit `plane:done`. The story stops there today.

### Defaults taken for this session (the design's open points)

1. **Junie is taken in both endings.** In the drive-off ending, make the Mothman's last strike smash Tom's radio on the way out: static, a line cut off, and the HUD's radio dead. Tom heads home in silence and the night passes: skip to dawn as `wake()` does, or play the night if he's home before dusk. Either way the family couldn't reach him, so Junie taken plays the same.
2. **The Caller is never seen.** Its only signs are a voice and fog that moves when it shouldn't. It has no model and can't be shot.
3. **The comms line.** Comms in the south cut out on a config line south of the cordon (about halfway from the crashed plane to the old church), with hysteresis. Ellen warns once as Tom nears it.
   - South of the line, family radio lines don't play.
   - Instead the Caller speaks over the radio, in the family's voices: the same speakers and subtitles, with a **visible tell the player learns**, such as a faint wrongness in the subtitle colour or a glitch.
   - North of the line the family are back.
   - Until the Blessing is buried (a later session), every voice down south is the Caller.
4. **The spirit's name.** The 1903 town's name for the nature spirit (Bigfoot) is yours to invent. Mark it draft. The time capsule's texts are drafts too: write them well.
5. **The stairs follow the capsule.** Tom learns of the stairs from the capsule: the 1903 account says where their people were taken, a staircase in the woods. The stairs' clearing goes on the map then.

### The batches

**Batch 1: Junie is taken** (DESIGN.md "Junie is taken").
- **The wake:** after either ending, the family's account.
  - The radio comes back once Tom's near home, or at once if he's within range. Ellen is frantic, Wyatt guilty, and Junie's line slot is silent.
  - Then a **trail-camera clip** of what happened (patched through on D-pad down, like Earl's tape). Night, the family in the trees with torches calling for Tom. Tom's voice answers from the dark, wrong. They split up, one torch goes out, and Junie is gone. Use the existing CCTV look and camera anchors near home.
- **At home:** Junie isn't in the station any more (the family renderer shows two). Her face-to-face lines are gated off, and her room or bed is empty.
- **New goal:** the objective reads "Find Junie. Head south." The family's lines move to "never leave the compound at night again".
- **Flags:** `junieTaken` and `familyAccount`, saved, with `reset()` from flags (the `CrashedPlane` pattern).
- **Tests:** the flags, the gating, the clip's data.

**Batch 2: the Caller and comms in the south** (DESIGN.md "The Caller", "Comms in the south").
- **The comms line** (config; `story/` or `world/`, a pure tested function for north / south with hysteresis). Ellen's warning, once.
- **The Caller's lines:** about 25 draft taunts in the family's voices, Junie's most of all, begging, then calling Tom by name from the trees. Some come over the radio; some are **positional**, a voice from a direction in the woods (3D sound, subtitled with a direction hint).
  - **Rate:** a config rate, more at night.
  - **Never** while a cutscene, paper or menu is up.
- **Fog that moves wrong:** a cheap, eerie effect near a positional call. The ground mist drifts against the wind toward the voice, or a fog bank rolls in from it. No lights added.
- **Visible tell:** the subtitle tell from default 3.
- **Tests:** the comms line, rate limits, never two at once, gating by flags.

**Batch 3: the old church and the time capsule** (DESIGN.md "Time capsule and the old church"; spine key `timeCapsule`, a graveyard clearing at dx -230, dz 565).
- **The set:** one baked mesh with `crashedPlaneModel.js`'s `Builder`.
  - A ruined 1890s clapboard church: a leaning steeple, a broken bell, collapsed pews visible through the gaps, boarded and broken windows, a lychgate.
  - A crooked graveyard: headstones with 1903 dates for the taken, all with the same death date.
  - The plaque on a stone by the capsule's spot.
  - Solid colliders; the glare rule; add it to `config.landmarks.built` so its signpost goes.
- **The beat:**
  - an arrival sweep;
  - the comms cut out on the way;
  - the Caller at its worst here (a positional call from inside the church);
  - read the plaque (a paper);
  - dig the capsule up with the shovel (the existing dig);
  - open it: an inspect card;
  - the 1903 account as a multi-page paper (`papers.json`), with a photograph or a drawing of the staircase. That puts the stairs on the map.
- **Lore:** the capsule is handed in at the ledger, for family lines once comms allow.
- **Flags:** `churchVisited`, `plaqueRead`, `capsuleDug`, `capsuleRead`; `stairsKnown`.

**Batch 4 (Session 27's work; do it if there's room): the stairs and the place beyond, Junie home** (DESIGN.md "Stairs in the woods").
- **The stairs set:** a lone staircase in its off-path clearing (spine key `stairs`), attached to nothing, carpeted and painted like a house's stairs. That's the ranger legend: wrong, clean, lit by nothing.
- **Climbing it** enters the place beyond. Promote the Session 22 spike (`encounters/PlaceBeyond.js`, `world/placeBeyond.js`) from debug to story:
  - **an art pass:** thicker fog, wrongness, the forest slightly off;
  - **Junie's voice** calling down two paths as real positional sound with subtitles;
  - **the silent path:** take it three times in a row to find her; a calling path loops Tom to the start;
  - **the find:** a cutscene;
  - **bringing her home:** she follows Tom back down the stairs (a simple follow, she can't be hurt), and a homecoming cutscene; the family are three again.
- **Flags:** `stairsClimbed`, `junieFound`, `junieHome`.

**Batch 5: check and write up.**
- **Headless play-throughs** on two seeds: from the plane's end, through every new beat, with Save and Continue at each step. No page errors.
- **The docs:**
  - STATUS;
  - PLAYTEST, a round per batch from 51;
  - OPEN_QUESTIONS, a Session 26 section with your calls from #449;
  - DESIGN as built;
  - MORNING;
  - this file, rewritten for the session after: Session 28, Milo's barn and the railway cutting, per DESIGN's build plan.

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
You are picking up Witch Hunt where Session 25 stopped. Read HANDOVER.md first: its top section, "DO THIS FIRST", is this session's whole plan (Junie taken, the Caller and comms in the south, the old church and the time capsule, then the stairs, the place beyond and Junie home if there's room), with every open design question already given a default.
Aaron is at work: this session runs on its own. Don't stop to ask anything. Take the defaults, log each call as a numbered row in OPEN_QUESTIONS (from #449), and work through the batches in order. Test each batch (npx vitest run, npx vite build), check it headless (look at screenshots critically and fix what reads badly), and push it to main before the next.
Aaron's direction: "minimum viable product is the enemy of fun." Build each beat as the scene it should be: real sets, staged cutscenes, sound for every moment that matters, lines that carry the dread.
Read docs/DESIGN.md ("Junie is taken", "The Caller", "Time capsule and the old church", "Stairs in the woods", "The radio"), STATUS.md (Session 25) and the code HANDOVER.md points to, as each batch needs them.
Keep Aaron's rules: config and data first, complete files, small modules, no lights added or removed while playing, dull colours (the glare rule), one draw call where you can, tests for what you build, saves through story flags.
Finish with the write-up (STATUS, PLAYTEST rounds from 51, OPEN_QUESTIONS, DESIGN as built, MORNING, HANDOVER rewritten for the session after). If you run out of room, say at the top of HANDOVER.md exactly where you stopped.
```
