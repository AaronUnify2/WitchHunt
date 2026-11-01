# Handover

## Just finished: Session 16, Level & Encounter Designer + AI Programmer: the storm shelter (M9.3 done) and two playthroughs from the start

**Status: everything is on `main` (live).** 590 tests pass and the build is clean. M9.3 is done: **the hunting rifle is claimable on every seed** (the shelter's in the fixed cluster; Earl's keys open the gas station's safe). Then Aaron played the game from the very beginning twice, and his notes were fixed round by round. Details are in `STATUS.md` (Session 16, items 1-34).

**How we worked:** Aaron sends a batch of notes; I fix them in small commits, each pushed to `main` (it deploys in about 40 s) and to the session's branch; design calls asked first (a line or two, with a recommendation), small ones made and logged in OPEN_QUESTIONS. `PLAYTEST.md` is the running checklist (rounds 16-19 at its top are this session's).

### What was done

- **Aaron's notes on the 15b overnight work:**
  - The quad's own headlamp (on in the dark, D-pad right toggles it, dims up close).
  - A snare ridden over wraps round the quad's wheel: get off, tap X to free it.
  - No digging the sigil up on Night 1.
  - Night 1's waves overlap (each 15 s after the last rose).
- **Papers in close-up** (`ui/PaperNote.js`, `data/papers.json`): Earl's note at the gas station and his diary. The world waits while one's open.
- **The storm shelter** (`encounters/StormShelter.js`, `data/stormShelter.json`, `render/StormShelterProps.js`):
  - 12 citizens hold the hatch through the day, Earl (zombie variant `earl`) among them.
  - While Night 1's sigil is in the ground the dead keep climbing out of it, by day too. Dug up, they stop, and the family work out the sigils raise the dead.
  - Earl's keys (the safe's combination).
  - The hatch: dig it clear with the shovel, haul it open, climb down.
  - The room below (a player platform under the hatch): the diary and the tapes only.
  - The tapes at home: `clip.pruittTape`, camera four, handed in at the ledger. The kids run into the trees: maybe they got away (Aaron: nothing says the children died).
- **The rifle chain is real:** `rifleClaimed` and `shelterVisited` have no stand-in triggers now.
- **Playthrough round 1:**
  - Ellen's tower instruction can't be skipped.
  - The red light: the family say it's the military, a "training exercise".
  - The bloody wreck on the campsite trail is there every run.
  - The dome tent searches from any side; no stick figures; the shovel out of the wall.
  - **Tapes and feeds wait for D-pad down** (`story/WatchQueue.js`).
  - **Objectives** (`story/Objectives.js`): "NEXT: ..." on the map screen, a gold star there and on the minimap's rim.
  - The gas station after the witch points to the phone, then Earl's radio. The note says "That witch".
  - The shelter's sweep 32 m out; the hatch off the sigil; a 1996 diary page.
  - The quad 20% quieter.
- **Playthrough round 2:**
  - The comms room's first aid box (2 kits); Tom starts with no first aid kits or flares.
  - Hints for the torn fence and the shovel.
  - Less glare up close (the fence, the torch, the quad's headlamp).
  - Blue trail cams and an orange quad icon on the maps.
  - Ellen's hints that she worked at the facility.
  - **A debug jetpack** (Player menu).

### Unfinished

- **Aaron's next playthroughs:** he said he'd keep iterating by playing from the start. Expect more batches of notes like rounds 1-2. Start the next session by asking whether he has any.
- **Ideas he's floated for later** (DESIGN "Ideas for later"):
  - quad upgrades (a spiked battering ram; an alien ray gun usable from the saddle);
  - a jetpack for dungeon-style play (the debug one is the try-out).
- **Belongs to later sessions:**
  - the real witch walking to plant on Night 1;
  - the campers' models;
  - the final look of the campsite, the gas station and the shelter (style pass 2, Session 19);
  - muffling the world's sound down in the shelter (audio pass).
- **Stand-in flags still left:** `outpostCall` (fires once `rifleClaimed` is set), `outpostEntered`, `outpostCleared`.

## Next: Session 17, Level & Encounter Designer + AI Programmer: the military outpost (M9.4)

**First:** ask Aaron for any notes from his latest playthrough (PLAYTEST rounds 16-19) and fix those one at a time.

**Goal (DESIGN.md "Overrun military outpost", "Build plan" M9.4):**
- the approach waves;
- helmets;
- the watchtower and its rifle rounds (the hunting rifle comes empty from the safe);
- the scope as binoculars, and the dogfight cutscene seen through it;
- the barricade peak;
- the containers, and the Mothman's container;
- beetles;
- Ellen's call to adventure (replace `outpostCall`'s stand-in with the real beat);
- `outpostEntered` and `outpostCleared` set by the encounter;
- crossing the checkpoint opens the frontier;
- the **performance gate** on the tablet (the biggest fight so far).
- **Done when:** the frontier opens, on every seed.

