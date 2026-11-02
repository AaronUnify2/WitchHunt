# Handover

## Just finished: Session 18, QA & Balance: Aaron's early-game notes, the outpost's pacing, the QA pass

**Status: everything is on `main` (live).** 654 tests pass and the build is clean. **Session 18 stays open until Aaron has done his playthroughs** of rounds 25-26 (he's doing several detailed ones). Fix his notes one at a time first; only then hand over to Session 19. Details: `STATUS.md` (Session 18 and its round 5), `PLAYTEST.md` rounds 25-27, `OPEN_QUESTIONS.md` #257-281.

**How we worked:**
- Aaron gave his notes from an early-game playthrough and his answers up front, then: "complete the entire session in one big pass", tune freely, flag anything unsure for playtesting, push to main as you go.
- Three rounds, each pushed to the session branch and to main:
  1. his early-game notes;
  2. the outpost's pacing;
  3. the QA pass.
- Then round 5 (round 4 was its first half), from his second set of notes:
  - the outpost reordered: C-7 on the way in, the hunting rifle's rounds in the gun pit, the beetles' burst on the second crate, the dogfight last;
  - the scanner needs a battery;
  - the sweeps, looser clothes, polish.
  See STATUS (Session 18, round 5).
- The calls I made are OPEN_QUESTIONS #257-271: the doc for him to answer while playing.

### What was done

- **Papers taken with A** (`ui/PaperNote.js` `promptText()`, `open(id, { take: true })`):
  - a paper found in the world says "A: take it" on its last page, and leaves where it lay: Earl's note, the diary, the field report and the manifest;
  - the shelter's colouring book no longer looks like the diary (#258: the likely cause of "the diary's still there").
- **The gas station's pumps blow when shot** (`GasStation.pumpShot()` etc.; `config.gasStation.pumps`):
  - a hiss first, then a big blast that chains to the other island and the cars;
  - stumps are left, and saved.
- **The dig takes 2 s**, and a sigil being dug raises nothing (the storm shelter's rising too).
- **A stop at home** on the ride back from the shelter (`story/HomeStop.js`):
  - Wyatt's call as Tom nears home;
  - inside the fence, Ellen and a hint point to the fence box or the ledger;
  - an objective step;
  - riding straight past counts as done.
- **Barricades outside the fence:** the dead claw them first. Changed in the routing, the prompts and the ledger's plan (the outer ring).
- **The outpost given time to breathe:**
  - **C-7** is on the road in, by the first helmet, ~35 m from the tower;
  - **`beatGap`:** 15 quiet seconds after each beat before the next one that comes by itself;
  - **the beetles:** four crates burst together, 1-2 s apart;
  - **Wyatt's scope ask** waits for the quiet.
- **QA:**
  - **ammo audit** (STATUS, Session 18): it holds by day if the tower or the machine gun is used, and is short at night on foot. The gun pit now gives a sure 6 rifle rounds;
  - **performance** at the worst case, headless: under 1 ms of simulation, ~145 draw calls;
  - **the dusk choice:** not a real choice in the opening; judged again in Session 23;
  - **a save round-trip** with the new state.

### Unfinished

- **Aaron's playthroughs of rounds 25-27:**
  - start by asking for his notes;
  - fix them one at a time, pushing each to main.
- **The tablet's fps** at the barricade's peak by night with the beetles out (#270). He saw no drop.
- **Ideas, not built** (#271):
  - a fire burning on the blown pumps;
  - a family line when they go up;
  - the ledger opening by itself at the home stop.
- **From before:**
  - the crash sites (Session 20);
  - the outpost's final look (Session 19);
  - a jeep model;
  - `clip.mothmanContainer`;
  - the audio pass.

## Next: Session 18 continued (Aaron's notes), then Session 19, Graphics Engineer: style pass 2

**First:** ask Aaron for his notes from rounds 25-27 and fix them as before. Check against OPEN_QUESTIONS #257-281 as he answers them.

**Session 19's goal (DESIGN.md "Build plan"):**
- style pass 2 on the opening cluster's places: the campsite, gas station, storm shelter, outpost, the cordon and the road;
- their camera looks.

New things to style:
- the blown pumps' wreck;
- C-7 on the road's shoulder (it's off the levelled clearing: check the trailer sits right);
- the outer barricade ring at home.

### Gotchas and decisions from Session 18

- **Papers:**
  - Open a found paper with `paper.open(id, { take: true, ... })`, and hide its prop when it's taken. The ledger's re-read opens without `take`.
  - A new paper still needs a lore item with a `paper`.
- **The outpost's order (round 5):**
  - `Outpost.dogfightReady` gates the dogfight: cleared and `told.beetlesDone`;
  - the hunting rifle's rounds: `roundsAt()` (the gun pit);
  - the beetles: `breakCrate()` starts `startBurst()` on the second crate opened.
- **The scanner:** `GasStation.useScanner()` uses a battery; `done` has `scannerTried`.
- **FamilyTalk** offers only someone with something new to say.
- **Pacing at the outpost:**
  - **Something that should happen by itself:** gate it on `this.quiet()` and call `this.beat()` after its lines.
  - **Something Tom does himself:** never gate it, but call `beat()` after it.
  - `talking()` reads the subtitles and the radio queue.
- **Barricades:**
  - `barricadeOutside` (config) replaced `barricadeInside`.
  - In `fenceRoute` the order is barricade then fence coming in, and the reverse going out.
  - The away-from-home resolver (`Station.attackDamage`) already treated the barricade as the outer layer.
  - The fence only zaps what's clawing the fence itself (#263).
- **The pumps:**
  - `weapon:impact` near a pump unit counts as damage;
  - `explosion` events light the islands (`source: 'pumps<i>'` skips its own);
  - the gas station gets `explosives` in its ctx now.
- **HomeStop:**
  - due only with `earlCombination` and not `rifleClaimed`;
  - its flag `homeStop` drops the objective step.
- **Headless:**
  - The arrival sweep (`sweep.outpost`) holds the world when you teleport near the outpost: stop the cutscene before measuring.
  - Lines take a long real time in swiftshader (slow frames).
  - My harness: Playwright on `localhost:5173`, `window.game.onStartChoice('skip')`, hide `startScreen`, call debug items by label (`game.debugMenu.categories`).

### Open questions for Aaron

- **Session 18:** #257-281:
  - most are to check in play;
  - #263, #266 and #268 are settled (#278, #280, #281);
  - #276 (the forecourt's battery: the scanner or the machine gun).
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
- Aaron: the backlog will be worked through soon (not this session).

## Session kickoff prompt for the next session

```
You are QA & Balance on Witch Hunt, Session 18 continued: Aaron has played PLAYTEST rounds 25-27 (the papers taken with A, the pumps, the 2 s dig, the stop at home, barricades outside the fence; the scanner's battery; the outpost reordered: C-7 on the way in, the rounds in the gun pit, the beetles' burst, the dogfight last). Start with his notes and fix them one at a time, pushing each to main.
Read HANDOVER.md first, then STATUS.md (Session 18), PLAYTEST.md (rounds 25-27), OPEN_QUESTIONS.md (#257-281) and docs/DESIGN.md ("Overrun military outpost", "Build plan").
Keep Aaron's rules: one idea at a time over the radio (Dialogue.playLater; at the outpost, Outpost.quiet()/beat()), cutscenes talk except busy ones marked linesAfter (the dogfight), tapes on D-pad down, papers taken with A and readable again from the ledger, breadcrumbs (hint.<step> lines).
Then confirm your role and ask Aaron for his notes.
When he's happy, follow the handover protocol: update STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md for Session 19 (Graphics Engineer, style pass 2), and end with the HANDOVER READY signal.
```
