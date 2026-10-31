# Handover

## Just finished: Session 15b, Level & Encounter Designer (+ Narrative): the first day's play-test, and (overnight) the gas station

**Status: everything is on `main` (live).** 567 tests pass and the build is clean. Aaron play-tested the first day (M9.2) and his notes were fixed one at a time. Then he went to bed and asked me to keep building: the gas station's beats (pass 2) and the quad bike (pass 3). **The calls I made overnight are in `MORNING.md` (items 1-22) for his review; the open ones are OPEN_QUESTIONS #198-212.**

**How we worked:** one note at a time; small tweaks pushed straight away; design calls asked first (a line or two, with a recommendation). Each fix was pushed to `main` (it deploys in about 40 s) and to the session's branch. `PLAYTEST.md` is the running checklist (rounds 1-11 at its top).

### What was done

Details are in `STATUS.md` (Session 15's "After Aaron's play-test" list, items 1-19).

- **Fixes from the play-test (Day 1 and Night 1):**
  - Skipping a cutscene with A no longer jumps.
  - The gate is locked on Day 1 until the tower. Ellen calls Tom back if he tries it or the torn panel.
  - The service rifle is on the tower: seen on Day 1, taken on Night 1 when Ellen sends Tom up for it.
  - Tom's gun is hidden in cutscenes.
  - Cars can't be searched until the camcorder's tape has played.
  - The tents' search reach is bigger.
  - The campsite's sweep starts at its edge.
  - The camcorder clip on the monitors is shot at the campsite (cutscenes take named anchors now).
- **Lines rewritten:**
  - 5: the tents, not the cars.
  - 10: the battery "to keep everyone safe".
  - 14: "They'll come."
  - 20 and 21, and a three-line talk after camera six: the Pruitts, then the gas station for supplies and a phone.
- **Night 1 is the first defence:**
  - After Junie's talk, the day fades straight to night.
  - The forecast waits for the fade, with line 15.
  - 9 zombies come in waves of 3 (south-west, south, east), with the family's tower and shotgun lines.
  - Then Ellen's warning, camera six, the talk, and a fade to dawn.
- **The station ledger:**
  - Tabs: Fence, Turret 🔒, Upgrades, Security, Forecast, Monitors.
  - The Fence tab is "repair the whole fence" plus a tappable plan of the compound (fence ring, barricade ring, doors, fence box). The D-pad walks the rings.
  - Upgrades: the floodlights in one go; spike traps by side.
  - The whole book takes taps and clicks.
- **The gas station:**
  - Pass 1, the set: the store, back office, stockroom, forecourt, sagging canopy and HOME OF BIGFOOT sign.
  - Pass 2, the beats: the forecourt pack, the arrival sweep, the first mutant (new `dormant`/`wake` zombie states), the searches, the phone, Earl's note, the scanner broadcast, the safe (needs `earlCombination`) and the witch at the treeline.
- **Earl's quad bike (pass 3):**
  - It's parked behind the store.
  - Riding: 13 m/s on paths, slow in the brush; it rams the dead, and its engine draws them.
  - No shooting from the saddle.
  - The witch is 1.6x faster while Tom rides.

### Unfinished

- **Aaron's review of the overnight work:** `MORNING.md`, and `PLAYTEST.md` rounds 10 (the gas station) and 11 (the quad). Start the next session with his notes on those.
- **The storm shelter itself** (Session 16, below). The gas station's safe already opens with `earlCombination`.
- **Belongs to later sessions:**
  - the real witch walking to plant on Night 1;
  - the campers' models;
  - the campsite's and the gas station's final look (style pass 2);
  - a paper close-up for notes.
- **Stand-in flags still left:**
  - `shelterVisited`;
  - `rifleClaimed`'s stand-in trigger (drop it when the shelter gives the combination);
  - `outpostCall`, `outpostEntered`, `outpostCleared`.

## Next: Session 16, Level & Encounter Designer + AI Programmer: the storm shelter (M9.3's other half)

**First:** Aaron's notes on the overnight work (`MORNING.md`, OPEN_QUESTIONS #198-212). Fix those one at a time, as in 15b.

**Goal (DESIGN.md "Storm shelter", "Build plan" M9.3):**
- **The horde holding the hatch through the day.** Night 1's sigil is planted there (`FirstDay.plantShelterSigil()`, `sigil.hold`). Its dead are raised at night and sink at dawn today (`EnemyManager.thinOut`); DESIGN wants them to stay through the day. Authored zombies already skip the thin-out (`z.authored`).
- **The hatch:** dig it open.
- **Earl Pruitt:** a zombie at the hatch (variant `earl`, Session 13). The combination is on his body: set `earlCombination` and a family line tying the note to the keys.
- **The room below:** first aid, ammo, batteries, a radio, the diary, the tapes.
- **The tapes cutscene at home:** camera four, the Pruitts' Night 1.
- **Their lines.**
- **The rifle chain:** with the combination, the gas station's safe gives the hunting rifle (built: `GasStation.trySafe()`). Drop `rifleClaimed`'s stand-in in `progress.json`.
- **Done when:** the hunting rifle is claimable on every seed.

**For that session:**
- **`encounters/GasStation.js` is the newest pattern** for a data-built encounter:
  - its own frame (`GasStation.frame`);
  - layout in `data/gasStation.json`;
  - props merged by colour (`render/GasStationProps.js`);
  - colliders;
  - hold-X searches and interactions;
  - authored zombies (`dormant` / `wake`, `z.authored`);
  - first-person cutscenes with anchors from code;
  - save state;
  - debug teleports.
- **Junie's line** ("The note said they went to the shelter. That's where the camera was.") already points the player at the shelter after the gas station.
- **Earl's note** says the combination's on his keys.

### Gotchas and decisions from Session 15b

- **Input:** `Input.swallowHeld()` hides whatever's held until it's released. Use it when a press ends a cutscene or a menu, so it doesn't reach the game.
- **The ledger:**
  - Pages can have a `plan`; its items carry `ring` and `order` for the D-pad (`Ledger.planMove`).
  - LB/RB (`tabPrev`/`tabNext`) turn pages.
  - Taps act on `pointerup` (the book redraws itself mid-click).
  - The mouse is freed while it's open.
- **Day 1 flags and locks set by FirstDay each frame:**
  - `station.gateLocked`;
  - `station.towerRifleLocked`;
  - `vehicles.locked` (until the tape).
- **Night 1 runs on FirstDay's own clock holds:** Day 1 holds at 17:00 until nightfall, and the night holds short of dawn until she's planted. The nightfall and dawn fades are cutscenes that emit `firstDay:nightfall` / `firstDay:dawn`.
- **NightWatch's forecast waits for a cutscene to end.**
- **Cutscenes:**
  - `namedAnchors` lets an encounter name its frame (`campsite`, `gasStation`).
  - `move` events can name their own `anchor`.
- **The quad:**
  - The Player hands movement to `player.riding` (`drive()`). A teleport or reset ejects him.
  - Game locks firing, charges and digging while riding, and sets `witch.speedScale`.
- **Placeholder signposts** are skipped for built sets (`config.landmarks.built`). Add the shelter's key there when it's built.
- **Headless checks:**
  - Step the game by hand (`game.update(0.1)`).
  - Wait 6-12 s of real time before a screenshot, or the frame is blank.
  - Skip intro then set `clock.day = 2` before testing day-2 places; otherwise FirstDay thinks it's Day 1 and fades to night.

### Open questions for Aaron

- **#198-212 (Session 15b):** the overnight calls (`MORNING.md`).
- **From before:**
  - #185-197 (Session 15);
  - #171-184 (Session 14);
  - #161-170 (Session 13);
  - #155-160;
  - #143;
  - #136-137;
  - #140-141.

## Session kickoff prompt for the next session

```
You are the Level & Encounter Designer (with the AI Programmer's hat) on Witch Hunt, Session 16: first Aaron's notes on the overnight work from Session 15b (MORNING.md: the gas station's beats and the quad bike), then the storm shelter (M9.3's other half): the horde holding the hatch through the day, the hatch, Earl Pruitt and his keys (the combination that opens the gas station's safe), the room below, the diary and the tapes cutscene at home, and their lines. The gas station is built (encounters/GasStation.js is the pattern to follow).
Read HANDOVER.md first, then MORNING.md, PLAYTEST.md (rounds 10-11), STATUS.md (Session 15b), OPEN_QUESTIONS.md (#198-212) and docs/DESIGN.md ("Storm shelter", "Roadside gas station", "Fixed opening cluster").
Then confirm your role and that you're ready for Aaron's notes.
Follow the handover protocol: when Aaron's happy, update STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md for the next session, and end with the HANDOVER READY signal.
```