**For that session:**
- **Follow the newest pattern, `encounters/StormShelter.js`** (and `GasStation.js`):
  - a frame from `clearingFrame()`;
  - layout in a data file;
  - props merged by colour;
  - authored zombies (`authored` in `spawnZombie` opts: not thinned at dawn; a reused slot starts clear);
  - hold-X interactions;
  - first-person and sweep cutscenes with named anchors;
  - save state;
  - debug teleports;
  - an overlay line.
- **Add its steps to `story/Objectives.js`** (after the safe), so the map always says what's next.
- **Any tape or feed:** offer it through `WatchQueue` (D-pad down) instead of playing it on the spot.
- **Any paper** (a field report, orders): add it to `data/papers.json` and open it with `PaperNote`.

### Gotchas and decisions from Session 16

- **Room platforms:** `player.platform` with `room` set is a room under the ground (the shelter).
  - `Player.keepInRoom()` keeps Tom in its box and out of its furniture.
  - Zombie strikes, witch swipes, traps, the sigil dig and the tower's prompts all skip a platform; check `platform.room` if you add a platform-sensitive feature.
  - `teleport()` clears the platform.
- **The dead are 2D:** they gather over the shelter while Tom's below, and can't reach him.
- **`WatchQueue`:** items aren't saved; whoever offers re-offers on load (see `Campsite.offerTape()`). Night 1 holds short of dawn until camera six is watched (no fallback timer, OPEN_QUESTIONS #224).
- **`Objectives.work()`** reads the story systems directly and is evaluated every 0.4 s. Keep its steps in story order. `null` `at` means no marker.
- **Cutscenes skipped with A don't fire their `emit` tracks:** use `onDone` as well (as `shelter.down` / `shelter.up` do), and lines inside a skipped cutscene are cleared (the opening's line 2 now plays from `onDone`).
- **Glare:**
  - The torch only dims on colliders that block shots or are marked `glare` (the station fence is now).
  - The quad's lamp does its own rays (`Quad.updateLampGlare()`).
  - Keep new props dark (the torch-glare rule).
- **Bindings:** D-pad down is `watch` (it was the unused `radio`). D-pad right is first aid on foot and the headlamp in the saddle.
- **Vehicles:** `fixed.trail` candidate spots and `v.bloody` (forced blood and a smashed window) are how the campsite trail's wreck is guaranteed; reuse for any authored wreck.
- **Headless checks:**
  - Use `window.game` on the dev server; step with `game.update(0.1)`.
  - Skip intro, then set `clock.day = 2` for day-2 places.
  - Cutscenes run slowly in swiftshader, so wait or `cutscenes.stop()`.
  - Don't `pkill` the dev server in the same command as other work (it ends the shell).

### Open questions for Aaron

- **Session 16:**
  - #213-221 (the shelter: Earl a zombie, the rising rate, the room as a platform, reading pauses the game, the diary's dates, the tape, the drafts, the diary read once, the horde not saved);
  - #222-224 (the map star through the fog, the objectives' wording, watching never forced).
  - #198-212 are settled (MORNING.md).
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
You are the Level & Encounter Designer (with the AI Programmer's hat) on Witch Hunt, Session 17: first any notes from Aaron's latest playthrough of the opening (PLAYTEST rounds 16-19), then the overrun military outpost (M9.4): the approach waves, helmets, the watchtower and its rifle rounds, the scope as binoculars and the dogfight cutscene, the barricade peak, the containers and the Mothman's container, beetles, Ellen's call to adventure, crossing the checkpoint into the frontier, and the performance gate. The storm shelter is built (encounters/StormShelter.js is the pattern to follow; story/Objectives.js, story/WatchQueue.js and ui/PaperNote.js are the new story tools).
Read HANDOVER.md first, then STATUS.md (Session 16), PLAYTEST.md (rounds 16-19), OPEN_QUESTIONS.md (#213-224) and docs/DESIGN.md ("Overrun military outpost", "Fixed opening cluster", "Build plan" M9.4).
Then confirm your role and ask Aaron for his notes.
Follow the handover protocol: when Aaron's happy, update STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md for the next session, and end with the HANDOVER READY signal.
```
