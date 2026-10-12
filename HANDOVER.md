# Handover

## Just finished: Session 7, Lead Engineer, M6 (simulation LOD and nights)

**Status: done.** Aaron play-tested each step on the tablet and confirmed it. **The M6 performance gate passed:** about 20 minutes of five-sigil nights at Medium, never below 60 fps, the tablet "barely warm". With the map full at 480 zombies it held 90 fps (zombie simulation 0.33 ms).

### What was built

Details and numbers are in `STATUS.md` (the M6 sections) and `OPEN_QUESTIONS.md` #89-104.

1. **Simulation tiers** (`src/ai/simTiers.js`, `EnemyManager`):
   - **Active:** within 60 m, at most 25, full simulation.
   - **Nearby:** 60-150 m, every 3rd frame.
   - **Abstract:** beyond 150 m, pathway steps about once a second, no mesh.
   - **No 64-zombie cap** (Aaron): the pool grows to 480.
   - Zombies on a route that get stuck (a car across their way) detour round it.
2. **Night marches** (`ZombieDirector.raise()`, `src/ai/marchRoutes.js`):
   - Each raising is a single wanderer or a whole group: 4-10 by level, rising together. A horde always marches. About ⅔ of zombies march (Aaron).
   - Groups take the shortest pathway route home at their slowest member's pace, ×2.5 out of sight (Aaron: fine).
   - Each sigil has a night quota.
   - Aaron saw waves at about 9pm and 11:30pm.
