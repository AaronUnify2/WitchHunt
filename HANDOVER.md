# Handover

## In progress: Session 15, Level & Encounter Designer (+ Narrative): the first day (M9.2)

**Status: built and pushed to `main`; waiting on Aaron's play-test** (`PLAYTEST.md` is the running list). 532 tests pass and the build is clean. The deploy works again: CI's tests had been timing out since Session 14's last push, and are now fixed with a 30 s `testTimeout`.

**How we worked (agreed with Aaron at the start):** Aaron took my recommendations on every open point (OPEN_QUESTIONS, Session 15). Steps are pushed to `main` for him to play-test.

### What was done

Details are in `STATUS.md` (Session 15) and the open points in `OPEN_QUESTIONS.md` (#185-197).

- **The main menu:**
  - The title over a looping grey CCTV feed (`menu.feed`).
  - Continue, New Run, and Skip intro (shown once the opening has been seen on the device: `meta/MetaStore.js`).
  - Modifiers and Settings are greyed out.
  - It works with the controller.
- **The opening:** the cold open, then Tom wakes in the comms room facing Ellen (lines 1-2).
- **The tower:** the first climb on Day 1 plays the view. A red light blinks far to the south, then the smoke over the campsite shows (lines 3-4).
- **The campsite** (`encounters/Campsite.js`, `render/CampsiteProps.js`, `data/campsite.json`, `world/clearingFrame.js`):
  - Props and five search points.
  - The camcorder and its clip (lines 6-7).
  - The shotgun and its wave of 7 (line 8); the wave cleared (lines 9-10).
  - The campers' car at a fixed spot with a sure battery.
- **Home** (`story/FirstDay.js`): lines 11-14.
- **Day 1 can't be failed:** health has a 20% floor.
- **Day 1's clock holds at 17:00** until the battery is in and the fence is patched.
- **Nudges:** six draft lines that play if Tom seems stuck.
- **Night 1:**
  - Strays come to the fence (line 16).
  - The witch's first sigil goes in at the storm shelter, with camera six's clip (lines 17-19).
  - The sigil is marked on the map (line 20).
  - Its dead hold the shelter (`sigil.hold`).
- **Dawn 1:** lines 21-23; `night1` and `day2` open on their real triggers now.
- **Skip intro:** a fresh map at Dawn 1 with all of the above done.
- **The shotgun is out of the starting kit.**

### Unfinished

- **Aaron's play-test and its fixes.** Then close the session: final STATUS and HANDOVER, then the HANDOVER READY signal.
- Belongs to later sessions, by design:
  - **The storm shelter** itself: the horde holding the hatch through the day, the hatch, the room, Earl. Night 1's sigil is already there (`sigil.firstSigil`, `hold`).
  - The real witch walking to plant on Night 1. Today the clip shows her and she stays home.
  - The campers' models.
  - The campsite's final look (Session 19).
- **Stand-in flags still left** for M9.3-9.4: `gasStationVisited`, `shelterVisited`, `rifleClaimed`, `outpostCall`, `outpostEntered`, `outpostCleared`.

## Next: Session 16, Level & Encounter Designer + AI Programmer: the storm shelter and the gas station (M9.3)

**Goal (DESIGN.md "Build plan" M9.3, and "Team roles and session plan" Session 16):**
- **The storm shelter:**
  - the horde that holds the hatch;
  - the room below;
  - the combination;
  - the diary;
  - the tapes cutscene at home.
- **The gas station:**
  - the store and back office;
  - the authored mutant;
  - the witch sighting;
  - the safe.
- **The rifle chain.**
- Their lines.
- **Done when:** the hunting rifle is claimable on every seed.

### Look at first

- **The Night 1 sigil:**
  - Planted by `FirstDay.plantShelterSigil()` beside the shelter clearing's centre (`config.firstDay.night1.sigilOffset`).
  - It carries `hold` (its dead linger within 14 m and never march) and `firstSigil`.
  - Its dead are raised at night only. DESIGN wants the shelter's horde to stay through the day (the encounter exception); `EnemyManager.thinOut` at dawn takes them today.
- **The campsite as a pattern:** `encounters/Campsite.js` is an encounter built from data in the clearing's own frame (`clearingFrame()`: x right, z ahead from the path in). It has hold-X search points, a scripted wave, a fixed car spot (`vehiclePlacement` `fixed`), save state, and debug items. The gas station and the shelter can follow it.
- **Lines:**
  - `dialogue.json`: mark system-played lines `cued`, and your own drafts `draft`.
  - `Dialogue.say(id)` checks a line's conditions.
  - `play(id)` forces a line.
- **Cutscenes:**
  - Anchors: a cutscene's anchor "ahead" is `(-sin yaw, -cos yaw)`. **For `home`, yaw 0 means ahead is north** (into the cliff); use negative z for south.
  - New features: the `smoke` actor kind, and `loop` / `startBlack`.
- **The progress flags:** `progress.json`. Triggerless flags are set in code.

### Gotchas and decisions from Session 15

- **Headless renders are very slow** (each frame's dt is capped), so cutscenes barely move in real time. Step the game by hand instead: `for (...) game.update(0.05)`, then screenshot. The menu: hide `.start-screen` and call `game.onStartChoice('new' | 'skip')`.
- **The torch-glare rule still holds:** the campsite's colours are dark on purpose.
- **Day 1's clock hold** checks `station.state.segments` for any panel at 0 health. If a later session breaks a panel on Day 1 on purpose, it'll hold the clock.
- **New saves have `campsite` and the sigil's `hold` / `known` / `firstSigil`** (optional fields; older version-2 saves still load).
- **Push to `main` for Aaron**; also push this session's branch.

### Open questions for Aaron

- **#185-197 (Session 15):**
  - the nudge lines;
  - the clock hold;
  - "can't fail";
  - the campsite's numbers;
  - the camcorder clip;
  - the light to the south;
  - the tower's smoke;
  - Night 1's timings;
  - the menu feed;
  - New Run with a save;
  - Skip intro's kit;
  - no restock;
  - cued lines.
- **From before:**
  - #171-184 (Session 14);
  - #161-170 (Session 13);
  - #155-160;
  - #143;
  - #136-137;
  - #140-141.

## Session kickoff prompt for the next session

```
You are the Level & Encounter Designer (with the AI Programmer's hat) on Witch Hunt, Session 16: the storm shelter and the gas station (M9.3): the horde that holds the hatch, the room below, the combination, the diary, the tapes cutscene at home; the gas station's store and back office, the authored mutant, the witch sighting, the safe; the hunting rifle chain; their lines, written with Aaron. Session 15 built the first day: the menu, the opening, the tower, the campsite (encounters/Campsite.js is the pattern for a data-built encounter), home, the scripted Night 1 sigil at the storm shelter (it holds its dead there) and Dawn 1.
Read docs/DESIGN.md (especially "Storm shelter", "Roadside gas station", "Fixed opening cluster", "Build plan" and "Team roles and session plan"), STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md.
Then confirm your role, this session's goal and any questions before starting. Workshop content with Aaron first (rule 10), and push each step to main so he can play-test it.
Follow the handover protocol, and end with the HANDOVER READY signal.
```
