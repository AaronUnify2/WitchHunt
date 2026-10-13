# Handover

## Just finished: Session 10, Graphics Engineer, style pass 1 (part of M13)

**Status: done.** The slice looks good, and Aaron play-tested every step on the tablet: "the game looks great", with no frame-rate drop. Everything is pushed to `main` (Aaron: each step goes straight to `main` so he can play-test it).

### What was done

Details are in `STATUS.md` (the Session 10 sections) and `OPEN_QUESTIONS.md` (Session 10, #137-141). Agreed with Aaron first:
- **Art stays generated in code** (no texture files).
- **Night and dusk come first.**
- **References:** Appalachia, US forest rangers, a 1980s made-in-the-USA chainsaw manual, American folklore; Left 4 Dead, Silent Hill, Evil Dead 2.

1. **Fog and mist:**
   - **Ground mist in every fogged material** (`render/atmosphereShader.js`: three.js's fog shader chunks replaced).
   - **Drifting mist sheets** (`render/GroundMist.js`). Aaron's tuning: they face the screen (no hinge), are soft torn shapes, fade out by about 22 m, drift slowly, and there are 54 on Medium.
   - **Fog nights** (`world/fogNights.js`): about one in three, never night 1. The draw distance shrinks with the fog.
2. **The ground:** leaf litter, moss and grass, and path dirt drawn in code (`render/groundTextures.js`), blended by noise and the masks in `world/Terrain.js`, with mud patches. Each texture is read at two sizes so the repeat doesn't show.
3. **The trees:**
   - **Six kinds** (`render/treeSprites.js`, `config.forest.kinds`): hemlock, two spruces, white pine, a narrow bare oak (Aaron: the wide one showed it turning) and a snag.
   - **Per-tree tint.**
   - **Solid 3D trunks for the trees near you** (`render/NearTrunks.js`).
4. **Light and post-processing:**
   - **A colour grade by hour** (`render/PostFX.js`): split-toned, with faded print blacks and a blood-night grade.
   - **Fireflies** (`render/Fireflies.js`) and **dust in the torch beam** (`render/BeamDust.js`).
   - **Moonlight shafts in the clearings** (`render/LightShafts.js`).
   - **A faint torch beam in the air** (`render/TorchBeam.js`). Aaron: "much more subtle", now 0.01.
   - `render/Atmosphere.js` drives all of the above.
5. **The retro pixel filter** (`Renderer.setRetro()`): 270 lines with hard pixels, switched in the debug menu.
6. **Quality and debug:**
   - Each effect has a Quality-preset lever (`config.quality.presets`) and an on/off switch in the debug menu (Display & performance).
   - The overlay's `atmosphere` line shows the fog night and the mist.
7. **Tests:** 380 pass (fog nights, the packed ground masks, tree kinds by weight).

### Unfinished

Nothing in this session's scope. Left for later style passes (STATUS "Stubbed / placeholder"): normal maps on the ground, fallen logs and roots, breath on cold nights, distant impostor tweaks.

## Next: Session 11, Narrative Designer, M8 (family and storytelling)

**Goal (DESIGN.md milestones):** dialogue data and picker, subtitles, bob, blips, the new-line marker, radio and rate limiting, the three cutscene styles, the CCTV shader, lore item hand-ins.

**Done when:** a radio call, a CCTV patch-through and a face-to-face line all work from data alone.

**Workshop it with Aaron first** (rule 10). Cutscenes and lines are content.

### Look at first

- **DESIGN.md:**
  - "Story and lore": the radio, the dialogue system and its presentation, the dialogue plan, the Day 1 lines.
  - "Cutscenes".
- **Existing radio-ish pieces:**
  - The point-of-no-return call (`ui/NoReturnNotice.js`, `data/ending.json` `noReturn`).
  - NightWatch's graded radio calls (`base/NightWatch.js`).
  - The ending and defeat cards (`ui/RunEndScreen.js`).
  - These are the placeholders the dialogue system should take over.
- `Toast.show(text, seconds)` is the current stand-in for subtitles.
- **For the CCTV shader:** `render/PostFX.js` is the full-screen grade/vignette/grain pass. A CCTV or camcorder look can be another `ShaderPass` there, or its own composer for the patch-through view.

### Gotchas and decisions

- **The atmosphere hook:**
  - `installAtmosphereShader()` (first thing in `Game.init`) hooks `THREE.Material.prototype.onBeforeCompile`, so every fogged material gets the mist's shared uniforms. A material's own `onBeforeCompile` is wrapped automatically.
  - Materials made before the install would miss the uniforms, so keep it first.
  - Custom `ShaderMaterial`s with `fog: true` get the mist too. Use `fog: false` for screen-space or UI-like materials.
- **Draw distance changes on fog nights.** `Game.setViewDistance()` follows the fog in 5 m steps; `presetDrawDistance` is the preset's own. Anything that culls by draw distance should take `setDrawDistance()` like the others do.
- **The grade, mist and blood night:**
  - The grade follows the clock (`postFX.setTime(hour, sky.blood)`).
  - The blood night (`FinalBattle` → `sky.setBlood()`) turns the sky, fog, mist and grade red.
  - A cutscene that wants its own look should set the grade explicitly and hand it back afterwards.
- **The witch stays a shadow** (unlit `MeshBasicMaterial`). The mist sits low, so at 20 m her head and shoulders stand above it, and on a fog night she's a dim shape. Checked with Aaron.
- **The forest changed for every seed** (new tree kinds and sizes). Gameplay is unchanged (same trunk colliders).
- **Headless runs:**
  - Drive `game.update(1/30)` with the render loop cancelled (`window.game` in dev).
  - It renders on a software GPU at about 10 fps, so frame rates and the subtler effects (the beam, the shafts) can only be judged on Aaron's tablet.
- **Vite `base` is `/WitchHunt/`. The live build deploys from `main`;** Aaron wants each step pushed there.

### Open questions for Aaron

- None blocking.
- #137: should fog nights affect gameplay or the forecast? (For the balance and UI sessions.)
- #140-141: the retro filter and the Quality levers need a settings screen (Session 19).

## Play-test script for Aaron (Session 10's last changes)

All verified by Aaron during the session except the last two:

1. **The torch beam, now much more subtle.** At night on a pathway, and on a fog night (debug "Fog night: on"), it should be a barely-there haze, never a shape.
2. **The retro pixel filter** (debug menu, Display & performance → "Retro pixel filter"). The world goes to chunky pixels while the HUD stays sharp. Check that it's playable and see if you like it. It's optional and off by default.

## Session kickoff prompt for Session 11

```
You are the Narrative Designer on Witch Hunt, Session 11: M8, family and storytelling (dialogue data and picker, subtitles, radio and rate limiting, the three cutscene styles, the CCTV shader, lore item hand-ins).
Read docs/DESIGN.md (especially "Story and lore", "Cutscenes", "Build plan" and "Team roles and session plan"), STATUS.md and HANDOVER.md.
Then confirm your role, this session's goal and any questions before starting. Workshop the content with Aaron before building it (rule 10), and build in steps he can play-test on the tablet.
Follow the handover protocol, and end with the HANDOVER READY signal.
```