3. **Revisits** (`src/ai/revisits.js`, Aaron's idea): back at a visited encounter at night, 4-5 zombies hang about there. Night only.
4. **Danger, forecast, nights away, alarm** (`src/base/danger.js`, `nightResolver.js`, `NightWatch.js`):
   - **Danger:** marchers × the share arriving before dawn × 2.
   - **The dusk forecast:** a panel plus a ledger tab, with arrival times and warnings.
   - **Away** (beyond 150 m): each arriving group is resolved by DESIGN.md's margin table. It gathers at the fence (a 'held' mode) and claws at a steady rate until dawn: along the fence, or through to the doors if it breaks through.
     - The turret's rounds become kills; a graded radio call says how bad it is.
     - Come home mid-attack and the group is still there to fight.
     - A summary when you're back.
   - **The alarm:** below half the dusk security, a radio call plus a banner with an arrow home.
   - **Aaron's verdict** after running home from the hut on a five-sigil night: "balanced really well".
5. **Dawn autosave** (`src/core/saveData.js`, `SaveStore.js`):
   - One localStorage slot with the seed, clock, player, fog, station, vehicles, sigils and revisits.
   - A Continue / New run start screen.
   - Deleted on death, the station falling or a new run. Aaron: "worked 100% properly".
6. **From Aaron's play-tests:**
   - **Map and run:** sigil grounds always 2 north / 2 middle / 1 south, and the Car Armory in the north (DESIGN.md updated). Death starts a new run.
   - **The station:** fence 500 / gate 750 / barricade 375 health; chain-link panels dim the torch like the gate; the starting broken panel is the second east of the gate.
   - **The player:** no aiming while reloading; stamina doubled; hiding (crouched, torch off, in the brush) caps sight at 6 m with a HIDDEN marker.
   - **The forecast** recalibrated to match what happens.
   - **Debug:** a real fast-forward (x4, x10) for the whole world.
7. **Tests:** 323 pass (51 new this session).

### Unfinished

Nothing in scope. **Aaron is still checking two things pushed last:** hiding (6 m) and the recalibrated forecast. Fix anything he reports.

## Next: Session 8, AI Programmer, M7 (the witch: playable loop)

**Goal (DESIGN.md M7):**
- witch states, planting at sigil grounds, interruption, fight or flee, wounds, traps;
- the hut, explosives (debug-given), the final battle, blood night;
- ending and defeat screens.

**Done when (vertical slice):** a complete run from day 1 to killing her (or dying) with placeholder content. **Then the gate:** Aaron plays two or three full runs (Session 9, QA).

**Rule 10 applies:** the witch is content. Workshop her build plan with Aaron before building:
- her look as a placeholder 3D figure;
- how she moves and fights;
- how she plants;
- her traps, the hut and the final battle.

### Look at first

- **`STATUS.md` "What M7 needs next"**: the hooks for her. The stand-in planter to replace, `director.plant()`, the tiers and march routes, danger and the forecast, the blood night and NightWatch, the defeat screen, the save, detection.
- **DESIGN.md "The witch"**: states, wounds, traps, two ways to fight her, the hut, explosives, the final battle, the ending.
- `src/ai/ZombieDirector.js`: planting, raising, the night's events.
- `src/base/NightWatch.js`: away attacks and the alarm. The final battle is at the hut, far beyond 150 m, so the station counts as "away" during it.

### Gotchas and decisions

- **Systems** follow `init()` / `update(dt)` / `dispose()`, talk through `EventBus`, and use `rng.fork('label')`.
- **Debug tools go in a category** (Session 8): `menu.category(DEBUG.witch).addItem(label, onSelect)`; the categories are listed in `DEBUG` in `src/debug/DebugMenu.js`.
- **Game steps the world in `Game.step()`** (fast-forward runs it several times a frame; only the first step gets the player's input). Put new per-frame systems there, not in `update()`.
- **Away vs home:** `NightWatch.away` (beyond 150 m, 8 m hysteresis; or the debug "count me as away") sets `enemies.stationSimulated` and `station.abstract` (the real turret doesn't fire while away).
- **'held' zombies** belong to NightWatch's attacks. They ignore the player until released (coming home) or dawn.
- **Saves:** add new run state to `saveData.js` (pure, with a round-trip test). `validSave()` checks `SAVE_VERSION`; bump it if old saves can't be read.
- **Debug fast-forward x10 and "Night: count me as away"** make whole nights testable in a minute or two. In tests, drive `game.update(1/30)` in a loop with the render loop cancelled. Headless Chromium runs at about 10 fps otherwise.
- **The map changed this session** (sigil grounds, the Car Armory): every seed's map differs from before.
- **Vite `base` is `/WitchHunt/`. The live build deploys from `main`.** Aaron has asked for each step to be pushed to `main` for play-testing.

### Open questions for Aaron

- **#102:** zombies aren't saved at dawn. Fine?
- **#93 and #104:** the night's numbers (group sizes, quotas, danger) are for M14 tuning.
- **#101, the Divorced Dad modifier:** no family, no compound. It's in DESIGN.md for M12.

## Play-test script for Aaron (M6) (done: kept for the record)

1. **Tiers:** use "Zombies: populate the map" and "tier colours" to fill the map. The fps holds and nothing pops in or sticks.
2. **Marches:** plant 2-3 sigils, skip to night and stay home. Groups arrive at the fence in waves.
3. **Revisits:** visit an encounter by day, leave, and come back at night. 4-5 zombies are hanging about there.
4. **Away:** read the dusk forecast, then go beyond 150 m (use fast-forward x10 to watch a night). The radio says whether the fence will hold; come home mid-attack and fight. The alarm banner points home.
5. **Save:** reach dawn ("Game saved"), close the tab and reopen it, then Continue. Dying deletes the save.
6. **Hiding:** crouch with the torch off just off the path. "HIDDEN" shows and zombies don't see you beyond 6 m.
7. **Gate:** 20 minutes of busy nights at Medium. Never below 60 fps; the tablet barely warm. **Passed.**

## Session kickoff prompt for Session 8

```
You are the AI Programmer on Witch Hunt, Session 8.
Read docs/DESIGN.md (especially "The witch", "Build plan" and "Team roles and session plan"), STATUS.md and HANDOVER.md.
Then confirm your role, this session's goal and any questions before starting. The witch is content: workshop her build plan with Aaron first (rule 10).
Follow the handover protocol, and end with the HANDOVER READY signal.
```
