# Handover

## Just finished: Session 15, Level & Encounter Designer (+ Narrative): the first day (M9.2), built

**Status: built and on `main` (live). Aaron's play-test is the next session's job.** 532 tests pass and the build is clean. The deploy works again: CI's tests had been timing out since Session 14, and a 30 s `testTimeout` in `vite.config.js` fixed it.

**How we worked (agreed with Aaron at the start):** Aaron took my recommendations on every open point (OPEN_QUESTIONS, Session 15). Each step is pushed to `main` for him to play-test.

### What was done

Details are in `STATUS.md` (Session 15), the open points in `OPEN_QUESTIONS.md` (#185-197), and what to try in `PLAYTEST.md`.

- **The main menu** (`ui/StartScreen.js`, `meta/MetaStore.js`, `Game.showMenu()` / `onStartChoice()`):
  - The title over a looping grey CCTV feed (`menu.feed`).
  - Continue, New Run, and Skip intro (shown once the opening has been seen on the device).
  - Modifiers and Settings are greyed out.
  - It works with the controller.
- **The opening:** the cold open, then Tom wakes in the comms room facing Ellen (lines 1-2).
- **The tower:** the first climb on Day 1 plays `day1.tower`: a red light blinks far to the south, then the view turns to the smoke over the campsite (lines 3-4).
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

- **Aaron's play-test of all of it, and the tweaks it turns up.** That's Session 15b, below.
- Belongs to later sessions, by design:
  - **The storm shelter** itself: the horde holding the hatch through the day, the hatch, the room, Earl (M9.3). Night 1's sigil is already there.
  - The real witch walking to plant on Night 1. Today the clip shows her and she stays home.
  - The campers' models.
  - The campsite's final look (Session 19).
- **Stand-in flags still left** for M9.3-9.4: `gasStationVisited`, `shelterVisited`, `rifleClaimed`, `outpostCall`, `outpostEntered`, `outpostCleared`.

## Next: Session 15b, Level & Encounter Designer (+ Narrative): play-test fixes for the first day (M9.2)

**Goal:** Aaron play-tests Session 15 (`PLAYTEST.md` is the checklist) and asks for tweaks. Expect lots of small ones. Fix each, push it to `main`, and repeat until he's happy. Then close M9.2 and hand over to Session 16.

**Done when:** a new player gets through Day 1 and Night 1 without help (M9.2's "done when"), and Aaron has confirmed the fixes.

**How to work (what Aaron and the sessions have settled into):**
- Take his notes one at a time. A small, clear tweak: just do it and push.
- Anything that changes the design, or where there are two real options: ask first, in a line or two, with a recommendation.
- Push each fix to `main` (it deploys to the live build in about 40 s) and to the session's branch. Keep `npm test` and `npm run build` passing.
- After each round, add the fixes to `STATUS.md` (an "After Aaron's play-test" list under Session 15) and to `OPEN_QUESTIONS.md` if they settle a question (#185-197).
- Keep `PLAYTEST.md` current: tick what Aaron confirmed and add what to try after each fix.

### Where the likely tweaks live

Most are numbers or data, not code:

| Tweak | Where |
| --- | --- |
| The menu feed (camera, hour, look) | `src/data/cutscenes.json` `menu.feed` |
| Menu buttons, text, layout | `src/ui/StartScreen.js`, `src/style.css` (`.start-screen.menu`, `.start-choice`) |
| The opening (cold open, waking: timing, look, where Tom wakes) | `cutscenes.json` `opening.coldOpen`, `opening.wake`; `config.firstDay.wake` |
| The tower view (the red light, the smoke, the turn, timing) | `cutscenes.json` `day1.tower`; `config.firstDay.tower` |
| Campsite layout (tents, car, search points, props, stick figures, marks) | `src/data/campsite.json` (the campsite's frame: x right, z ahead from the path in) |
| Campsite looks (colours, sizes, the slashed tent, the smoke) | `config.campsite.look`; `src/render/CampsiteProps.js` |
| What each search gives | `campsite.json` `searches` (`gives`: guaranteed; `loot`: rolled) |
| The wave (count, speed, where from, spread) | `campsite.json` `wave` |
| The arrival sweep | `cutscenes.json` `sweep.campsite` |
| The camcorder clip (how much of her) | `cutscenes.json` `clip.camcorder` |
| Day 1's clock hold, health floor, nudge timings | `config.firstDay` (`holdHour`, `healthFloor`, `nudges`) |
| Night 1 (strays, when she plants, the hold radius) | `config.firstDay.night1` |
| Skip intro's kit | `config.firstDay.skip` |
| Any line's text, speaker, or when it plays | `src/data/dialogue.json` (`day1.*`, `day1.nudge.*` drafts) |
| Starting scrap and kit | `config.inventory.startScrap`, `config.weapons.startingLoadout` |

### Look at first

- `PLAYTEST.md`: what Aaron is trying and what "good" looks like.
- `story/FirstDay.js`: the whole Day 1 / Night 1 / Dawn 1 / Skip intro script, in one place. `currentStep()` tells you where a run has got to.
- `encounters/Campsite.js`: the campsite's beats (arrival, searches, camcorder, shotgun, wave, battery).
- The debug menu's **First day & campsite** category:
  - replay the opening or the tower view;
  - teleport to the campsite path;
  - start the wave or reset the campsite;
  - plant the Night 1 sigil and play camera six;
  - send the strays;
  - show the current step.
- Every new cutscene is also under **Cutscenes**.

### Gotchas and decisions from Session 15

- **Cutscene anchors:** "ahead" is `(-sin yaw, -cos yaw)`. **For `home`, yaw 0 means ahead is north, into the cliff**: use negative z for south (the menu feed was black until this was fixed).
- **The campsite's frame vs cutscenes:**
  - `frameAnchor()` gives a cutscene anchor that matches the campsite's frame (x right, z ahead).
  - Positions in `campsite.json` and in `clip.camcorder` / `sweep.campsite` (anchor `campsite`) use the same numbers.
  - Data yaws turn toward your right (`frameYaw`).
- **Fog vs the tower:** the medium preset draws about 80 m and the campsite is about 150 m from the tower. So `day1.tower` draws its smoke and the red light at the edge of sight (`fog: false` actors), along the true line.
- **The torch-glare rule still holds:** the campsite's colours are dark on purpose. A white light vanishes into the pale fog by day, which is why the far light is red.
- **Lines played only by a system are `cued`** (never picked by talking to the family); drafts are marked `draft`. `Dialogue.say(id)` checks conditions; `play(id)` forces a line.
- **Day 1's clock hold** waits for the battery *and* no fence panel at 0 health: Night 1's strays walked straight through the torn panel otherwise.
- **Saves:** new saves carry `campsite` and the sigil's `hold` / `known` / `firstSigil` (optional; older version-2 saves still load).
- **Headless checks** (Playwright, `window.game` in dev):
  - Frames are very slow and dt is capped, so cutscenes barely move in real time. Step the game by hand: `for (...) game.update(0.05)`, then screenshot.
  - For the menu: hide `.start-screen` and call `game.onStartChoice('new' | 'skip')`.
  - Judge frame rates only on Aaron's tablet.
- **Vite `base` is `/WitchHunt/`, and the live build deploys from `main`.**

### Open questions for Aaron

- **#185-197 (Session 15):**
  - the nudge lines;
  - the clock hold;
  - "can't fail";
  - the campsite's numbers;
  - how much of her the camcorder shows;
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

## After that: Session 16, Level & Encounter Designer + AI Programmer: the storm shelter and the gas station (M9.3)

**Goal (DESIGN.md "Build plan" M9.3):**
- **The storm shelter:**
  - the horde that holds the hatch through the day;
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

**For that session:**
- **The Night 1 sigil** is planted by `FirstDay.plantShelterSigil()` (`hold`, `firstSigil`). Its dead are raised at night and sink at dawn today (`EnemyManager.thinOut`). DESIGN wants the shelter's horde to stay through the day.
- **`encounters/Campsite.js` is the pattern** for a data-built encounter:
  - a clearing frame;
  - hold-X searches;
  - a scripted wave;
  - a fixed car spot (`vehiclePlacement` `fixed`);
  - save state;
  - debug items.

## Session kickoff prompt for the next session

```
You are the Level & Encounter Designer (with the Narrative Designer's hat) on Witch Hunt, Session 15b: Aaron's play-test of Session 15, the first day (M9.2), and the tweaks it turns up. Session 15 built the main menu, the opening, the Day 1 tower, the campsite (camcorder, shotgun wave, first battery), home, the scripted Night 1 sigil at the storm shelter, Dawn 1, Skip intro and the shotgun out of the starting kit; it's live on main. Expect lots of small tweaks: take Aaron's notes one at a time, push each fix to main so he can try it, and ask first only when a change is a design call.
Read HANDOVER.md first (it has a table of where each likely tweak lives), then PLAYTEST.md, STATUS.md (Session 15), OPEN_QUESTIONS.md (#185-197) and docs/DESIGN.md ("Abandoned campsite", "Opening and first run", "Day 1 tutorial lines").
Then confirm your role and that you're ready for Aaron's notes.
Follow the handover protocol: when Aaron's happy, update STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md for Session 16 (the storm shelter and the gas station, M9.3), and end with the HANDOVER READY signal.
```
