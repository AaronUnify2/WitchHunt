# Handover

## Just finished: Session 11, Lead Engineer as design reviewer (no code)

**Status: done.** Everything is pushed to `main`. Only `docs/DESIGN.md`, `STATUS.md`, `OPEN_QUESTIONS.md` and this file changed. 388 tests pass and the build is clean.

### What was done

All in `docs/DESIGN.md`, four commits, each agreed with Aaron:

1. **Aaron's story and encounter design**, folded in as he wrote it (Oct 16):
   - **The fixed opening cluster.** The station, campsite, storm shelter, gas station and military outpost are the same on every run. Everything past the outpost is the seeded frontier.
   - **The soft-gated paths:** campsite → (the shelter from Night 1) → gas station → outpost.
   - **The military cordon**, and **Ellen's call to adventure:** she sends Tom to report that the witch is outside containment, and he finds the outpost overrun.
   - **The hunting rifle chain:** the gas station's safe → the combination on the owner's body at the storm shelter → the rounds in the outpost's watchtower.
   - The four encounters in full (beats, enemies, loot, edge cases), the owner's diary and trail-cam tapes, helmets that block headshots, the dogfight seen through the scope, the Mothman's container, Bigfoot as a nature spirit, and "Ideas for later" (setting year 2003, the Caller's first whisper, make the walk back matter).
2. **Ten conflicts settled** (Aaron accepted all of them; listed in OPEN_QUESTIONS, Session 11):
   - The cordon blocks Tom, not the dead: they get through torn gaps.
   - She plants only inside the cluster until the barricade is crossed.
   - Night 1's sigil at the storm shelter is scripted. Its horde holds the hatch by day.
   - One authored road. No checkpoint or roadside clearing types in the cluster.
   - The scope cutscene plays at the barricade if Tom skipped the tower.
   - The barn, crashed plane, mineshaft and Car Armory are the **north frontier**.
   - **More encounter updates are coming** (Aaron is still redesigning the random encounters).
3. **The doc brought up to date with what's built (Sessions 1-10b):**
   - Weapon keys 1-8 and shared ammo pools. The shotgun is still in the starting kit. **The flare gun isn't built** (it's in M9.1).
   - Hiding, marches, revisits, the danger formula.
   - The witch's 1000 health, fight pattern and look.
   - The point of no return deleting the save.
   - Fog nights and the heat scope. Art is generated in code. The tree kinds and near trunks.
   - The file structure as it stands.
4. **New milestones and session plan:**
   - **M8 = the story systems.**
   - **Session 13 = a standalone, play-test-driven art session** for the coming encounters' character models and the deferred 10b art.
   - **M9 = the opening cluster, in four parts (Sessions 14-17).**
   - QA after each content milestone, and a new rule 12: play-test generously.
   - **Every cutscene goes in a Cutscenes debug category.**
   - Sessions renumbered up to 32.

### Unfinished

Nothing in scope. Aaron has since settled #149 (the shelter is a spur), #151 (2003; the capsule buried in 1903), #152 (the owner is Earl Pruitt), #154 (one early charge is fine), #150 (one sigil ground inside the cluster) and #153 (the Pruitts die on Night 1). Still open from before: #143 (which encounters give the SMG, the heat-scope rifle and the auto shotgun) and #136 (an item that tags the witch).

## Next: Session 12, Narrative Designer: M8, the story systems

**Goal (DESIGN.md "Milestones", M8):**
- The dialogue data file and its picker (conditions, priority, heard lines saved).
- Subtitles (speaker name, dark strip, advance on a button or after a delay), the talking bob, blips per speaker, the new-line marker.
- The radio with rate limiting.
- The trail cameras: fixed spots that report witch sightings as leads, not tracking.
- The cutscene timeline (camera, actors, timing, captions, triggers) and its three styles: CCTV, first-person and the establishing sweep.
- The CCTV, camcorder and trail-cam looks.
- Lore item hand-ins at the comms room, and rewatching clips on its monitors.
- **The Cutscenes debug category** (Aaron, Session 11): every cutscene, placeholders included, plays from the debug menu on the spot.

**Take over today's placeholders:**
- The point-of-no-return call (`ui/NoReturnNotice.js`, `data/ending.json` `noReturn`).
- NightWatch's graded radio calls (`base/NightWatch.js`).
- The ending and defeat cards (`ui/RunEndScreen.js`, `data/ending.json`).
- The final battle's 3.2 s intro (`encounters/FinalBattle.js`).

