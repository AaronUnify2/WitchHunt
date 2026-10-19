# Handover

## Just finished: Session 14, Lead Engineer: the cluster on the map (M9.1)

**Status: done.** Everything is pushed to `main`, which Aaron play-tests from. 512 tests pass and the build is clean.

**How we worked (agreed with Aaron at the start):** a plan in the chat, then each step pushed to `main` for him to play-test. Rule 10's workshop for the road, the cordon and the gates was a short proposal he agreed to.

### What was done

Seven steps. Details are in `STATUS.md` (Session 14). The open points are in `OPEN_QUESTIONS.md` (#171-181).

1. **The fixed opening cluster** (`src/data/openingCluster.json`):
   - The station, campsite, storm shelter, gas station, outpost and the family cemetery (its sigil ground) are placed first, identical on every seed, with a loop of fixed pathways.
   - The land north of the cordon is fixed too: the cliff, hills, trees, rocks and cars.
   - The frontier joins the cluster by one pathway, due south out of the outpost through the checkpoint.
2. **The road:** in from the west edge, past the gas station's forecourt, through the outpost and the checkpoint. It has telephone poles, a ROAD CLOSED sign and three fixed wrecks.
3. **The cordon:** chain-link and razor wire edge to edge of the map, just south of the outpost, with signs, dark floodlights, barriers and the checkpoint. Whole panels stop everyone; the torn gaps and the shut checkpoint stop only Tom.
4. **Story progress flags** (`src/data/progress.json`, saved) **and the gates** that open on them:
   - shelter spur: a pipe gate (`night1`);
   - gas station trail: a fallen oak (`day2`);
   - the outpost's road and cemetery gates (`outpostCall`);
   - the checkpoint (`outpostCleared`).

   The flags' triggers are **stand-ins** until the real beats.
5. **The witch's cluster rule:** until `crossedCordon`, she plants only inside the cluster.
6. **The flare gun:** Y / F fires a flare like a round, and a direct hit conks. Only the newest flare lights and lures; the witch is never lured. You start with 3 and carry 3.
7. **Camera six** is fixed at the storm shelter (#153). The seeded trail cameras are all in the frontier.

**After Aaron's play-test** (all pushed): the new props toned down under the torch; a flare fired up arcs over and drifts down; you can run from the witch early on (`config.witch.pursuit`); cutscene actors walk forwards; cars twice as quick to loot; **cars blow up** (`config.vehicles.damage`); no foliage floating beside the trees.

**Decided with Aaron (also in OPEN_QUESTIONS, Session 14):**
- Push each step to `main`.
- The cluster's layout follows my recommendation, and the cluster counts toward the 22 clearings.
- The road, cordon and gates were built as proposed.
- **The gates stay soft barriers for now**: Tom can push round them through the undergrowth. To revisit later.
- **The flare gun fires like a gun** (a projectile along the crosshair that can conk a zombie). The newest flare alone casts light and lures; older ones only glow.

### Unfinished

Nothing in scope. By design, the following belong to later sessions:
- **The stand-in triggers** in `src/data/progress.json`. Each story session replaces its flag's trigger with its own beat: call `game.progress.setFlag('<id>')`, and delete the stand-in trigger or set its `standIn` to false.
  - `night1` (M9.2: the family's "go dig it up");
  - `campsiteVisited` and `day2` (M9.2);
  - `gasStationVisited`, `shelterVisited` and `rifleClaimed` (M9.3);
  - `outpostCall`, `outpostEntered` and `outpostCleared` (M9.4).
- **The oak on the gas station trail** opens on `day2`. If the campsite gives Tom a saw or an axe (M9.2's call), the cut can become an action.
- **The Mothman's flare attention** is counted (`combat.flares.attention`) and unused until M10.

## Next: Session 15, Level & Encounter Designer (+ Narrative): the first day (M9.2)

**Goal (DESIGN.md "Build plan", M9 part 9.2, and "Team roles and session plan", Session 15):**
- The main menu.
- The opening cutscene.
- The Day 1 tower.
- **The campsite:** the camcorder, the shotgun wave and the first battery.
- The scripted Night 1 sigil.
- Dawn 1.
- Skip intro.
- The shotgun taken out of the starting kit.
- Its lines, written with Aaron.
- **Done when:** a new player gets through Day 1 and Night 1 without help.

Workshop first (rule 10): the campsite's layout and beats, the opening, the tower, and the Night 1 sigil's staging. DESIGN.md "Abandoned campsite", "Opening and first run", "Day 1 tutorial lines" and "Storm shelter" (for Night 1) have Aaron's design.

### Look at first

- **The cluster's places:** `src/data/openingCluster.json`.
  - The campsite is `dx -130, dz 70` from home, radius 20.
  - The storm shelter is `dx 150, dz 90`, and camera six stands at its clearing.
  - `world.map.clearings.find((c) => c.cluster && c.key === 'campsite')` finds a place.
- **Story flags:** `story/StoryProgress.js` (`setFlag`, `has`), `src/data/progress.json`, and `story:flag` events. Lines can name flags as conditions (`Game.storyFlags()`).
- **The Day 1 lines and their real triggers:** `src/data/dialogue.json`, `story/Dialogue.js`. Lines 1-2 wait for a `story:opening` event.
- **The Night 1 clip:** `clip.night1` in `src/data/cutscenes.json` (anchored to `trailCam:6`, a placeholder shot).
- **The starting kit:** `config.weapons.startingLoadout` (the shotgun is still in it).
- **The campsite's cars:** `config` / `data/vehicles.json` `placement.campsite` (one sure car with a battery; it stands in the same place every run now).
- **The witch's planting:** `ai/Witch.js`, `ZombieDirector.chooseSpot()`. The scripted Night 1 sigil is new (she rests on night 1 today).

### Gotchas and decisions from Session 14

- **The cluster is fixed, and so is everything seeded north of the cordon.** Anything you place there should be fixed too (use a fixed seed, for example `new Rng(\`${geo.cluster.seed}:<label>\`)`), so the opening is the same every run. `GroundField.isFixed(z)` tells you if a point is north of the line.
- **Cluster clearings carry `cluster: true`** and keep their ids 0-5 in the data's order: home is 0.
- **`playerOnly` colliders** stop only the player: the gates and the cordon's gaps and checkpoint. Zombies and the witch pass, and shots pass all of them (segments without `blocksShots`).
- **Gate wings reach 7-11 m into the trees.** Don't place props or encounter content right across a gated path, or the gate will fight it.
- **The road passes the gas station about 14 m south of its centre.** Its building should stand north of the road (Session 16, M9.3). The telephone poles run on the north side, so one may need moving when the building goes in (`config.map.road.poles`).
- **The lure:** while a flare burns, zombies within 35 m are in `lured` mode. Scripted waves (the shotgun wave) should expect that if the player fires one.
- **Cars blow up:** a blast near the campsite's sure car (or any scripted wave next to cars) can chain. `vehicles.damage()` / `explode()`; wrecks are saved.
- **Lights:** still never add or remove them mid-play. The flares share one light made at load.
- **Saves** are version 2. Add new state to `collectSave()` / `applySave()` as optional fields, so a save from earlier in the session still loads.
- **Headless renders** (for checking a scene): drive the game with Playwright (`window.game` in dev). Start the run with `game.onStartChoice('start')` and hide `.start-screen`, then teleport with `game.player.teleport(x, z, yaw)`. With that yaw, `yaw = atan2(-dx, -dz)` faces the direction (dx, dz): 0 faces north. Judge frame rates only on Aaron's tablet.
- **Vite `base` is `/WitchHunt/`. The live build deploys from `main`;** push each step there so Aaron can play-test it.

### Open questions for Aaron

- **#171-184 (Session 14; #182-184 after the play-test: the flare's conk, the witch's leash, exploding cars' numbers):**
  - the cluster's distances;
  - the cemetery as its sigil ground;
  - the cemetery-outpost path;
  - the stand-in triggers;
  - how the dead cross the cordon;
  - the flare's numbers and sources;
  - the witch with nowhere to plant;
  - camera numbers;
  - the road, cordon and gates' look;
  - old saves.
- **From before:**
  - #161-170 (Session 13: the torch on pale models, the witch's eyes and pose, the station's brightness, furniture and sieges, the cars' wear, the Men in Black, Earl, the softened looks);
  - #155-160 (the looks, the family face to face, clips holding the world still, sightings, idle lines, the camera's lamp);
  - #143 (which encounters give the SMG, the heat-scope rifle and the auto shotgun);
  - #136 (an item that tags the witch);
  - #137 (fog nights and gameplay);
  - #140-141 (the settings screen, Session 28).

## Session kickoff prompt for the next session

```
You are the Level & Encounter Designer (with the Narrative Designer's hat) on Witch Hunt, Session 15: the first day (M9.2): the main menu, the opening cutscene, the Day 1 tower, the campsite (camcorder, shotgun wave, first battery), the scripted Night 1 sigil, Dawn 1, Skip intro, the shotgun out of the starting kit, and its lines written with Aaron. Session 14 (Lead Engineer) put the fixed opening cluster on the map: the road, the cordon, the gates and the story progress flags they open on (stand-in triggers for your beats to replace), the witch's cluster rule, the flare gun and the storm shelter's camera six.
Read docs/DESIGN.md (especially "Fixed opening cluster", "Abandoned campsite", "Storm shelter", "Opening and first run", "Day 1 tutorial lines", "Build plan" and "Team roles and session plan"), STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md.
Then confirm your role, this session's goal and any questions before starting. Workshop content with Aaron first (rule 10), and push each step to main so he can play-test it.
Follow the handover protocol, and end with the HANDOVER READY signal.
```
