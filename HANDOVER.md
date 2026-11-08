# Handover

## Just finished: Session 20, the new systems (M10.1; Lead Engineer + Gameplay Programmer)

**Status: built, tested and pushed to the session branch `ccr-f5e0ac7a-jc0fw9`, not to `main`.** Merge it to main (a PR) to put it live. 754 tests pass (was 726); the build is clean.

**Aaron's answers first** (OPEN_QUESTIONS "Session 20"):
- the vehicles don't glare under the torch, but other things do (**a fuller glare list is coming from him**);
- #300, #308 and #311 are settled: the sweeps stay as they are, with their bars; the generator is a keeper;
- the loadout as Claude proposed;
- the healing pool capped at **270**, with the rest going to the comms room's first aid box;
- Continue puts Tom back at a safe point (runs are short);
- old saves can be discarded.

**What was built** (each in DESIGN.md as built, with its files):
1. **The healing pool:** `player/healingPool.js`, `config.inventory.healing`. The HUD shows "Healing: N". Overflow goes to `StationState.aidBox`, which is saved.
2. **The loadout, the gun rack and the tool belt:**
   - `player/loadout.js`, `config.weapons.loadout`; `Weapons.take` / `draw` / `stow` / `swap` / `has`;
   - the rack is on the comms room's east wall, plus the ledger's **Gun rack** page;
   - the shovel goes on the belt once it's swapped out of the melee slot. **Use `weapons.has(id)`, not `order.includes(id)`**, for "does Tom own it".
3. **Ammo types on B:**
   - `WeaponState` (`types`, `chosen`, `loaded`, `damageScale`); `Weapons.updateReload()`;
   - `config.weapons.ammoTypes`, and each gun's `altAmmo`;
   - alien shells: 1.5x damage, purple, 7.2 turret rounds each.
4. **Inspect cards:**
   - `ui/InspectCard.js`; the card text is in `lore.json` `card` (drafts);
   - `card.show(id, { watch, read, take, keep }, device)` returns false when the card can't show, and the caller then does it the old way;
   - the opening's six lore items go through it.
5. **One power unit:**
   - `base/powerUnit.js`; the station's `capacity` is saved;
   - `fitPowerCell('planeCell')` raises the fence to 1000 and puts 500 in;
   - `AlienQuad.power`, `config.alienQuad.power`.
6. **Flares out of the opening:**
   - `loot.json` items' `"after"` flag; `lootGate` in `combat/loot.js`, which Game sets up;
   - the new story flag `mothmanMet` is for Session 25 to set.
7. **The health floor:** `Combat.setHealthFloor(owner, fraction, onHit)`, `clearHealthFloor(owner)` and the `player:floorHit` event. Day 1's floor uses it. **Session 25's crash site** holds 10% with an `onHit` that starts the blackout.
8. **The pause menu and Save and quit:**
   - `ui/PauseMenu.js`; `Game.canPause()`, `saveRefusal()`, `saveAndQuit()`; `config.station.safePoint`;
   - `SAVE_VERSION` is now 3;
   - saving is refused during Day 1 and Night 1 (the clock reads day 1 until dawn), and after the hut is destroyed.

