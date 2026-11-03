# Handover

## Just finished: Session 19, Graphics Engineer: style pass 2 (the opening cluster's places and their camera looks)

**Status: everything is on `main` (live).** 674 tests pass and the build is clean. Details: `STATUS.md` (Session 19 and its round 2), `PLAYTEST.md` rounds 28-29, `OPEN_QUESTIONS.md` #282-314.

**Round 2 (Aaron's playtest notes, all built):** the axe out of the campsite; the counter's box gone; Earl's office dressed; the shelter's and gas station's sweeps keep the world moving (unseen); the diary's blank page out; the report signed MERCER (not Hale); the armoury against the comms hut; **working floodlights at the outpost**: a generator by the barricade that a battery lights, and lamps at both gates and C-7 on from the start (#304-314). Round 29 isn't play-tested yet.

**How we worked:**
- Aaron answered the kickoff questions up front:
  - no new notes from rounds 25-27;
  - a 155 draw-call budget to start with (he's never seen the frame rate dip, even with max zombies in one clearing);
  - textures on big surfaces were my call (I stayed with vertex colours);
  - no letterbox added to the sweeps;
  - push to main as I go.
- Then: "complete the full pass unassisted, save the next lot of questions for the end". Six passes, each pushed to the session branch and to main.
- **Round 28 isn't play-tested yet.** Aaron plans a thorough playtest next.

### What was done

- **The props kit** (`render/propKit.js`, `config.props.weather`):
  - `bakeParts()` turns a place's colour-sorted geometries into one vertex-coloured mesh, weathered as it's baked: grime from the ground or floor, mottling, per-piece shade, darker undersides, rust on the metal;
  - the glare rule's ceiling (`maxLuma` 0.45; `keepBright` for the exceptions) is enforced in the bake and tested over every palette;
  - also `noise3`, `segBox`, `sagStrip`, `pillowGeometry`.
- **The places dressed:**
  - **the campsite:** sagging tents, guy lines, the fire, a woodpile, axe, table and stove, clothesline, sleeping bag, litter (`campsite.json` `props.dressing`);
  - **the gas station:** siding, gutters, roof unit, ceiling grid and tubes, a weathered forecourt with joints, cracks and weeds, detailed pumps and wrecks, the canopy's underside, ice chest, oil rack, propane cage, air pump, tyres, pallet (`gasStation.json` `dressing`, with colliders);
  - **the storm shelter:** sod, roots, tarp and rivets up top; planks, roots, cobwebs, lamp, coat and calendar below;
  - **the outpost:** plump sandbags, a camo net, concertina wire, a generator, brass, and **C-7 seated on its slope** (`OutpostProps.containerY()`).
- **The rest of the cluster:**
  - the barricades at home (`StationRenderer.buildBarricades()`);
  - the cordon (leaning posts, proper jersey barriers, a shade each);
  - the road (potholes, wear and leaves in the vertices, pole hardware);
  - the gates.
- **The camera looks** (`PostFX`, `config.postFX.looks` and `treatments`; `config.cutscenes.treatments` and `osd`):
  - the camcorder: soft, focus hunting, blown highlights, handheld, an amber date stamp and a tape counter;
  - the trail cams: softer, IR glare, a data strip;
  - the scope: a mil-dot duplex reticle, a darker rim, a sway;
  - the sweeps: a grade that eases in and out;
  - the reveals: a jolt (`cutscenes.json` `"jolt": true`).
- **Draw calls** (headless):
  - the worst spot, the trail in behind the gas station, is 203 → 157;
  - the outpost's barricade peak by night is 119 → 117;
  - everything else I measured is under 155 (table in STATUS).

### Unfinished

- **Aaron's play-test of rounds 28-29.** Notes from it come first in the next session.
- **The trail in behind the gas station is 157**, 2 over the 155 start. The rest of it is:
  - the forest;
  - the quad's 9 meshes;
  - outpost pieces drawn up to the far plane.

  Aaron's tablet hasn't dipped, so I left it (#302).
- **Ideas, not built** (#303):
  - the quad as one mesh;
  - a distance cull per place;
  - grime textures up close;
  - the propane cage going up like the pumps;
  - the generator powering the floodlights.
- **Later sessions':**
  - the frontier's encounters (Sessions 20-22);
  - style pass 3 (Session 27);
  - the audio pass (Session 29);
  - a jeep model;
  - the CCTV placeholder `clip.mothmanContainer`.

## Next: Session 20, Level & Encounter Designer (+ AI Programmer): the north frontier (M10 part 1)

**First:** ask Aaron for his notes from the rounds 28-29 playtest (and anything older). Fix the bugs and small ones first, one at a time, pushing to main. Bigger changes go in OPEN_QUESTIONS for a QA session.

**Goal (DESIGN.md "Build plan", Session 20):** the north frontier's encounters:
- the old barn (Milo the Clown);
- the crashed plane (fresh from the dogfight: smoke, the pilot, the lone grey alien, the first alien drops);
- the abandoned mineshaft (dark, the Mothman's origin, beetles, one charge).

**DESIGN.md says these wait on Aaron's encounter redesign** ("More to come", Oct 17). Ask him whether the redesign is ready, and take the designs from him before building (rule 10).

**For that session:**
- **Build each place the Session 19 way:**
  - static props through `render/propKit.js` `bakeParts()` (one vertex-coloured mesh per group, weathered: give it a `baseAt` and the place's `look.weather` with its metal colours in `rust`);
  - what changes in groups of its own;
  - signs and papers as textured boards;
  - merge small textured boards into one mesh (an atlas, as the outpost's container codes) when there are several;
  - dull, dark colours (the glare test covers each place listed in `tests/session19style.test.js`: add new places to it).
- **The crash sites** are where the dogfight shows them coming down (`Outpost.sites`; the smoke columns, `OutpostProps.buildCrashSmoke()`).
- **The interior system** comes in Session 21. The mineshaft is "a short linear tunnel": decide with Aaron whether it waits for that system.
- **Cutscenes:**
  - give each place an arrival sweep (they get the sweep grade automatically);
  - set `"jolt": true` on a first-person reveal;
  - put a CCTV-style clip's look in `config.postFX.looks`;
  - every cutscene goes in the debug menu's Cutscenes category.

### Gotchas and decisions from Session 19

- **Props:**
  - geometries go into `parts` (colour → list, world space, non-indexed, no `uv`);
  - `flush()` / `ownGroup()` bake them;
  - a colour in `look.weather.rust` gets rust streaks; one in `keepBright` escapes the luma cap;
  - big boxes need segments for the weathering to show (`GasStationProps.box()` does it).
- **Grime runs up from `baseAt(x, y, z)`:**
  - the store's floor inside it;
  - the shelter's room floor below ground;
  - the ground elsewhere.
- **Containers stand on `OutpostProps.containerY(frame, ground, c)`**, not the ground at their middle. Use it for anything placed on or in one.
- **Instanced meshes** take a shade per instance with `setColorAt()` (the cordon, the barricades). No draw calls.
- **The look pass:**
  - `PostFX.setLook()` for a camera look;
  - `setTreatment(name, amount)` for a light treatment while no look is on. A look always wins; `setLook(null)` clears both.
  - The OSD reads `data-look` for its layout (CSS `.cs-osd[data-look=...]`).
- **The sweeps and first-person cutscenes have always had letterbox bars** (`Cutscenes.play()`: every non-CCTV cutscene). Aaron declined adding them; whether to remove them is #300.
- **My headless harness:**
  - Playwright on `localhost:5173?seed=1234`; `game.startScreen.activate('skip')`;
  - debug items by label (`game.debugMenu.categories`);
  - the clock set and paused (`clock.phaseIndex`, `phaseElapsed`, `setPaused`);
  - `game.player.teleport()` in a place's frame (`x: f.x + f.rx*x + f.fx*z`, the same for z);
  - `game.renderer.stats` for draw calls;
  - screenshots of the canvas, with the HUD hidden;
  - cutscenes: `game.cutscenes.play(id)`, then wait on `game.cutscenes.current.t`.
  - Run the dev server as a background task.

### Open questions for Aaron

- **Session 19:** #282-314 (all to check in play). In particular:
  - #311: should the generator have its own battery nearby (it competes with the machine gun);
  - #308: the campsite's and outpost's sweeps running too;
  - #300: the sweeps' letterbox bars;
  - #297: the camcorder's date, 13 October;
  - #290: whether the razor wire should slow the dead;
  - #302: draw calls.
- **From before:**
  - #257-281 (Session 18);
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
You are the Level & Encounter Designer (+ AI Programmer) on Witch Hunt, Session 20: the north frontier (M10 part 1): the old barn, the crashed plane and the abandoned mineshaft.
Read HANDOVER.md first, then STATUS.md (Sessions 19 and its round 2, 18, 17), docs/DESIGN.md ("Build plan", "Encounters": the north band's old barn, crashed plane and mineshaft, "Aliens", "Giant beetles", "The Mothman", "Cutscenes") and OPEN_QUESTIONS.md (#282-314, then the older open ones).
First ask Aaron for his notes from the PLAYTEST rounds 28-29 playtest (Session 19's style pass) and fix the small ones, pushing each to main.
Then ask whether his encounter redesign for the frontier is ready; per rule 10, propose a build plan for each encounter (how it's made, what it looks like, how it plays, its cost in draw calls) and workshop it with him before building. Build the props the Session 19 way (render/propKit.js). Keep his rules: dull and dark props (pale ones glare under the torch), one idea at a time over the radio, cutscenes talk except the dogfight.
Then confirm your role and ask Aaron for his notes.
When he's happy, follow the handover protocol: update STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md for the next session, and end with the HANDOVER READY signal.
```
