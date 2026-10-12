# Handover

## Just finished: Session 9, QA & Balance (the gate: play-test the slice)

**Status: done.** Aaron play-tested the M7 slice on the tablet. The witch's side of the loop plays well, and her fight was reworked to his design. Full runs, which judge pacing, ammo and loot, wait for the encounters (see "The gate" below). Everything is pushed to `main` (Aaron: fixes go straight to `main` so he can play-test them).

### What was done

Details are in `STATUS.md` (the Session 9 sections) and `OPEN_QUESTIONS.md` (Session 9, #113, #116, #121, #129, #130, #135, #136).

1. **The point of no return (#130, Aaron)** (`src/ui/NoReturnNotice.js`, `data/ending.json` `noReturn`):
   - **The radio call:** when the second charge goes on the hut, Junie calls: is Tom sure he's ready?
   - **The pop-up:** 5 s later it pauses the game. Setting the charges off starts the final battle and deletes the save, so there's no reloading from dawn.
   - **The save:** destroying the hut deletes it, and nothing saves again that run (`Game.pastNoReturn`).
   - Verified by Aaron.
2. **Her fight, reworked (Aaron)** (`src/ai/Witch.js` `fight()`, `setMode()`, `hitInFight()`; `config.witch.attack`):
   - **Health:** doubled to 1000.
   - **Retreat:** she backs off, weaving, to 20 m, dropping traps.
   - **Hex mode:** she holds there and throws a hex every 6 s at 25 m/s. Come within 10 m and she backs off again.
   - **Rush:** any hit but the shotgun's sends her in to swipe again and again. She follows you through the wind-up.
   - **Backing her off:** any shotgun hit, or 100 damage, drives her back out.
   - **She summons** whenever that's ready.
   - **The final battle** uses the same pattern, harsher (hexes every 4.5 s, 40-damage swipes). She keeps 4 m inside the witchfire ring (`Witch.arena`).
   - Aaron tried 30 m first: too far, and she snagged on the trees at the arena's edge. **20 m is confirmed.**
3. **The hex totem** is now 0.6 m tall, low to the ground (`traps.look.totemHeight`, hit shape).
4. **Small things:**
   - `Toast.show(text, seconds)`.
   - Hitscan hits now carry the weapon's `id` (the witch backs off from the shotgun).
5. **Tests:** 372 pass (4 new or rewritten for her fight, 1 for the hut arming).

### What Aaron said about the slice

- **Ambushing a ritual:** balanced. Shooting her, or walking right up, breaks it.
- **Making her flee:** fun. The pace changes suddenly.
- **Killing her on the pathway:** satisfying.
- **The final battle:** plays really well, and the frame rate held on the tablet.
- **Traps:** the snare is really good. The totem was too tall (fixed). The alarm charm is fine but easy to avoid.
- **Ideas logged:** #136, a random encounter's item, perhaps a one-shot rifle, that tags the witch on the map for good. The map's debug "show her" view (`witch.showOnMap`) is the hook.

### The gate

- **The witch's side passed.**
- **Full runs wait:** Day 1 is mostly looting cars until the abandoned campsite exists (#135), so ammo, loot and run pacing can't be judged yet. Aaron chose to **keep the session order as it is**.
- **Look again after Session 13** (all of the north built), with a short QA play-through of two or three full runs.

### Unfinished

Nothing in this session's scope.

## Next: Session 10, Graphics Engineer, style pass 1 (part of M13)

**Goal (DESIGN.md session order):** make the slice look good: ground, trees, mist and post-processing. DESIGN.md "Art style and rendering" ("Visual ambition", "Rendering pipeline", "Sky and lighting") is the brief.
- The unbuilt items from "Visual ambition" are listed in STATUS.md "Stubbed / placeholder" and OPEN_QUESTIONS #21: ground mist layers, height fog, fake light shafts, fireflies and other particles, normal-mapped blended ground, distant impostor tweaks, a retro pixel filter.
- **Performance comes first:** hold the frame target on the Samsung tablet (budgets in DESIGN.md). Every addition needs a Quality-preset lever.
- **Workshop it with Aaron before building** (DESIGN.md rule 10 is about content, but a style pass is about his taste): propose what changes and what it costs, then build in steps he can play-test.

### Look at first

- **Rendering:** `src/render/Renderer.js`, `PostFX.js`, `Sky.js`, `skyPalette.js`, `Forest.js`, `proceduralTextures.js`, `DynamicResolution.js`.
- **Ground:** `src/world/GroundField.js` and `Terrain.js`.
- **Config:** `config.quality.presets` (draw distance, fog end, shadows, bloom), `fog`, `sky`, `forest`.
- STATUS.md "Known issues and risks": draw calls, the torch's lights, sprite trees up close.

### Gotchas and decisions

- **Keep the witch a shadow:** she's unlit `MeshBasicMaterial` on purpose (Aaron). Only her silhouette and eyes read; she shows against lit ground, the ritual ring and the blood sky.
  - Aaron likes her as a silhouette at a distance. She now fights 20 m off, so mist and fog at that range set how she looks in a fight. Check her against any new mist.
- **The blood night:** `FinalBattle` drives `sky.setBlood()` and its own embers, ash and witchfire ring. A new sky or fog system has to keep feeding it.
- **Zombie sprites** are lit head-on by the torch, and their albedo is pulled down (`zombies.albedoScale`). Pickups need the same care (`pickups.albedoScale`).
- **Headless runs:**
  - In headless Chromium, drive `game.update(1/30)` with the render loop cancelled (`window.game` exists in dev).
  - It renders on a software GPU at about 10 fps, so it says nothing about the tablet's frame rate. Only Aaron's tablet does.
- **Vite `base` is `/WitchHunt/`. The live build deploys from `main`;** Aaron wants each step pushed there.

### Open questions for Aaron

- None blocking. #136 (the witch-tagging item) is for an encounter session (M9-M11). #105-134 are tuning for M14.

## Play-test script for Aaron (Session 9's last changes)

All verified by Aaron during the session; nothing is waiting.

## Session kickoff prompt for Session 10

```
You are the Graphics Engineer on Witch Hunt, Session 10: style pass 1 (make the slice look good: ground, trees, mist, post-processing).
Read docs/DESIGN.md (especially "Art style and rendering", "Build plan" and "Team roles and session plan"), STATUS.md and HANDOVER.md.
Then confirm your role, this session's goal and any questions before starting. Propose the look and its performance cost to Aaron before building, and build in steps he can play-test on the tablet.
Follow the handover protocol, and end with the HANDOVER READY signal.
```