**Debug items for trying it** (Aaron's PLAYTEST round 31):
- Player: an alien med kit, alien shells, the 10% health floor;
- Station: the plane's power cell;
- Experimental vehicles: drain the alien quad's power store;
- Story progress: `mothmanMet`.

### Unfinished

- **Aaron's play-test, PLAYTEST round 31.** Ask for his notes first. My calls are OPEN_QUESTIONS #340-352. In particular:
  - #344: Skip intro has never given the shovel, though the old handover said it did;
  - #347: should a kept tape still leave the D-pad down prompt waiting?
  - #349: the alien quad's power numbers.
- **His glare list** (things that glare under the torch).
- **Not played end to end headless:** Night 1's waves, then the gas station, the shelter and the outpost in sequence with the new systems. They were checked piece by piece on seeds 1234, 7 and 4242, and the full run is Aaron's round 31. DESIGN.md's M10 gate says "the opening still plays through on every seed".
- **From before:**
  - Aaron's notes on Session 19's rounds 28-30 beyond the answers above;
  - the trail in behind the gas station is at 157 draw calls (#302).
- **Small leftovers from Session 20:**
  - the rack shows no guns on it;
  - the common pickups' first-time introductions aren't built (#348);
  - the card's turning item is a CSS placeholder.

## Next: Session 21, Lead Engineer: the map (M10.2)

**First:** ask Aaron for his notes from PLAYTEST round 31 and his glare list. Fix the small ones first, one at a time, and push each. Bigger changes go in OPEN_QUESTIONS for Session 23 (QA, the opening with the new systems).

**Goal** (DESIGN.md "Build plan", M10.2 and the Session 21 row; "Map": Structure, Generation, the road north, the 1903 railway line; "Interiors (shared system)"): the map the new story needs, with **the opening still playing through on every seed**.

What to build:
1. **The fixed story spine:**
   - the story places are placed first, the same on every run, like the opening cluster;
   - places: the crashed plane, the old church and the time capsule, the stairs, the Bigfoot cave (north, just south of ROAD CLOSED), the crashed UFO, the Car Armory, Ground Zero and the hut;
   - DESIGN.md's encounter table has each one's band and placement.
2. **The road north:** it runs past the gas station and ends at a **ROAD CLOSED** barrier. The cave's brush is there too (the dozer clears it).
3. **The 1903 railway line:** part of every map, east to west across the full width, on the middle / south border.
4. **Optional encounters dealt by the seed:**
   - the moonshiners' holler, the railway cutting, the sawmill, the mineshaft and Milo's barn get spots;
   - the encounters themselves come with their stretch of the story (M11-M14);
   - here they are placeholders on the map.
5. **The interior system:**
   - entering loads an interior; the main map keeps simulating in the abstract tier; the clock runs and shows on the HUD; leaving returns Tom to the entrance;
   - start with one small hand-built space to prove it (the storm shelter's room is a platform on the main map today: a candidate to move onto it).

Not this session:
- the spikes (Session 22: 150 zombies, the procedural four-path forest, a flying enemy, a dozer part);
- any encounter's content (the crashed plane is Session 25).

### Gotchas and decisions to carry

- **Config and data first** (rules 5 and 9), complete files, small modules. **No lights added or removed while playing.** One idea at a time over the radio.
- **Save format:** the map comes from the seed, so saves don't hold it. A map change moves where things are on every seed: **bump `SAVE_VERSION`** (to 4), as M9.1 did, so an old save doesn't wake up somewhere else.
- **Safe point:** Save and quit puts Tom in the cabin (`config.station.safePoint`). If the interior system lands, saving inside an interior should come back outside it.
- **Things that need the shovel ask `combat.weapons.has('shovel')`.** Guns found later go through `combat.giveWeapon(id, rounds)`, which handles the rack.
- **A special item found later goes through `game.card.show(...)`** with its `card` in `lore.json`. Flares and other story-gated loot use `"after"` in `loot.json`.
- **My headless harness** (Session 20, built on Session 19's):
  - Playwright on `localhost:5173?seed=…` with `game.startScreen.activate('skip')` (or `'new'`, then stop cutscenes until none is active: the opening chains several);
  - debug items by label (`game.debugMenu.categories`; items' labels can be functions);
  - `game.player.teleport()`;
  - **swiftshader runs at about 5 frames a second with a capped step**, so hold keys with `waitForFunction` on the state, not fixed waits;
  - **restart the dev server after editing a module you also import from the page**: Vite gives the edited file a new URL, and the page's import gets a second copy.

### Open questions for Aaron

- **Session 20:** #340-352 (above), and his glare list.
- **For Session 21:** where the spine's places sit relative to each other is in DESIGN.md. Ask before choosing anything the doc leaves open, such as how far north ROAD CLOSED is, and whether the railway crosses the road at grade.
- **Session 19:** #282-320, to check in play (#300, #308, #311, #317 and #319 are settled). In particular #302, the draw calls.
- **The experimental vehicles:** #321-339.
- **From the Nov 8 design** (DESIGN.md "Open questions"): the endgame's design; Milo's killdozer part; the heat-scope rifle's spot; the four named-only optional encounters. None of these block M10.
- **From before:** #257-281, #225-256, #213-224, #185-197, #171-184, #161-170, #155-160, #143, #136-137, #140-141.

## Session kickoff prompt for the next session

```
You are the Lead Engineer on Witch Hunt, Session 21: the map (M10.2): the fixed story spine, the road north and its ROAD CLOSED barrier, the 1903 railway line, the seed dealing optional encounters, and the interior system.
Read HANDOVER.md first, then docs/DESIGN.md ("Build plan": M10 and Session 21; "Map": Structure, Generation, the road north, the 1903 railway line; "Encounters": the story spine and the encounter table; "Interiors (shared system)"), STATUS.md (Session 20) and OPEN_QUESTIONS.md (#340-352, then the older open ones).
First ask Aaron for his notes from PLAYTEST round 31 (Session 20's new systems) and his list of things that glare under the torch, and fix the small ones, pushing each.
Then build the map one piece at a time, each tested and pushed, keeping the opening playable on every seed; bump SAVE_VERSION when the map moves.
Keep Aaron's rules: config and data first, complete files, no lights added at runtime, one idea at a time over the radio.
Then confirm your role and ask Aaron for his notes.
When he's happy, follow the handover protocol: update STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md for the next session (Session 22, Lead Engineer + AI Programmer: the spikes, M10.3), and end with the HANDOVER READY signal.
```
