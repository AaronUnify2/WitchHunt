# Handover

## DO THIS FIRST: the build queue (Aaron, Nov 12: items 1-7, then the big play-test)

**Play-testing is paused.** Aaron's words: "Let's build items 1-7... then the big play test will happen." "My favourite is when we play test and design as we go. So I'm entirely happy for you to build in some limited cutscenes/placeholders for the moment." "Could you add a continue story option for each main story encounter to the debug menu." "I'd like to do a dedicated debug and design session for each encounter once the scaffolding is in place."

**So each item is scaffolding, about an hour:** the beat playable from its start to its end, with its flags, goals, lines (drafts) and a debug start point; placeholder sets and short cutscenes are fine; depth, tuning and polish wait for the session Aaron does on that encounter. Six one-off wake-ups, 70 minutes apart, bring this session back for items 2 to 7 (their ids are on this section's last line).

**Each scheduled session:**
1. Read this section and "Just finished". Take the **first unticked item**. If the one before it was left half done, finish that first.
2. Read its DESIGN.md section and what it plugs into ("To carry" below is the working method).
3. **Don't ask Aaron anything.** Build from DESIGN.md. Where it says *(proposed)* or "Open:", take the proposal or the simplest thing that fits, mark new lines `"draft": true`, and log each call in OPEN_QUESTIONS (continuing the numbering) so the encounter's own design session can change it. Never use a blocking question.
4. Tests for the pure parts, one headless run of the beat end to end with a look at the screenshots, then push to `main` (and this session's branch). **`main` stays green:** never push with a failing test or a broken build. What can't be made to work in the hour is left out and listed under "Not done".
5. **A "Continue story" item in the debug menu for the beat** (`debug/storyStart.js`: add the point to `STORY_POINTS` and `laterFlags`, and its placing to `startFromLater`): it puts the run at the start of that beat, everything before it done. The next item starts from the end of this one, so add that end as the next point too.
6. A short write-up: a STATUS section, a PLAYTEST round (what to try, from which Continue story item), OPEN_QUESTIONS, a line or two in DESIGN ("as scaffolded"), a section at the top of MORNING (newest first), and this file: tick the item, note what's placeholder, add to "To carry".

**The queue** (DESIGN.md "The story spine after the outpost"):

- [x] **1. The family's plan and the military's dozer** *(done: `encounters/CordonDozer.js`; ends at flag `dozerHome`, start point `dozerHome`)* (beat 6, the start of 7). At home once Junie's back and Ellen's asked for the cell: the Keeper is Earl's Bigfoot; Earl's maps (the storm shelter's corkboard) point at the cave; the Mothman has him pinned, so: a flare to call it, and the army's dozer with its winch to hold it. Then the cordon strip to the clearing crew's camp (`storySpine.json` `cordonDozer`; set: `render/dozerCampModel.js`, `world/DozerCampSite.js`): the crew's dead, the keys, a battery, and driving the dozer home (`world/Dozer.js`, a spike until now). The quad stays where Tom left it (item 4).
- [ ] **2. The bug-zapper night at the station** (beat 7, stage 1). The fence at 1000; the lure flares in a cutscene; Wyatt's rifle from the tower (proposed: Ellen on the floodlights, Junie calling where it's coming from); the dozer's hook on the Mothman, the winch fight; it falls on the fence, the fence drained to zero; it flies off toward the gas station; Ellen puts its path on Earl's maps.
- [ ] **3. The Bigfoot cave** (beat 7, stage 2). The brush at the road's north end (`world/RoadNorth.js` has the barrier, the brush and the mouth) cleared with the dozer; an interior (tunnels, chambers, dark); eggs and beetles; the lair's moths; the wounded Mothman killed; Bigfoot cut out of the cocoon (`render/bigfootModel.js`); the Blessing buried at the station (`blessingBuried`: +20 security, comms reach the south, the Caller gone); the nature armour.
- [ ] **4. The missing quad and the mega night** (beat 8). The scorched ring where the quad was, its map icon gone; the radio erupting on the way home; about 150 zombies at the station; the Hollow, the Screamer and the Hanged; Ellen's ask for the ship's big core.
- [ ] **5. The crashed UFO and the mothership** (beat 9). The crashed ship's set and its beam; the mothership interior in its own look; the cowboy-drift greys; the core room and the big core; the hangar and the alien quad (`world/AlienQuad.js`); back down the beam; the core fitted at the fence box.
- [ ] **6. The Car Armory and Sheriff** (beat 10, first half). The base's set; Men in Black zombies; the survivors who shoot on sight and the stealth past them; documents 1-5; the loot (the one turret, the restocking explosives crate); Sheriff in his cage; freeing him.
- [ ] **7. The ute chase and the garage** (beat 10, second half). The alarms; the ute out of the motor pool (`world/Ute.js`) with Sheriff on the tray's gun; Sheriff hurt; the three-bay garage at the station, Sheriff living in it, a first list of upgrades, the turret placed.

**Notes from the items done** (what the next item needs to know):
- **Item 1:** the dozer is `game.dozer`, in the story now: `locked`, `saveState`/`loadState`; at the end it stands at home (`dozerHome`) and the holding goal is `zapperPrep` in `Objectives.js` (replace it). The fence's capacity is 1000 once the cell's fitted (`station.state.capacity`). The Mothman at the plane was `flyer.send({ script, story: true, unbeatable: true })` (`ai/Flyer.js`); the dozer's winch is `Dozer.updateWinch` / `winchTarget` (it hooks cars and the dead: the Mothman needs adding as a target). An encounter's lines chain with `"next"`. The "Continue story" points only set flags (they don't clear them): test each from a fresh page. Headless: `startFromLater(g, 'dozerHome')` after importing `/src/debug/storyStart.js`; kill zombies with `enemies.damage(z, 1e6, 'body', {}, z, z)`; hold X by calling the encounter's `updateInteraction(dt, { activeDevice: 'gamepad', isDown: (a) => a === 'interact' })`, with one call where nothing is held between holds.

**After the play-test, not scheduled** (Aaron cut the queue at 7): 8. the killdozer and Ground Zero; 9. the realm of stories (DESIGN says it waits on his design); 10. the hut and the ending joined to the story. Also: a debug and design session with Aaron on each scaffolded encounter; the tablet; audio; achievements; art; balance.

**The wake-ups** (one-shots into this session, 13:19 to 19:09 UTC on Nov 12): item 2 `trig_01TQeubtSGxEwvHb6b2Yd9wY`, 3 `trig_01Nb2vcimKgjuzx1GBJDdGsy`, 4 `trig_017gHy5hdiLb2wb3uEsGPRir`, 5 `trig_016pK14rmwtjx95hRCfNdxV7`, 6 `trig_01JnEnBedDCa2XgxfJ3gbUpS`, 7 `trig_01GrwuQE9K6124tWQgsWNJQB`. The earlier three-hourly task (`trig_018ek1DQMXB7yS3QWqCA1qZF`) is switched off.

## After the queue: Session 34's old plan (Aaron's play-test, then the story)

**Where things stand:** everything to date is on `main` (and `ccr-6a92a61d-p69ruf`). 1272 tests pass and the build is clean. **Aaron is partway through the big play-test.** Two sittings so far (the opening to the place beyond; the place beyond to Junie home): twenty notes, all built (Sessions 32 and 33). The optional places and the mine are still to play.

**1. His notes first** (rule 10). Ask for the next sitting's notes if they aren't in the conversation. He narrates as he plays and changes his mind as he goes: take his last word, and ask where two notes pull apart. If he says "no need to code now", write the notes up as a work list in this file with questions, as Session 32's end did (commit 65bda76). He may also paste answers from the questions page (https://claude.ai/artifact/2DHTACWcCPjqXFAckJ5qB2, #436-645) as "#612: ..." lines: log each in OPEN_QUESTIONS. Fix the small things first. **Open from Session 33** (ask once, or take what his notes say):
- the lines cut from the wake-up scene: any he wants back (#670);
- the wisp of light on the grey's drop: too much of a game marker (#686);
- Junie too dark by day (#678); the fuel can sharing her seat (#681);
- his rewrites of the draft lines (#687, #689);
- the static by ear: can the calling path still be told in the place beyond (#676), and should the Caller's radio lines hiss too (#677).

**2. After his notes, the story's next stretch**, confirmed with him first: DESIGN.md "Build plan" M12, Bigfoot (beats 6-7), its first part: the family's plan and Earl's maps, and the military's dozer on the cordon strip. Where it plugs in:
- **The dozer exists as a spike** (`world/Dozer.js`, `world/dozerParts.js`; debug menu): it drives, shoves cars and trees, and has a winch. It needs its place in the story.
- **Its clearing is on the map:** `data/storySpine.json` `cordonDozer` (beat 7), a placeholder on the cordon strip (`world/cordon.js`).
- **The family's plan** is a scene at home once Junie's back (`junieHome`). Ellen's ask for the power cell (Session 33, `Stairs.updateCellAsk`, flag `cellAsked`) already plays there, 2.5 s after the homecoming: the plan should follow it, not talk over it.
- **Start points for testing:** `debug/storyStart.js` now has the grey down, the plane done, Junie found and Junie home (`startFromLater(game, point)`, `laterFlags`). Add the next one the same way.

**How to work** (as Sessions 26 to 33 did):
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
- Write it up at the end: STATUS, PLAYTEST from round 76, OPEN_QUESTIONS from #691, DESIGN as built, MORNING, and this file.

## Just finished: Session 33 (Level & Encounter Designer + AI Programmer): Aaron's play-through notes, part 2

**Status:** all of it is on `main` and on `ccr-6a92a61d-p69ruf`, in three batch commits and the write-up. 1272 tests pass and the build is clean. Checked headless on seeds 1234 and 7; **none of it played on the tablet, and the new sounds not heard**. For Aaron: PLAYTEST round 75; OPEN_QUESTIONS #669-690; MORNING.md. His notes as he gave them, with his answers, are in this file's previous version (commit 5155fce). His four answers at the start: Save and quit stays at home; trim the wake-up scene; keep the standoff's zoom; keep the quick draw's half second.

**Done, by batch** (STATUS "Session 33" has the detail):
1. **The wake-up scene trimmed; no map in the place beyond or the mine; voices of radio static; the Caller quiet on the walk home.**
2. **Junie's shine, and Junie on the back of the quad.**
3. **The power cell's beat:** the grey's drop seen and said; Ellen's ask after the reunion; the fence-box goal; riding through the gate; the debug start points.

**Not done or not checked:**
- **The tablet**, and any of it played by hand.
- **The static by ear** (the headless browser has no sound): only that the right bursts are asked for.
- **Junie's seat overlaps the quad's fuel can** (#681).
- **The corpse moves on a load:** after Save and Continue the grey lies at the wing's `cover` spot, not where it fell (it always did; the drop goes with it).
- **From Session 32:** the smashed radio's leftover code and data; the ferns in the place beyond.

**To carry (Session 33):**
- **A place with no map:** add its interior id and words to `config.maps.noneIn`. `Game` sets `mapUi.dark` from it each frame; dark also stops the fog of war updating, which anything underground wants.
- **A voice that isn't notes:** `Sfx.staticCall(out, pitch, long)` plays `staticCallPlan`'s bursts. Any other "voice on a dead channel" should use it.
- **Silencing the Caller for a stretch of story:** add the case to `callerQuiet` (pure, tested); `Caller.quiet` gates the timer, `fromTrees` and `callFrom`, and ends a call under way.
- **A figure the torch blows out:** two fixes, both needed: a darker material colour (pass `{ ...cfg.family, albedo }` to its renderer), and a circle `{ x, z, r, base, top }` pushed into the torch's glare check in `Game` (`Stairs.glareCircle`).
- **A passenger on a vehicle:** make the figure the vehicle mesh's child (it pitches and rolls with it), `rotation.y = Math.PI` if the vehicle's front is -z, the `'sit'` pose, and pass `null` as the renderer's look-at (its head-turn works in world space). Keep it at least half a metre behind the rider's eye or the camera goes inside it when he looks round. Put it down beside the rider when he gets off (`stepOffSpot`), never across the vehicle from him.
- **An encounter trigger must be checked on the riding branch too:** `updateFollow` returned early while riding, so the homecoming never fired from the saddle.
- **Something on the ground that must be seen:** an unlit core, an additive shell (`fog: false`), and an additive open cone standing off it; flash it on a timer (`dropAt`). By day at 14 m the core and shell alone were a speck.
- **A line that follows another whoever says it:** chain it with `"next"` in `dialogue.json`; `Dialogue.show` plays the chain (`plane.drop.wyatt`).
- **A line a few seconds after a cutscene, once, surviving a save:** a flag, a countdown that only runs while playing and no cutscene is up, and wait for `subtitles.busy` to clear (`Stairs.updateCellAsk`).
- **Trimming a clip:** rebuild its tracks from the kept lines' reading lengths with a script and splice only that scene's text back into `cutscenes.json` (re-serialising the whole file rewrites 800 lines).
- **My headless harness** (the scratchpad, not kept): as Session 31's, on the dev server (`window.game`). New: import `/src/debug/storyStart.js` in the page and call `startFromLater(game, point)`; listen on `'dialogue:line'` to see chained lines (wrapping `deliver` only sees the first); a third-person shot by moving `player.camera` and calling `renderer.render` without stepping; `page.locator('.minimap canvas').screenshot()`. The subtitle box on screenshots doesn't advance when stepping by hand.

## Before that: Session 32 (Level & Encounter Designer + AI Programmer): Aaron's play-through notes, part 1

**Status:** all of it is on `main` and on `ccr-2ebd0b15-khy2cs`, in five batch commits and the write-up. 1241 tests pass and the build is clean. Checked headless; **none of it played on the tablet**. For Aaron: PLAYTEST round 74; OPEN_QUESTIONS #646-668; MORNING.md. His notes as he gave them are in this file's previous version (commit 30b81cc).

**Done, by batch** (STATUS "Session 32" has the detail):
1. **Small fixes:** the first aid box's prompt, the crossing sign, traps and the quad, the stairs' facing.
2. **The crashed plane:** the arrival sweep and its radio lines, the longer standoff, the pistol, the Mothman who can't be driven off, the power cell a quiet drop.
3. **Junie taken** told where Tom wakes: the account, then the clip by itself, no trip home.
4. **The old church:** the door shut, the capsule beside it.
5. **The stairs:** eight moths keep them; old growth round the clearing and in the place beyond (`render/oldGrowth.js`).

**Not done or not checked:**
- **The tablet**, and any of it played by hand.
- **The smashed radio's code and data** (`radioSmashed`, `plane.radioSmashed`, the face-to-face account, the spare handset) are left in for old saves; nothing triggers them now. Delete them when it's safe to.
- **The ferns in the place beyond** barely show.

**To carry (Session 32):**
- **A prompt hidden where the player spawns:** hide it until he's stepped away once (`aidBoxOffered(hurt, beenAway)`), not by a condition that may never come true.
- **Anything that tests Tom's steps** (traps, lines) must ask whether he's riding (`player.riding`): on a vehicle he can't answer a prompt.
- **A prompt that must never be blocked** (the way out of a trap): call the interaction even when `canInteract` is false, and keep the vehicles from offering (`rideFree` in `Game`).
- **Text on a painted board:** `fitText(ctx, text, x, y, maxWidth, size, weight, family)` (`render/RoadNorthProps.js`).
- **A set that should face the way in:** `pathFrame(map, key)` (`world/clearingFrame.js`) gives the pathway's entrance and yaw. The unit tests' map isn't the game's: check the facing headless on a real seed.
- **A model's spots aren't where its comments suggest:** print them in the model's own frame from the running game before writing camera keys (the plane's bench is at z 7 to 9, not at the origin).
- **A first-person scene on something far off:** set `player.fovMultiplier` from the encounter while it plays (the standoff's `zoom`), and give the cutscene a live target (`cutscenes.liveTargets.set(name, () => ({ x, y, z }))`) if the thing moves.
- **A scene's clock in config, its length in the cutscene:** keep them equal and test it (`standoff.end` and `plane.standoff`'s duration).
- **A boss that can't be beaten here:** `flyer.send({ script, story: true, unbeatable: true })`: his health stops above the point he'd leave, and the script's last move repeats.
- **Something that plays by itself after lines finish:** `whenQuiet(fn)` then a short countdown (`JunieTaken.clipIn`).
- **Shutting a doorway in a baked set:** a wall across the gap in the colliders and a prompt at the door's spot; moving a thing means moving its `pushOnGround` frame (its spots go with it) and the graveyard's keep-clear box.
- **A fight that gates a prompt:** a flag for "dealt with", a `guarded` getter, send the swarm once per visit, and treat `moths.living === 0` after sending as done (`Stairs.updateMoths`).
- **Trees for more than one place:** `render/oldGrowth.js`: geometry with a `role` per vertex, `paint(geometry, palette)` for the place, drawn instanced. `ringStand` puts a ring of them round a clearing with the way in left open.
- **My headless harness:** as Session 31's. New: `game.plane` is the crashed plane's encounter, `game.church` the old church's, `game.stairs`, `game.stairsSite`, `game.crashSite`, `game.world.railway`. `skipToPhase('day')` in the harness still looks like dawn.

## Before that: Session 31 (Level & Encounter Designer + AI Programmer): the mineshaft, the bottom and the way out

**Status:** all of it is on `main` and on `ccr-2ebd0b15-khy2cs`, in four commits (one per batch, then the write-up). 1222 tests pass and the build is clean. Checked headless on three seeds; **none of it played on the tablet**. Aaron's answers at the start: no notes yet; the seam a glowing crack; the cocoon hung, split, 4 m; a 20 second fuse that kills; the ride up played, then a cutscene. For Aaron: PLAYTEST rounds 71-73; OPEN_QUESTIONS #605-645; MORNING.md.

**Done, by batch** (STATUS "Session 31" has the detail):
1. **The bottom** (`render/mineCavernModel.js`, `encounters/MineBottom.js`, `config.mineshaft.bottom`; `world/mineTrack.js` `roofAt`, `shutAt`): the bulkhead, the cavern, the seam, the cocoon, the charges, the foreman and his logbook, the dynamite, the drill's head, the cavern's roost.
2. **The way out** (`MineBottom` `push` to `finish`, `world/MineCart.js` `runUp`, `MineFight` `startEscape`, `config.mineshaft.escape`, the cutscene `mine.out`): the fuse, the cart back up, the fire, the miners on the rails, the closing cutscene, the mine sealed.
3. **The family's lines** (`dialogue.json` `mine.*`, `encounters/Mineshaft.js`), and no radio underground (`story/Comms.js` `deep`).

**Not done or not checked:**
- **The tablet**, for all of it (the tunnel is about 29,200 triangles in one draw call, fifteen small pieces, six balls of fire; then 22 moths and the dead).
- **Any of it played by hand:** the way out's numbers are guesses (#622, #628-630).
- **The surface doesn't change** once it's blown: only the lamps and the prompts (#637).
- **The count in the cart is small** (#624); **Tom isn't seen in the cutscene** (#635).
- **A miner's own art** and **the tunnel's dressing**: as Session 30 left them.
- **The killdozer** isn't built, so the drill's head is a card and a lore item.
- **The sounds** are placeholders (synthesised), like every sound in the game.

**To carry (Session 31):**
- **A wider, higher room at the end of a swept tunnel:** add a leg to the track, a `wide` entry and a `high` entry (`roofAt(track, s)`); `ringProfile` scales its wall points with the roof. Dress it from its own module with the tunnel's builder (`dressCavern(kit)`: `kit.pushAt(builder, s, lat, up, yaw, flat)` puts a frame on the track; `kit.builder(seed)` gives a builder for a piece that changes in play). Run `tests/mineTrack.test.js` after: the mine must stay under its clearing.
- **A door in a swept tunnel:** bake its frame; give the leaf shut and the leaf open their own meshes and show one; set `track.shutAt` so shots stop there (`shutBetween`); add a block across the room box until it's open.
- **One room box for a space of several widths:** make the box as wide as the widest part and narrow it with blocks (`sideBlocks(track, s0, s1, mid, hx)`). It only works where the track's straight and level.
- **A glow without a light:** an unlit mesh for the thing itself, plus a second unlit mesh of the same shape drawn several times wider at a few per cent opacity, added on (`seamHalo`). Layers that overlap fall away from the middle by themselves.
- **Firelight without a light:** an interior's light is read every frame (`Sky`), so hand `Interiors.define` a `light` object of your own and change its `ambientDay`, `ambientColor` and `fogColor` as the fire nears (`MineBottom.setGlow`).
- **A cutscene inside an interior** needs `"indoors": true` in its data, or its camera is lit as the world outside is (grey fog at 1,200 m down). Give it anchors of your own through `cutscenes.play(id, { anchors: { name: { x, z, yaw, dy } } })`: `dy` is the height above the map's ground there (very negative in a pocket). An anchor's "ahead" is (-sin yaw, -cos yaw), its x to the right of that.
- **Staging a cutscene from the encounter:** the cutscene's `emit` events reach the bus (`mine:out`), and the encounter runs its own clock while `playing` is false (`MineBottom.updateCine`, called from `MineRide.update`'s `cine` phase). Set the flags when it starts, and finish in `onDone`, so a skip or a quit mid-scene ends in the same place.
- **Leaving an interior partway through a frame** (a cutscene's end, a bus event) disposes the model: return from the rest of that frame's update (`if (!this.below || !this.model) return`). The tests caught this; the headless run didn't.
- **A vehicle run backward:** `MineCart.runUp(stop, speedOf)` sets `dir = -1`; `rollUp` is its own small loop. `mount(true)` faces Tom the other way. `due` and `rammed` in `MineFight` take the direction.
- **The moths told to leave without biting:** a habitat whose `hc` has `dartEvery` huge and `dartCount` 0, then re-roll each active moth's `slot` (`streamSlot`). Their stream follows `tomS(ride)`: the cart, or Tom's feet when he's off it.
- **The radio's reach has a fourth state:** `comms.state === 'deep'` while `game.mineRide.below`. Add to the `deep` function in `Game` for any other place far underground (the Bigfoot cave may want it). A line that must cut in over what's being said: `subtitles.clear(); dialogue.show(line, {}, true); dialogue.heard.add(line.id)`.
- **A line played once by an encounter:** `if (!dialogue.heard.has(id)) dialogue.play(id)`. A line the radio drops isn't marked heard, so it's tried again next time.
- **The run's end, not a respawn:** killing Tom (`combat.hurtPlayer(9999)`) ends the run with the end screen; nothing that isn't a flag comes back.
- **My headless harness** (the scratchpad, not kept): Session 30's, plus: stop the game's own loop with `cancelAnimationFrame(game.rafId); game.loop = () => {}` and step `game.update(1/30)`; step a cutscene to a time with `while (game.cutscenes.current?.t < t) game.update(1/30)`; close a card with `game.card.choose('read' | 'keep', game.input)` and a paper with `game.paper.close(game.input)`; call `saveAndQuit()` from a `setTimeout` so the page's reload doesn't kill the call that asked for it; wrap `game.dialogue.deliver` to list which lines played and which the radio dropped. Seed 7 has the mine north of the comms line; 1234 and 99 have it south.

## Before that: Session 30 (Level & Encounter Designer + AI Programmer): the mineshaft, the way down

**Status:** all of it is on `main` and on `ccr-0df28e11-vknf7t`, in four commits (one per batch, then the write-up). 1189 tests pass and the build is clean. Checked headless; **none of it played on the tablet**. Aaron's answers at the start: no notes yet; two sessions, the way down first; an ordinary car battery; my other defaults. For Aaron: PLAYTEST rounds 67-70; OPEN_QUESTIONS #565-604; MORNING.md.

**Done, by batch** (STATUS "Session 30" has the detail):
1. **The surface** (`render/mineshaftModel.js`, `world/MineshaftSite.js`, `encounters/Mineshaft.js`, `data/mineshaft.json`, `config.mineshaft`): the set, the sweep, six searches, the battery at the control box.
2. **The cage, the mine and the turret cart** (`world/mineTrack.js`, `render/mineModel.js`, `world/MineCart.js`, `encounters/MineRide.js`), and enemies, strikes, loot and shots working inside an interior.
3. **The ride's fight** (`encounters/MineFight.js`, `config.mineshaft.fight`), a miner zombie look, and the moths' real behaviour (`ai/Moths.js`).

**Not done or not checked:**
- **The tablet**, for all of it (the tunnel is about 23,750 triangles in one draw call, six small pieces, the cart; then the dead, up to eight beetles and 32 moths).
- **A ride played by hand:** the headless runs fired straight down the rails or not at all. Every number in `config.mineshaft.fight` is a guess (#602).
- **The second half** (above).
- **The family's lines** for the mine (#572).
- **A miner's own art:** he wears the army zombie's shapes (#591).
- **The tunnel's dressing** between the stops (#579).
- **The sounds** are placeholders (synthesised), like every sound in the game.

**To carry (Session 30):**
- **A big space below ground is an interior** (`world/Interiors.js`): `define({ id, load, platform, spawn, exit, light, onEnter, onLeave })`, `enter(id)`, `leave()`. Its pocket is 1,200 m under the map. Every platform you give the player down there needs `room: id` and `space: id`, or `Interiors.update` takes him for gone and unloads it. `sfx.muffled` is set for a quiet room: set it back to 1 in `onEnter` if things happen in there.
- **A space built along a line** (`world/mineTrack.js`): legs in config, then `pointAt(track, s)`, `trackPoint(track, s, lat, up)`, `nearest`, `halfAt`. Sweep the walls along it as rings (`render/mineModel.js`), and cut room platforms from it for where the player walks (`MineRide.zone`: a box in the track's own frame, with blocks for what stands in it).
- **Enemies inside an interior:** `enemies.spaces.set(id, { floorAt(x, z, y), confine(pos, y, r) })`, then `spawnZombie(x, z, { space: id, y })`. They don't collide with the map's trees or stand on its ground. **They can't see or hear Tom** (he's unseen inside an interior, which is what keeps the forest's dead off him), so the encounter tells them: `enemies.brain.chase(z, x, z, seconds)` every half second for the near ones (`MineFight.updateMiners`). Remove one outright with `z.state = 'free'; z.tier = null`.
- **Shots inside an interior:** `combat.weapons.spaceRays.set(id, (origin, dir, max) => distance)`. Without it, a shot fired below the map's ground stops at once.
- **Beetles inside an interior:** `beetles.spawn(x, z, facing, { space, y, floorAt, confine, speedScale })`. A second `Beetles` (its own renderer and pool of eight) is the mine's.
- **Moths:** `moths.setHabitat({ hc, slot(m, t, out), clamp(m), floorAt(m), speed(), dartSpeed(), away(m, out) })`, then `roost(points, group)`, `wake(group, scatter)`, `dismiss()`. `'moths:roostHit' { group }` says a roost was shot into. One pool of 32 for the whole game: `clear()` and `setHabitat(null)` when you're done.
- **A ride that drives itself** (`world/MineCart.js`): `player.riding = this`, with `drive(dt, input, player)`, `placeCamera(player)`, `eject()`, `strikeScale()` and a `hud`. Game passes locked input to the weapons while he rides, and encounters get `canInteract` false, so pass your own (`Mineshaft.update` does: `canInteract || player.riding === ride.cart`). Add the vehicle's turn to `player.yaw` each frame or his aim stays pointing at the world.
- **The torch a hand's breadth from a model blows it out white:** give that model a dark material colour (`buildCart`: 0x8a8a8a on the body, 0x5a5a5a on the gun) and keep the eye well back (0.8 m) and up (0.5 m) from it.
- **A wall that has to be seen moving in the dark** (the shaft's sleeve): an unlit material with the baked dull colours. Scroll it slower than the real speed, or it strobes at 30 frames a second.
- **A clearing's radius** in `data/encounters.json` moves other things on some seeds: 24 broke the railway cutting's store on one; 22 didn't. Run the whole suite after changing one.
- **My headless harness** (the scratchpad, not kept): Session 29's, plus `g.mineRide.jump('landing' | 'points' | 'fall' | 'bottom')`, `board()`, `release()`, `clear(id)`; the fight's state from `g.mineFight.overlayLine()` and `g.moths.overlayLine()`; counting `'weapon:hit'`, `'moths:nipped'` and `'mine:rammed'` on `g.bus` over a whole ride. Continue after Save and quit puts Tom at home in this harness whatever was saved: check the saved spot with `g.collectSaveOutside().player` instead.

## Before that: Session 29 (Level & Encounter Designer + AI Programmer): the moonshiners' holler

**Status:** all of it is on `main` and on `ccr-1c14ff0f-m44tn6`, in four commits (one per batch, then the write-up). 1129 tests pass and the build is clean. Checked headless; **none of it played on the tablet**. Aaron's answers at the start: no notes yet; the holler; go with my defaults (the auto shotgun: yes). For Aaron: PLAYTEST rounds 64-66; OPEN_QUESTIONS #538-564; MORNING.md.

**Done, by batch** (STATUS "Session 29" has the detail):
1. **The ground and the set** (`world/hollerGround.js`, `render/hollerModel.js`, `world/HollerSite.js`, `config.map.holler`, `config.holler`).
2. **The traps and the wire cutters** (`combat/hollerTraps.js`, `config.holler.traps`, `trapRules`).
3. **The beat** (`encounters/Holler.js`, `data/holler.json`), with a moonshiner zombie look.

**Not done or not checked:**
- **The tablet**, for all of it (about 22,000 triangles in eight draw calls, then seven dead).
- **A real fight played by hand:** the family were killed by debug. The still's clock (160 s) and the family's size are guesses (#554-557).
- **The tool belt has no display,** so the wire cutters are a flag and a line (#551).
- **A snared zombie is held standing,** not hoisted; **a blown still has no wreck model.**
- **The killdozer** isn't built, so the worm is a card and a lore item.
- **The sounds** are placeholders (synthesised), like every sound in the game.

**To carry (Session 29):**
- **A clearing changed into a hollow** (`world/hollerGround.js`): lift from the floor's edge outward (`offFloor`: the distance off a winding floor and past a headwall), noses before the mouth, gullies for the other pathways. Every pathway meets at the clearing's middle, so keep the narrow part away from it, or accept gaps there.
- **Forest back on lifted ground:** `GroundField.closeHoller()` multiplies the open and dirt masks down where the ground's lifted (after the clearings and paths are rasterised). The forest's trees and undergrowth then grow there by themselves, matching the woods round them; no set trunks needed.
- **Grime blacks out anything flat on the ground** (Session 28's lesson again): bake those pieces through a second `SetBuilder` with no `baseAt` and `mergeGeometries` the two baked geometries, so it stays one draw call.
- **Looks that swap in play** (a trap armed or sprung): bake each look as its own run of one mesh and zero out the runs not shown (`hollerModel.js` `setTrap`, as the sawmill's risers).
- **A trap the dead walk into:** keep each zombie's last position (`HollerTraps.deadLast`) and test its step against the trap. Hold one where it stands with `z.slowTimer = s; z.slow = 0` (EnemyManager already multiplies its moveScale by `slow`).
- **Lines that a jump clears:** `player.onGround` false while airborne; test the step segment against the line (`segmentsCross`).
- **Authored zombies that wait:** `spawnZombie(x, z, { mode: 'linger', linger: { x, z, r }, authored })`; `enemies.alert(x, z, r)` sets them chasing. **Spawn an encounter's group once per reset** (a flag in memory): checking "is the list empty?" respawns them the moment the last one dies (the headless run caught this).
- **A blast of your own size:** `explosives.blast(x, y, z, { radius, damage, playerDamage, edge, knockback, shake, alert })`.
- **A paper drawing from config:** `ui/paperDrawings.js` can import config, so a map drawn from the real layout always matches the set (`trapMap`).
- **My headless harness** (the scratchpad, not kept): Session 28's, plus `g.cutscenes.current.t` for the sweep's clock, `g.combat.godMode = true` before standing among the dead for long X holds (the family killed Tom mid-hold and the beat stopped updating), and `page.screenshot({ timeout: 180000 })` (SwiftShader frames with many dead can take a minute and a half).

## Before that: Session 28 (Level & Encounter Designer + AI Programmer): the sawmill, the chainsaw, the workbench

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

- **Session 29:** #538-564 (the hollow and the set #538-545, the traps and the cutters #546-551, the beat #552-564).
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
You are picking up Witch Hunt after Session 29 (the moonshiners' holler: its traps, the wire cutters, the still, the auto shotgun). Read HANDOVER.md first: its top section, "DO THIS FIRST", is the plan: Aaron's big play-test notes (Milo's barn, the Junie stretch, the crashed plane, the railway cutting, the maul, dynamite, the sawmill, the chainsaw, the workbench, the holler), then the mineshaft (the last designed optional), with defaults for its open points.
Ask Aaron for his notes first if they aren't here (rule 10) and fix those before building. Then build in batches: test each (npx vitest run, npx vite build), check it headless (look at screenshots critically and fix what reads badly), and push it to main before the next. Log your calls as numbered OPEN_QUESTIONS rows from #565.
Aaron's direction: "minimum viable product is the enemy of fun", and "detailed work rather than finish early; fun comes first". Build each beat as the scene it should be: a real set, staged cutscenes, sound for every moment that matters, lines that carry the dread.
Read docs/DESIGN.md (the encounter's section, "Giant moths", "Weapons"), STATUS.md (Session 29 and after) and the code HANDOVER.md points to, as each batch needs them.
Keep Aaron's rules: config and data first, complete files, small modules, no lights added or removed while playing, dull colours (the glare rule), one draw call where you can, tests for what you build, saves through story flags.
Finish with the write-up (STATUS, PLAYTEST rounds from 67, OPEN_QUESTIONS, DESIGN as built, MORNING, HANDOVER rewritten for the session after). If you run out of room, say at the top of HANDOVER.md exactly where you stopped.
```
