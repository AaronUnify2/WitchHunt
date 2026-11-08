# Handover

## Just finished: the Nov 8 design pass (Lead Engineer, design review; no feature code)

**Status: everything is on `main` (live).** No game code changed since the experimental vehicles (726 tests pass, build clean). Only `docs/DESIGN.md` and this file changed.

**What was done (with Aaron, Nov 8):**
- **Aaron's redesign of the mid-game and end-game is in DESIGN.md**, from two workshop docs in Claude Docs:
  - [Witch Hunt — Mid-game story notes (Nov 8)](https://claude.ai/artifact/JEPw823tjQJEn6Z3Vy7pHL);
  - [Witch Hunt — Milo's barn (optional encounter)](https://claude.ai/artifact/VtxTRYZ716JQcK63NEmtJq) (also the moonshiners' holler, the railway cutting, the sawmill, the new mineshaft).
- **The story spine** (DESIGN.md "Encounters: the story spine after the outpost"), 12 beats in order: the crashed plane → the Mothman at the crash site → Junie taken by the Caller → the old church and the time capsule → the stairs and the place beyond → the family's plan → the dozer, the bug-zapper night and the Bigfoot cave → the missing quad and the mega night → the crashed UFO and the mothership → the Car Armory, Sheriff and the ute → the killdozer and the portal → the hut.
- **Optional seeded encounters** (DESIGN.md "Optional encounters"), each giving a killdozer part. Five designed (holler, cutting, sawmill, mineshaft, Milo's barn), four named only.
- **New systems in the design:**
  - the healing pool;
  - the loadout, the comms room's gun rack and the tool belt;
  - ammo types on B;
  - inspect cards;
  - one power unit;
  - flares out of the opening;
  - new zombie types and giant moths;
  - the garage and the workbench;
  - the spike maul, the chainsaw, dynamite and the wire cutters;
  - where the experimental vehicles come from in the story.
- **The new milestone plan** (DESIGN.md "Build plan: Milestones" and "Session order"), agreed with Aaron:
  - the story is built **in order, each beat finished and play-tested**, after **early spikes** on the riskiest tech (M10.3);
  - **a longer run is accepted** (4+ hours), so **save and quit moves forward to M10**;
  - the five designed optional encounters are built with their stretch of the story (M11-M14);
  - **the endgame (M15) waits on Aaron's design** of the final battle and the realm of stories (Session 43 folds it in);
  - **renumbered:** M10-M15 are the new story milestones; the old M12 (meta), M13 (art and audio) and M14 (balance) are now **M16-M18**. Older notes in STATUS.md and OPEN_QUESTIONS.md that say M12-M14 mean those. Sessions 20-53 are re-planned.
- **Settled:** the SMG can be found wherever there are dead Men in Black (the sawmill's agents, the Car Armory). Aaron is looking for a spot for the heat-scope rifle.

### Unfinished from before

- **Aaron's play-test of Session 19's rounds 28-30** and his first drive of the experimental vehicles (the ute, the alien quad, the dozer). Ask for his notes first.
- **The trail in behind the gas station is at 157 draw calls**, 2 over the 155 start (#302).
- **`STATUS.md` still describes the old plan** in its header. Session 20 updates it at its end.

## Next: Session 20, Lead Engineer + Gameplay Programmer: the new systems (M10.1)

**First:** ask Aaron for his notes from the rounds 28-30 play-test and the experimental vehicles. Fix the bugs and small ones first, one at a time, pushing to main. Bigger changes go in OPEN_QUESTIONS for a QA session.

**Goal (DESIGN.md "Build plan", M10.1 and Session 20):** the systems the new story leans on, built into the game as it is now, so **the opening still plays through on every seed** and **a run can be saved mid-way, quit and continued**.

These are **core systems**, so rule 10 (workshop first) doesn't apply. But a few are player-facing feel, so confirm the open points listed below with Aaron before building them.

**What to build** (each one's design is in DESIGN.md, the section named):

1. **The healing pool** (Player: "Health, armour and healing"):
   - one pool of healing points replaces the kit count: a first aid kit adds 30, an alien med kit 60;
   - D-pad right / H heals from it at 10 a second (the cap stays);
   - the kit is chosen automatically, so it never wastes an alien kit on a small top-up;
   - the HUD shows one total ("Healing: 90").
   - Today: `player/Health.js` (the queue at `config` `healPerSecond`), `player/Inventory.js` (`firstAid`, `maxFirstAid`), `config` `firstAidHeal`.
   - Saves must carry the pool. Decide the pool's cap with Aaron.
2. **The loadout, the gun rack and the tool belt** (Weapons: "Loadout", "Tools vs weapons"):
   - Tom carries two long guns, a sidearm, one melee slot and the flare gun;
   - the rest wait on a gun rack in the comms room (a new rack, in the world and/or the ledger);
   - tools (the shovel; later the wire cutters) come out by themselves on interact and never take a slot;
   - the melee slot starts as the shovel;
   - "carrying isn't a real pressure".
   - Today: `player/Weapons.js` (RB / LB cycle every gun held), `player/Digging.js`, `player/HoldAction.js`.
   - **Check with Aaron:**
     - which guns count as long guns (the service rifle, shotgun, hunting rifle, heat-scope rifle, auto shotgun?) and the sidearm (the pistol, the SMG?);
     - what happens when Tom picks up a third long gun away from home (it goes to the rack by itself? he swaps?);
     - whether the shovel stays digging-only once something better is in the melee slot.
3. **Ammo types** (Weapons: "Ammo types"):
   - tap B to reload, hold B to choose the ammo (normal or alien shells for the shotguns);
   - the gun reloads with what's chosen;
   - the HUD shows the type (a purple shell for alien);
   - alien shells do 150% (the turret converts them at 7.2).
   - Today: `combat/WeaponState.js`, the weapons' `reloadStyle`; Input's B binding.
   - Alien shells can come from the debug menu until the crashed plane (Session 25).
4. **Inspect cards** (Player: "Resources and inventory", Pickups):
   - special items (tapes, papers, alien tech) get a card: the item turning slowly, its name, a line, and D-pad down to watch, A to read, B to keep for later;
   - kept items play from the ledger's monitors;
   - common pickups keep their toast (introduced the first time in the opening).
   - Today: `story/WatchQueue.js` (tapes on D-pad down), `ui/PaperNote.js`, `story/Lore.js`, `ui/Toast.js`.
   - Rework the opening's tapes and papers (the camcorder, Earl's note, diary and tapes, the field report, the manifest) to go through the card. Aaron: this fixes "today's disjointed tape cutscenes".
5. **One power unit** (The ranger station: "Power: one unit for everything"):
   - the fence's numbers already match: `config.station.power` `batteryCharge` 100, `maxCharge` 300;
   - make the capacity a saved, upgradable value (the plane's cell will raise it to 1000 and put 500 in, from the debug menu for now);
   - give the alien quad a 1000 capacity in the same units (10 batteries);
   - cells shared between the fence and the quad;
   - driving the alien quad is always free; cells feed only its boost and weapons.
   - Today: `base/StationState.js`, `world/AlienQuad.js` (a capacitor of 10 cells).
6. **Flares out of the opening** (Enemies: "Flares"):
   - no flares from police car boots or army zombies until the story flag for the Mothman at the crashed plane;
   - then flares join the general drop tables.
   - Today: `data/loot.json` (`flare`, chance 0.05), the police boot loot, `combat/Flares.js`; Tom already starts with none.
   - Add the flag to `data/progress.json`; the debug menu can toggle it.
7. **A scripted health floor** for set pieces (the crash site's 10%):
   - a general switch an encounter can set, like Day 1's 20% floor (`story/FirstDay.js`);
   - when it's hit, it raises an event the encounter answers (the blackout).
8. **The pause menu and save and quit** (Core loop: "Run length and saving"):
   - Menu / Esc pauses (the clock too);
   - Resume, Save and quit (back to the main menu, Continue picks it up), Settings (greyed);
   - the dawn autosave stays;
   - destroying the hut still deletes the save.
   - Today: `core/SaveStore.js`, `core/saveData.js` (`SAVE_VERSION` 2; zombies, pickups and the random streams aren't saved, #102), `ui/StartScreen.js`.
   - **Check with Aaron:** whether a mid-day save restores the day exactly (Tom where he stood, the clock, the dead on the map), or snaps to a safe point (home, or the last place he entered) to avoid saving in a fight. Bump `SAVE_VERSION` and discard old saves cleanly (convention).

**Not this session:**
- the map work (the fixed spine, the railway line, the road north, the interior system: Session 21);
- the spikes (Session 22);
- any encounter (the crashed plane is Session 25).

The debug menu gives what the systems need to be tried: alien shells, an alien med kit, the plane's power cell, flares on.

**Tests:**
- pure logic in Vitest:
  - the healing pool's choice and cap;
  - ammo conversion with types;
  - the loadout's slots;
  - power capacity and its upgrade;
  - the save round-trip with the new fields;
  - the flare gate;
- then the opening played through headless (see the harness below) on a couple of seeds.

**At the end:** a play-test script for Aaron. Try:
- healing in a fight;
- swapping the loadout at the rack;
- holding B with alien shells;
- an inspect card on the camcorder, kept for later and watched from the monitors;
- the fence cell from the debug menu;
- save and quit mid-day, then Continue.

### Gotchas and decisions to carry

- **Config and data first** (rules 5, 9): every new number in `config.js`, every new item or card text in `/data`. Complete files, small modules.
- **No lights added or removed while playing:** it recompiles every shader. A card's turning model is lit by what's already there, or rendered in its own small scene.
- **HUD:** the final HUD is Session 49. Add the healing total and the ammo type to the placeholder HUD in text, as the rest is.
- **`Dialogue.playLater(id, s, when)`** waits for the subtitles; one idea at a time over the radio (Aaron).
- **Skip intro** starts with the shovel, the service rifle, the shotgun, the box's 2 kits and the tutorial's scrap: map the kits into the pool.
- **The experimental vehicles ride on `world/Quad.js`'s rules** (`Ute`, `AlienQuad` extend `Quad`); `Game.experimental` updates them. The alien quad's cells move to the shared power unit.
- **My headless harness** (Session 19):
  - Playwright on `localhost:5173?seed=1234` with `game.startScreen.activate('skip')`;
  - debug items by label (`game.debugMenu.categories`);
  - set and pause the clock (`clock.phaseIndex`, `phaseElapsed`, `setPaused`);
  - `game.player.teleport()`;
  - `game.renderer.stats` for draw calls;
  - canvas screenshots with the HUD hidden;
  - run the dev server as a background task.

### Open questions for Aaron

- **For this session:** the loadout's slots and pick-ups (above); the healing pool's cap; how a mid-day save restores.
- **Session 19:** #282-320, to check in play (#317 and #319 settled). In particular:
  - #311: the generator's own battery;
  - #308: the sweeps running too;
  - #300: the sweeps' letterbox bars;
  - #302: draw calls.
- **The experimental vehicles:** #321-339. Mostly answered by the Nov 8 design (where each comes from); how they feel waits on his drive.
- **From the Nov 8 design** (DESIGN.md "Open questions"): the endgame's design; Milo's killdozer part; the heat-scope rifle's spot; the four named-only optional encounters; and the rest listed there. None of them block M10.
- **From before:** #257-281 (Session 18), #225-256 (Session 17), #213-224, #185-197, #171-184, #161-170, #155-160, #143, #136-137, #140-141.

## Session kickoff prompt for the next session

```
You are the Lead Engineer + Gameplay Programmer on Witch Hunt, Session 20: the new systems (M10.1): the healing pool, the loadout with the gun rack and the tool belt, ammo types on B, inspect cards, one power unit, flares out of the opening, a scripted health floor, and the pause menu with save and quit.
Read HANDOVER.md first, then docs/DESIGN.md ("Build plan": the plan from M10 on, M10 and Session 20; "Player": weapons, loadout, tools, health and healing, resources and pickups; "The ranger station": power; "Enemies": flares; "Core loop": run length and saving), STATUS.md (the side pass after Session 19 and Session 19) and OPEN_QUESTIONS.md (#282-339, then the older open ones).
First ask Aaron for his notes from the PLAYTEST rounds 28-30 play-test and his drive of the experimental vehicles, and fix the small ones, pushing each to main.
Then confirm the open points in HANDOVER.md (the loadout's slots, the healing pool's cap, how a mid-day save restores) and build the systems one at a time, each tested and pushed to main, keeping the opening playable on every seed.
Keep Aaron's rules: config and data first, complete files, no lights added at runtime, one idea at a time over the radio.
Then confirm your role and ask Aaron for his notes.
When he's happy, follow the handover protocol: update STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md for the next session (Session 21, Lead Engineer: the map, M10.2), and end with the HANDOVER READY signal.
```