**Lines:** wire up only what's already written: the 23 Day 1 lines (DESIGN.md "Day 1 tutorial lines") and the ending's. **Don't write new lines** (Aaron, Session 11): each encounter session writes its own with him. The Day 1 lines can be wired as data and triggered from debug. Their real triggers come with M9.2.

**Done when:** a radio call, a CCTV patch-through and a face-to-face line all work from data alone, and every cutscene plays from the debug menu.

**Workshop first (rule 10):** the cutscene and subtitle look, and how the family speak and appear face to face. The family's look (#148) follows these decisions in Session 13. Split into 12a (dialogue, subtitles, radio, trail cameras) and 12b (cutscenes, the looks, hand-ins) if it grows.

### Look at first

- **DESIGN.md:**
  - "Story and lore": the radio, the dialogue system and its presentation, lore sources, the dialogue plan, the Day 1 lines.
  - "Cutscenes", including the new debug rule.
  - "Opening and first run".
  - The storm shelter's tapes cutscene and the outpost's two cutscenes, to see what the timeline format must handle.
  - "Build plan" (rules 10-12) and "Team roles and session plan".
- **Subtitles:** `ui/Toast.js` (`Toast.show(text, seconds)`) is today's stand-in.
- **The CCTV look:** `render/PostFX.js` holds the full-screen grade, vignette and grain pass, plus the heat scope's grade (`uThermal`). A CCTV or camcorder look can be another pass there, or its own composer for a patch-through view.
- **The debug menu:** `debug/DebugMenu.js`. Systems add tools with `menu.category(DEBUG.x).addItem(...)`. Add a Cutscenes category.
- **The save:** `core/saveData.js`. Heard lines and handed-in lore go here. Old saves must still load.
- **The family:** placeholder figures in `render/StationRenderer.js` (`config.station.look.family`). They're in the comms room.

### Gotchas and decisions

- **The atmosphere hook:** `installAtmosphereShader()` (first thing in `Game.init`) hooks `THREE.Material.prototype.onBeforeCompile`, so every fogged material gets the mist's uniforms. Use `fog: false` for screen-space or UI-like materials.
- **The grade follows the clock, and the blood night turns it red.** A cutscene that wants its own look should set the grade explicitly and hand it back afterwards. It must also leave the heat scope off (`postFX.setThermal(false)`).
- **The heat scope** switches the sky, the grade, bloom, the torch and the atmosphere effects each frame (`Game.updateThermal()`). Anything new that lives needs a `setThermal` hook.
- **Draw distance changes on fog nights** (`Game.setViewDistance()`). Cutscene cameras placed far off may sit beyond it.
- **The map screen pauses the game; the ledger and debug menu don't.** Decide, and log, whether cutscenes pause the clock. A frozen clock is already a pattern: the final battle and the no-return pop-up use it.
- **Headless runs:** drive `game.update(1/30)` with the render loop cancelled (`window.game` in dev). The software GPU runs at about 10 fps, so frame rates can only be judged on Aaron's tablet.
- **Vite `base` is `/WitchHunt/`. The live build deploys from `main`.** Push each step to `main` so Aaron can play-test it.

### Open questions for Aaron

- The cutscene look, the subtitle look, and how the family appear face to face (workshop at the start).
- #153 (settled): the Pruitts die on Night 1. The Hales' camera, further off, only catches the witch after they've fled its frame. M8's trail cameras need a fixed camera near the storm shelter for the Night 1 clip.
- The setting year is 2003 (#151, settled): it shapes the camcorder (miniDV), VCR and CCTV looks.
- From before: #137 (fog nights and gameplay), #140-141 (the settings screen, now Session 28).

## Session kickoff prompt for the next session

```
You are the Narrative Designer on Witch Hunt, Session 12: M8, the story systems (dialogue and its picker, subtitles, the radio, trail cameras, the cutscene system with its CCTV, camcorder and trail-cam looks, lore hand-ins, and a Cutscenes debug category that plays every cutscene). Build the systems and wire up only the lines already written (Day 1 and the ending); new lines are written later with each encounter. Session 11 reviewed docs/DESIGN.md and folded in Aaron's opening cluster.
Read docs/DESIGN.md (especially "Story and lore", "Cutscenes", "Opening and first run", "Build plan" and "Team roles and session plan"), STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md.
Then confirm your role, this session's goal and any questions before starting. Workshop the cutscene and subtitle look with Aaron first (rule 10), and push each step to main so he can play-test it.
Follow the handover protocol, and end with the HANDOVER READY signal.
```
