# Handover

## Just finished: Session 10 and 10b, Graphics Engineer, style pass 1 (part of M13)

**Status: done, and paused early by Aaron's choice.** Session 10 (the slice's look) was finished and play-tested. Aaron then asked for a second round (10b): guns, a sniper rifle, then zombies, cars, the hut, and the station's interior and family. The gun work was finished and play-tested ("those changes have gone perfectly"). Aaron then **pivoted to story and encounter design** (work he did in a separate chat). The rest of 10b is **logged for a later session**; see "Deferred art work" below.

Everything is pushed to `main` (Aaron: each step goes straight to `main` so he can play-test it). The last commit is "Shovel rests lower (blade at the centre of the view); darker ladder the torch dims on (Aaron)".

### What was done

Details are in `STATUS.md` (the Session 10 and 10b sections) and `OPEN_QUESTIONS.md` (#137-148).

**Agreed with Aaron:**
- **Art stays generated in code** (no texture files).
- **Night and dusk come first.**
- **References:** Appalachia, US forest rangers, a 1980s made-in-the-USA chainsaw manual, American folklore; Left 4 Dead, Silent Hill, Evil Dead 2.

**Session 10, the look of the slice:**
- Ground mist and fog nights. Mist sheets that fade out as you get close.
- A blended forest floor.
- Six kinds of Appalachian tree, with solid trunks up close.
- A colour grade by hour.
- Fireflies, beam dust, moonlight shafts and a faint torch beam.
- An optional retro pixel filter.
- Each effect has a Quality lever and a debug switch.

**Session 10b, the guns (`player/ViewModel.js`, `config.viewModel`, `config.weapons`):**
1. **Detailed gun models**, built in code: walnut, blued steel and a wood-grain texture. They sit lower at the hip.
2. **The hunting rifle (a sniper):**
   - Scoped, bolt-action, its own rare rounds.
   - Kills with a headshot and punches through a line of zombies.
3. **Four guns Aaron kept:**
   - The pistol.
   - An MP5-style SMG on pistol rounds.
   - A semi-auto rifle with a heat scope, on the hunting rifle's rounds.
   - An AA-12-style auto shotgun on shells.
   - Guns that share a round type share one pool of rounds (`Weapons` pools).
   - Slots are 1-8 on the keyboard.
4. **The heat scope** (`Game.updateThermal()`):
   - The world turns cold grey and the living glow white-hot (zombies, mutants and the witch).
   - The glow fades up close, and bloom is off while you look through it.
   - Aaron: "perfect now", including from the tower to the fence.
5. **The shovel:**
   - A Fruit Ninja-style slice with a bright trail; swings alternate direction. Aaron: "really satisfying".
   - At rest it's carried upright, with the blade just below the centre of the view.
6. **Torch glare on the watchtower:**
   - The tower and its ladder have darker wood.
   - Up the tower, the torch's glare check now counts the platform floor, the cab roof, the corner posts and the ladder (`Flashlight.platformHit()`, glare colliders in `Station`).
   - Aaron: perfect.

**Tests:** 388 pass. The build is clean.

### Deferred art work (Aaron's 10b list, not started)

Aaron asked for these, then paused them for the story work. They're logged in `OPEN_QUESTIONS.md` #144-148 and DESIGN.md's session plan (folded into Session 16, style pass 2, unless Aaron calls for them sooner). None of it has been started.

1. **Zombies (#144).**
   - Aaron: they "need some additional work to look better". The heat scope showed they read well at a distance.
   - The plan proposed to Aaron: re-render the sprite atlas at load from simple 3D procedural bodies (posed, lit, with torn clothes), with more variety per variant.
   - Look at `render/ZombieRenderer.js` (instanced billboards from an atlas; its thermal hook must keep working) and `render/zombieSprite.js`.
2. **Cars (#145).** They're placeholder boxes (`world/Vehicles.js`, `render/VehicleRenderer.js`). My suggestion, not yet put to Aaron: 1970s-80s American cars and trucks to suit the references (a pickup, a station wagon, a sedan, a Forest Service truck). The bonnet, boot and doors must still hinge.
3. **The witch's hut (#146).** A placeholder (M7). My suggestion, not yet put to Aaron: folklore, Evil Dead 2's cabin turned wrong. Its blast and destroyed states must keep working (`world/Hut.js`, `render/HutRenderer.js`, `combat/Explosives.js`).
4. **The ranger station's interior (#147).** The comms room desk, radio, ledger, table, bunks and cabinets are boxes (`render/StationRenderer.js`). My suggestion: a lived-in 1980s Forest Service lookout.
5. **The family (#148).** Ellen, Wyatt and Junie are placeholder figures. **Workshop their look with Aaron before building it.** Their look has to work with M8's face-to-face lines and cutscenes, so the Narrative Designer's decisions come first.

Also still open from 10b:
- **Which encounters give the new guns (#142-143).** They're debug-menu only for now. This now belongs to the encounter design Aaron is bringing.
- **The SMG's laser sight.** Aaron had pictured a laser sight but liked the iron sights, so there's no laser. Nothing to do unless he asks again.

## Next: Session 11, a review of DESIGN.md (Aaron's pivot), then the story and dialogue session

Aaron worked on **the upcoming story and a better design for the random encounters** in a separate chat. With that and the changes made since DESIGN.md was written (Sessions 1-10b), **the milestones will change.** So the work is split into two sessions:

### Session 11 (next): review DESIGN.md and redo the milestones

Role: Lead Engineer, as the design reviewer (with the Narrative and Level & Encounter Designer hats for Aaron's new material). No feature code this session; the deliverable is a reviewed `docs/DESIGN.md`.

1. **Ask Aaron for his story and encounter work** (he'll paste it or summarise it).
2. **Fold it into `docs/DESIGN.md`**, which is the source of truth: "Story and lore", "Encounters" (the nine things every encounter needs, the tables for which appear and where), "Cutscenes" and "Dialogue".
3. **Review the whole of DESIGN.md** against what's built and decided. Sources: `STATUS.md`, Aaron's decisions in `OPEN_QUESTIONS.md`, and the code where they disagree. Fix anything stale or contradictory. Known changes to check:
   - The five new guns (in the weapons table; which encounters give them, #142-143).
   - The heat scope, fog nights, the witch's fight pattern and the point of no return.
   - The 10b art work deferred to Session 16 (#144-148).
4. **Redo the milestones and the session plan** ("Build plan", "Team roles and session plan") around the new story and encounters:
   - What M8 (story and dialogue) now covers.
   - How M9-M11's encounters split up.
   - Where the deferred art work goes.
   - Renumber the sessions after this one.
5. **Show Aaron each part before committing**, and push to `main`. Update `STATUS.md`, `OPEN_QUESTIONS.md` and `HANDOVER.md`, and write the kickoff prompt for the story and dialogue session.

### The session after: story and dialogue (Narrative Designer, M8 as revised)

Its scope comes from the review. As planned before the review, M8 is:
- The dialogue data and picker, subtitles.
- The radio and its rate limiting.
- The three cutscene styles, the CCTV shader.
- Lore item hand-ins.
- **Done when:** a radio call, a CCTV patch-through and a face-to-face line all work from data alone.

Workshop content with Aaron first (rule 10). The notes below ("Look at first") are mostly for that session, but the reviewer should read them too.

### Look at first

- **DESIGN.md:**
  - "Story and lore": the radio, the dialogue system and its presentation, the dialogue plan, the Day 1 lines.
  - "Encounters".
  - "Cutscenes".
  - "Team roles and session plan".
- **Existing radio-ish pieces:**
  - The point-of-no-return call (`ui/NoReturnNotice.js`, `data/ending.json` `noReturn`).
  - NightWatch's graded radio calls (`base/NightWatch.js`).
  - The ending and defeat cards (`ui/RunEndScreen.js`).
  - These are the placeholders the dialogue system should take over.
- **Subtitles:** `Toast.show(text, seconds)` is the current stand-in.
- **Encounters today:** signposts only (`data/` clearings and encounters, `world/` map generation). They are data-driven, so new ones can be added in data.
- **The CCTV shader:** `render/PostFX.js` holds the full-screen grade, vignette and grain pass, plus the heat scope's white-hot grade (`uThermal`). A CCTV or camcorder look can be another `ShaderPass` there, or its own composer for the patch-through view.

### Gotchas and decisions

- **The atmosphere hook:**
  - `installAtmosphereShader()` (first thing in `Game.init`) hooks `THREE.Material.prototype.onBeforeCompile`, so every fogged material gets the mist's shared uniforms.
  - Keep it first: materials made before it miss the uniforms.
  - Use `fog: false` for screen-space or UI-like materials.
- **Draw distance changes on fog nights** (`Game.setViewDistance()`). Anything that culls by distance should take `setDrawDistance()`.
- **The grade follows the clock, and the blood night turns it red.** A cutscene that wants its own look should set the grade explicitly and hand it back afterwards. It also has to leave the heat scope off (`postFX.setThermal(false)`).
- **The heat scope** switches the sky palette, the grade, bloom, the torch lights and the atmosphere effects each frame (`Game.updateThermal()`). Anything new that glows (encounter creatures, the family) needs a `setThermal` hook to show white-hot.
- **Torch glare:** light-coloured surfaces glare under the torch up close. Use dark albedo, and add glare-only colliders (`glareOnly`, `noBody`, `glare: true` for segments) for anything you stand close to.
- **The view-model is unlit** (vertex colours tinted by the sky). Per-gun hip and aim positions are in `config.viewModel.offsets`.
- **Headless runs:**
  - Drive `game.update(1/30)` with the render loop cancelled (`window.game` in dev).
  - It renders on a software GPU at about 10 fps, so frame rates can only be judged on Aaron's tablet.
- **Vite `base` is `/WitchHunt/`. The live build deploys from `main`.**

### Open questions for Aaron

- **The story and encounter design** from his separate chat (Session 11, the design review, starts here).
- #142-143: which encounters give the hunting rifle and the four new guns.
- #144-148: the deferred art work. Is Session 16 (style pass 2) the right time for it, or sooner?
- #137: should fog nights affect gameplay or the forecast? #140-141: the retro filter and the Quality levers need a settings screen (Session 19).

## Session kickoff prompt for the next session

```
You are taking over Witch Hunt after Session 10b (Graphics Engineer). This is Session 11: a review of docs/DESIGN.md. Aaron has worked on the upcoming story and a better design for the random encounters in a separate chat, and with that and the changes made since the design was written, the milestones will change. Your role is Lead Engineer as design reviewer (with the Narrative and Level & Encounter Designer hats for Aaron's new material). No feature code: ask Aaron for his story and encounter work, fold it into docs/DESIGN.md, review the whole document against what's built and decided (STATUS.md, OPEN_QUESTIONS.md, the code), and redo the milestones and the session plan with him. The session after yours is story and dialogue (Narrative Designer, M8 as you revise it); write its kickoff prompt.
Read docs/DESIGN.md (all of it), STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md.
Then confirm your role, this session's goal and any questions before starting. Show Aaron each change before committing it, and push to main.
Follow the handover protocol, and end with the HANDOVER READY signal.
```
