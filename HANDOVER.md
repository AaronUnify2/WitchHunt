# Handover

## Just finished: Session 18, QA & Balance: Aaron's notes from two early-game playthroughs, the outpost reordered, the QA pass

**Status: everything is on `main` (live).** 654 tests pass and the build is clean. Details: `STATUS.md` (Session 18 and its round 5), `PLAYTEST.md` rounds 25-27, `OPEN_QUESTIONS.md` #257-281.

**How we worked:**
- Aaron gave his notes from an early-game playthrough and his answers up front, then: "complete the entire session in one big pass", tune freely, flag anything unsure for playtesting, push to main as you go.
- Five rounds, each pushed to the session branch and to main:
  1. his first notes;
  2. the outpost's pacing;
  3. the QA pass;
  4. and 5. his second notes (round 4 the small ones, round 5 the scanner and the outpost reordered).
- The calls I made are in OPEN_QUESTIONS #257-281, for him to check in play.
- **Rounds 25-27 aren't play-tested yet.** Aaron asked for the handover first.

### What was done

- **Papers taken with A** (`ui/PaperNote.js` `promptText()`, `open(id, { take: true })`):
  - Earl's note, the diary, the field report and the manifest say "A: take it" and leave where they lay;
  - the shelter's colouring book no longer looks like the diary.
- **The gas station:**
  - **the pumps blow when shot** (`GasStation.pumpShot()`; `config.gasStation.pumps`): a hiss, then a blast that chains to the other island and the cars; stumps are left;
  - **Earl's scanner runs off a car battery** (`GasStation.useScanner()`): dead without one; with one, longer chatter (Checkpoint Two overrun, "do not open the containers");
  - **the bulk ammo** behind the counter is 14/14 now.
- **The dig takes 2 s**, and a sigil being dug raises nothing.
- **A stop at home** on the ride back from the shelter (`story/HomeStop.js`).
- **Barricades stand outside the fence:**
  - the dead claw them first;
  - the fence zaps through them.
- **The outpost, in Aaron's order:**
  1. C-7 (the Mothman's torn container) by the road in, seen in the arrival sweep, with its own sweep on foot;
  2. the hunting rifle's rounds in the gun pit, with Wyatt's ask;
  3. the waves and the barricade's peak (the truck's moved off the road gap);
  4. the compound: one crate breaks by itself, the second opened sets off the rest;
  5. **last**, the dogfight from the tower, once the beetles are down.
  - Also: `beatGap` spaces the beats that come by themselves, and the machine gun has 25 rounds every 0.6 s.
- **Polish:**
  - the debug overlay is off on a new game;
  - new debug items: beetles, and the quad to Tom;
  - no empty talk prompt;
  - tents searchable from any side;
  - the campsite's and gas station's sweeps reworked;
  - looser clothes for Wyatt and Ellen;
  - Wyatt's camera-six line.
- **QA:**
  - the ammo audit (Aaron: heaps by the outpost, so trimmed);
  - performance at the outpost's worst case (headless: under 1 ms of simulation, ~145 draw calls);
  - the dusk choice isn't a real choice in the opening yet: judged again in Session 23.

### Unfinished

