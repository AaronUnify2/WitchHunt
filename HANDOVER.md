# Handover

## Just finished: Session 12, Narrative Designer: M8, the story systems

**Status: done.** Everything is pushed to `main`, which Aaron play-tests from (agreed at the start of the session). 431 tests pass and the build is clean.

**Agreed with Aaron at the start:**
- Push each step to `main`.
- No separate workshop: a first pass of the looks goes into the game for Aaron to react to.
- Cutscenes pause the clock.

### What was done

Three steps. Details are in `STATUS.md` (Session 12) and `OPEN_QUESTIONS.md` (#155-160).

1. **12a: dialogue, subtitles, the radio, the family, trail cameras.**
   - **The lines:** `src/data/dialogue.json` holds the 23 Day 1 lines word for word, the ending's lines, and the old placeholder calls (moved out of the code).
   - **The picker** (`story/dialoguePicker.js`): conditions, newest milestone first, heard lines saved.
   - **Subtitles** (`ui/Subtitles.js`): typed on with a blip at each speaker's pitch; radio calls get a tag and a crackle.
   - **The radio's rate limit** (`story/radioGate.js`).
   - **Talking to the family** (`story/FamilyTalk.js`): hold interact in the comms room. The talking bob and the new-line marker.
   - **Trail cameras** (`story/TrailCams.js`): six seeded posts. A sighting is a lead on the map, never a tracker.
2. **12b: the cutscene system.**
   - **One timeline format:** `src/data/cutscenes.json` and `story/cutsceneTimeline.js`.
   - **The player** (`story/Cutscenes.js`): its own camera; the clock paused; clips hold the world still; skippable.
   - **The camera looks:** a pass in `render/PostFX.js` (CCTV, trail cam, camcorder, military, government, scope).
   - **Every planned clip as a placeholder,** all in the **Cutscenes** debug category.
   - **Placeholders taken over:** the final battle's intro and the ending and defeat cards are cutscenes now.
3. **12b: lore and the monitors.** `src/data/lore.json` and `story/Lore.js`. Items are handed in on the ledger's **Monitors** page, and clips are rewatched from there.

**Done when (M8):** all three work from data alone.
- **A radio call:** "Test: a radio call from data".
- **A CCTV patch-through:** any clip in the Cutscenes category, e.g. Night 1's trail cam with Ellen's and Junie's radio lines over it.
- **A face-to-face line:** turn the Day 1 lines live, then talk to Wyatt or Junie on Day 1.
- Every cutscene plays from the debug menu.

### Unfinished

Nothing in scope. Still to come, by design:
- **Day 1's real triggers** (M9.2). Line 1 waits for a `story:opening` event.
- **The storm shelter's fixed camera** (M9.1, #153).
- **The family's sighting and idle lines** (written with Aaron, #158-159).
- **Lore pickups in the world** (each encounter's session calls `Lore.give(id)`).
- **The radio button** (D-pad down / V) still does nothing.

### Play-test script for Aaron (Session 12)

On the tablet with the controller. The debug menu is View + D-pad down.

1. **Cutscenes.** Open the menu, then *Cutscenes*, and play each one.
   - **What good looks like:** each feed reads as its own kind of camera (the government's blue CLASSIFIED feed, the green trail cam, the shaky camcorder, the battered military feed, the round scope). The clock stops while they play, A skips, and you're handed back exactly where you were.
   - **Tell me:** which looks are right, which to push further, and the timing of each clip. They're placeholders, and the actors are boxes until Session 13.
2. **Radio calls.** *Story, radio & trail cams*: "Test: a radio call", "an urgent radio call", and "the rate limit" (only one of three should play).
   - **Tell me:** the subtitle strip, the speaker colours, the blips (too much? too quiet?) and the crackle.
3. **The family.** In the same menu, turn the Day 1 lines live. On Day 1, walk into the comms room.
   - Gold diamonds float over Wyatt and Junie. Look at Wyatt and hold X: his line, with him bobbing as it types. Then Junie: her question, and Ellen answers.
   - X moves a line on. Talking to someone with nothing new says so.
   - **Tell me:** how this feels face to face, and how close or how squarely you should have to stand.
4. **Trail cameras.** Open the map: small green squares are the cameras.
   - *Report a sighting now*: the nearest camera blinks red on the map.
   - At the comms desk, open the ledger and go to the new **Monitors** tab. Watch the sighting.
5. **Lore.** *Give the next item* a few times, then hand them in on the Monitors tab. The camcorder puts its clip on the monitors, and so does the second classified document.
6. **The ending.** *Hut & explosives*, then the final battle (teleport and start it): the intro turns you to the wreck. Kill her (*Witch*, then *Fight: kill her*): trail cams as the dead fall, Ground Zero going dark, the family at dawn, then the summary. Dying: black, static, the family calling Tom.

## Next: Session 13, Graphics Engineer / Technical Artist: characters and the deferred art, play-test driven

**Goal (DESIGN.md "Team roles and session plan", Session 13):**
- **Aaron, Session 11:** in its own session, sooner, with time to sit down and play-test, changing things a step at a time.
- **Character models, to a near-finished level,** so writing and play-testing the coming encounters has something to spark off:
  - the zombies (citizen, police, army with its helmet; #144)
  - the mutant
  - the witch's real model
  - the grey alien
  - the beetle
  - the dead (Earl Pruitt, soldiers)
  - the family (#148, now that M8's decisions are in)
- **Then the rest of the deferred art:** the cars (#145), the station's interior (#147) and the hut (#146).
- **A debug model viewer:** any character model in any pose.
- Frontier creatures (Bigfoot, the Mothman, cowboy aliens, Men in Black) if time allows; otherwise before M10.
- Split 13a / 13b as needed.

**Workshop first (rule 10).** Each model is content: propose how it's made and looks, agree it with Aaron, then build.

### Deferred art work (Aaron's 10b list, not started; #144-148)

1. **Zombies (#144).**
   - Aaron: they "need some additional work to look better". The heat scope showed they read well at a distance.
   - The plan proposed to Aaron: re-render the sprite atlas at load from simple 3D procedural bodies (posed, lit, with torn clothes), with more variety per variant.
   - Look at `render/ZombieRenderer.js` (instanced billboards from an atlas; its thermal hook must keep working) and `render/zombieSprite.js`.
2. **Cars (#145).** Placeholder boxes (`world/Vehicles.js`, `render/VehicleRenderer.js`). A suggestion not yet put to Aaron: 1970s-80s American cars and trucks to suit the references (a pickup, a station wagon, a sedan, a Forest Service truck). The bonnet, boot and doors must still hinge.
3. **The witch's hut (#146).** A placeholder from M7. A suggestion: folklore, Evil Dead 2's cabin turned wrong. Its blast and destroyed states must keep working (`world/Hut.js`, `render/HutRenderer.js`, `combat/Explosives.js`).
4. **The ranger station's interior (#147).** The comms room's desk, radio, ledger, table, bunks and cabinets are boxes (`render/StationRenderer.js`). A suggestion: a lived-in 1980s Forest Service lookout. The three CCTV monitors over the desk could now show the monitors' clips.
5. **The family (#148).** Ellen, Wyatt and Junie. **Workshop their look with Aaron first.**

### Look at first

- **The family's figures** are `StationRenderer.family`, three meshes standing at `layout.cabin.family`.
  - `story/FamilyTalk.js` bobs them (it moves `position.y`) and floats markers over their heads, worked out from each mesh's bounding box.
  - A new model must keep one Object3D per family member, in `config.story.family`'s order (Ellen, Wyatt, Junie). Or it can give FamilyTalk a two-frame mouth to animate instead of the bob (DESIGN.md "Talking bob").
- **Cutscene actors** are built in `story/Cutscenes.js` `buildActor()`: figures by `look` (`config.cutscenes.figures`: witch, mib, camper, zombie, the family), plus rings, glows, boxes and eyes.
  - Swapping a figure for its real model there upgrades every cutscene at once.
  - `light(k)` sets lit materials' emissive for the camera's lamp at night. Keep `MeshLambertMaterial` (or anything with `emissive`).
- **The witch** in the world: `render/WitchRenderer.js`. Her heat-scope hook is `setThermal`.
- **The zombies:** `render/zombieSprite.js` and `render/ZombieRenderer.js`.
- **The debug menu:** add a **Models** category (`menu.category('Models')`) for the viewer.

### Gotchas and decisions

- **The atmosphere hook:** `installAtmosphereShader()` hooks every material's `onBeforeCompile`. Use `fog: false` for screen-space or glowing materials (the cutscene glows do).
- **Never add or remove lights while playing.** Changing the light count recompiles every shader (a stutter on the tablet). That's why the cutscene camera's lamp lights only the actors.
- **The heat scope** switches the sky, grade, bloom, torch and atmosphere each frame (`Game.updateThermal()`). New living things need a `setThermal` hook.
- **Cutscenes draw the world round their own camera** (`Game.update` passes the cutscene camera to the world, sky and atmosphere), so a remote shot (Ground Zero) loads its chunks. Draw distance still applies.
- **Headless runs:** drive `game.update(1/30)` with the render loop cancelled (`window.game` in dev). The software GPU runs at about 10 fps, so frame rates can only be judged on Aaron's tablet.
- **Vite `base` is `/WitchHunt/`. The live build deploys from `main`.** Push each step to `main` so Aaron can play-test it.

### Open questions for Aaron

- **#155-160 (Session 12):**
  - the looks
  - the family face to face
  - clips holding the world still
  - whether a sighting plays its clip
  - idle lines
  - the camera's lamp at night
- From before:
  - #143 (which encounters give the SMG, the heat-scope rifle and the auto shotgun)
  - #136 (an item that tags the witch)
  - #137 (fog nights and gameplay)
  - #140-141 (the settings screen, Session 28)

## Session kickoff prompt for the next session

```
You are the Graphics Engineer / Technical Artist on Witch Hunt, Session 13: characters and the deferred art, play-test driven (the character models the coming encounters need, near-finished: zombies, the mutant, the witch, the grey alien, the beetle, the dead, the family; then the cars, the station's interior and the hut; a debug model viewer). Session 12 built M8, the story systems (dialogue, subtitles, the radio, trail cameras, cutscenes and their looks, lore and the monitors).
Read docs/DESIGN.md (especially "Art style and rendering", "Build plan" and "Team roles and session plan"), STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md.
Then confirm your role, this session's goal and any questions before starting. Workshop each model with Aaron first (rule 10), and push each step to main so he can play-test it.
Follow the handover protocol, and end with the HANDOVER READY signal.
```