- **Aaron's play-test of rounds 25-27.** Notes from it come first in the next session (see below).
- **The tablet's fps** at the outpost's barricade peak by night with the beetles out (#270). He saw no drop.
- **Ideas, not built** (#271):
  - a fire left burning on the blown pumps;
  - a family line when they go up;
  - the ledger opening by itself at the home stop.
- **Later sessions':**
  - the crash sites (Session 20);
  - a jeep model;
  - the CCTV placeholder `clip.mothmanContainer`;
  - the audio pass (Session 29).

## Next: Session 19, Graphics Engineer: style pass 2 (the opening cluster's places and their camera looks)

**First:** ask Aaron if he has notes from his playthroughs of PLAYTEST rounds 25-27. Fix any bugs or small ones first, one at a time, pushing to main. Bigger changes go in OPEN_QUESTIONS for a QA session.

**Goal (DESIGN.md "Build plan", Session 19):** style pass 2 on the opening cluster's places, and their camera looks:
- **the campsite** (`render/CampsiteProps.js`);
- **the gas station** (`render/GasStationProps.js`: now with blown-pump stumps);
- **the storm shelter** (`render/StormShelterProps.js`: up top and the room below);
- **the military outpost** (`render/OutpostProps.js`), with C-7 on the road's shoulder: it's off the levelled clearing, so check its trailer sits right on the slope;
- **the cordon** (`render/Cordon.js`), the gates (`render/GateProps.js`) and the road (`render/Road.js`);
- **at home:** the barricades are an outer ring now (`StationRenderer`).
- **The camera looks** (`config.postFX.looks`; the cutscene styles `cctv | firstPerson | sweep | black`) on the opening's cutscenes:
  - the sweeps;
  - the camcorder;
  - the trail cams;
  - the dogfight;
  - the reveals.

**Rule 10 applies:** propose the build plan (what each place will look like, how it's made, what it costs in draw calls) and workshop it with Aaron before building.

**For that session:**
- **Style pass 1 (Session 10/10b) and Session 13** set the house look:
  - ground mist, fog nights, a time-of-day grade, the retro pixel filter;
  - figures built with `render/figureKit.js`;
  - props as vertex-coloured merged meshes, one per colour per place, with what changes in groups of its own (`ownGroup()` / `own()`).
- **Dull and dark:** pale props glare under the torch (Aaron, again and again). Keep colours dark.
- **The worst case for draw calls** is the outpost's barricade peak by night (~145 headless). Watch it as props get richer.
- **The model viewer** (Models category) shows the figures. Every cutscene plays from the debug menu's Cutscenes category.

### Gotchas and decisions from Session 18

- **Papers:**
  - Open a found paper with `paper.open(id, { take: true, ... })`, and hide its prop when it's taken. The ledger's re-read opens without `take`.
  - A new paper still needs a lore item with a `paper`.
- **The outpost:**
  - `Outpost.dogfightReady` gates the dogfight: cleared, and `told.beetlesDone`.
  - The hunting rifle's rounds: `roundsAt()` (`staging.gunPitRounds`).
  - `breakCrate()` starts `startBurst()` on the second crate opened.
  - A beat that should happen by itself: gate it on `quiet()` and call `beat()` after its lines. What Tom does himself is never gated.
  - C-7's sweep: not from the quad, and at most `c7MaxNear` of the dead about.
- **The gas station:**
  - `useScanner()` uses a battery (`done` has `scannerTried`);
  - the pumps listen for `weapon:impact` and `explosion` (`source: 'pumps<i>'`);
  - the gas station gets `explosives` in its ctx.
- **FamilyTalk** offers only someone with something new to say.
- **Barricades:**
  - `config.station.layout.barricadeOutside`;
  - `fenceRoute` goes barricade then fence coming in;
  - `Station.onStrike` zaps through a barricade while its panel stands;
  - the ledger plan's layers are `['barricade', 'fence', 'inner']`.
- **HomeStop:** due with `earlCombination` and not `rifleClaimed`; its flag `homeStop` drops the objective step.
- **Headless:**
  - Teleporting near the outpost starts its arrival sweep, which holds the world: stop the cutscene before measuring.
  - Lines take a long real time in swiftshader.
  - The dev server stops between long turns: run it as a background task.
  - My harness: Playwright on `localhost:5173`, `window.game.onStartChoice('skip')`, hide `startScreen`, call debug items by label (`game.debugMenu.categories`). Wait on a cutscene's clock with `game.cutscenes.current.t`.

### Open questions for Aaron

- **Session 18:** #257-281:
  - most are to check in play;
  - #263, #266 and #268 are settled (#278, #280, #281);
  - #276: the forecourt's sure battery now usually goes to the scanner; the outpost's truck still has a sure one for the machine gun.
- **From before:**
  - #225-256 (Session 17);
  - #213-224;
  - #185-197;
  - #171-184;
  - #161-170;
  - #155-160;
  - #143;
  - #136-137;
  - #140-141.
- Aaron: the backlog will be worked through soon.

## Session kickoff prompt for the next session

```
You are the Graphics Engineer on Witch Hunt, Session 19: style pass 2, the opening cluster's places (the campsite, the gas station, the storm shelter, the military outpost, the cordon, the gates and the road; the barricades at home) and their camera looks (the sweeps, the camcorder, the trail cams, the dogfight, the reveals).
Read HANDOVER.md first, then STATUS.md (Sessions 18, 17, 16, 15b and the style passes, Sessions 10, 10b and 13), docs/DESIGN.md ("Build plan", "Fixed opening cluster" and each place's section, "Cutscenes", the look and style sections) and OPEN_QUESTIONS.md (#257-281, and #144-148, #161-170 on the art).
First ask Aaron for any notes from his playthroughs of PLAYTEST rounds 25-27 and fix the small ones, pushing each to main.
Then, per rule 10, propose a build plan for the style pass (what each place will look like, how, and its cost in draw calls: the outpost's barricade peak by night is the worst case) and workshop it with Aaron before building. Keep his rules: dull and dark props (pale ones glare under the torch), one idea at a time over the radio, cutscenes talk except the dogfight.
Then confirm your role and ask Aaron for his notes.
When he's happy, follow the handover protocol: update STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md for the next session, and end with the HANDOVER READY signal.
```
