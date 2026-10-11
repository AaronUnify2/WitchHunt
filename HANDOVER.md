# Handover

## Just finished: Session 2, Graphics Engineer, M1 (Look and feel)

Sessions 1 (M0) and 2 (M1) ran back to back in one conversation, at Aaron's request.

M1 is built, deployed, and **play-tested by Aaron on the tablet: "really great work."** It includes:

- Renderer with dynamic resolution, tone mapping and post-processing.
- Sky and day/night driven by the clock.
- Fog that ends at the draw distance.
- The flashlight with its shadow and a procedural torch pattern.
- One clearing ringed by ~3,500 instanced billboard trees (Aaron's decision: every tree is a sprite).
- First-person movement with sprint and stamina, crouch, jump and collision.
- Low / Medium / High quality presets.
- A debug menu with time and quality tools.

Aaron's play-test asked for three changes. All three are made and live (details in `STATUS.md`, "M1 follow-up"):

1. **Trees had no texture.** Each tree sprite now has dark dappling for depth, varied greens and bark streaks.
2. **Rocks were too blocky.** They're now smooth, lumpy, mossy stones.
3. **The torch glared back from close trees and rocks.** It now dims when its beam hits a close surface head-on, while the ground ahead keeps the full beam.

### Still open from the M1 play-test

Aaron hasn't reported these yet. Ask him at the start of Session 3:

- **The 20-minute performance gate**: fps and render scale at the start, 10 and 20 minutes into a night walk at Medium, and whether the tablet ran hot. If the frame target isn't held, fix performance before starting M2 (DESIGN.md "Performance gates").
- **Whether the three fixes landed**: trees read as textured, rocks look natural, and walking up to a tree or rock with the torch no longer floods the view.
- **The M0 checks**: whether B ever leaves fullscreen or goes back a page; controller off/on mid-game; the screen not dimming; the View + Menu overlay combo; the back gesture then "Tap to resume".

### Changed from M0 (Aaron knows)

- The debug menu combo is now **hold View + D-pad down** (was L3 + R3). The overlay combo is still View + Menu.
- The game starts at night (20:00). The debug menu's "Skip to next phase" shows dusk, dawn and day.

### Working agreement with Aaron

- Work happens on the session's feature branch. Aaron approves each push to `main` himself ("push to main"); a push to `main` deploys to GitHub Pages in about a minute.
- After each round of fixes, Aaron play-tests on the tablet and sends feedback in plain language. Turn it into config-driven changes and verify them with screenshots before pushing.

## Next: Session 3, Gameplay Programmer, M2 (Combat feel)

Goal: shovel, service rifle, shotgun; one zombie sprite type; hits, death, aim assist, aim slowdown, health and armour bars, first aid kits. Done when fighting five zombies at night is fun on the controller.

**Rule 10 applies:** zombies and weapons are content, so write a short build plan and workshop it with Aaron before building.

### Look at first

- `src/config.js`: every number goes here.
- `src/player/Player.js`: add aim slowdown as a multiplier next to `sprintMultiplier` and `crouchMultiplier` in `updateMovement()`. `stance`, `speed` and `stamina` are already exposed.
- `src/render/Forest.js`: the billboard shader patch (`BILLBOARD_*` chunks plus a matching `MeshDepthMaterial`). Zombies are billboard sprites too; reuse it and add an 8-angle frame pick.
- `src/render/proceduralTextures.js`: how the tree sprites are drawn (dappling, `paintOnTree` for detail that keeps the outline). A placeholder zombie sprite can follow the same pattern.
- `src/world/SpatialGrid.js` and `collision.js`: static colliders and `nearestHit()` (ray vs ground and upright cylinders). Zombies will want the same circle collision; `nearestHit` is a starting point for hit-scan shots.
- `src/core/Input.js`: `attack` (RT), `aim` (LT), `reload` (B), `switchWeapon` (Y/RB), `interact` (X) are mapped and verified on the tablet. RT/LT analogue values are in `input.rawPad.values` if needed.
- `src/debug/DebugOverlay.js` `addStat()`: add "active enemies" (DESIGN.md debug overlay list).

### Gotchas and decisions

- Systems follow `init()` / `update(dt)` / `dispose()` and talk through `EventBus`. Use `rng.fork('label')` per system.
- Draw calls are ~55 at Medium; the budget is ~100. One zombie atlas = one instanced draw (plus one in the torch shadow pass).
- **Torch glare only knows about static things.** `Flashlight.updateGlare()` queries the static collider grid (trees, rocks). A zombie right in the beam will glare like the rocks used to, until zombies are fed into that check too (a few close ones are enough).
- The torch is the only shadow-casting light; DESIGN.md allows at most ~4 point lights (muzzle flash etc.) and they must not cast shadows.
- Toggling lights changes the shader light count and can hitch once while shaders compile. Pool muzzle-flash lights and toggle `intensity`, not `visible`.
- Light-coloured surfaces blow out under the torch: keep albedos dark and mossy (the rocks needed this).
- Vite `base` is `/WitchHunt/`: import assets or use `import.meta.env.BASE_URL`, never a hard-coded `/assets/...` path.
- View still fires `inventory` on press during View-based combos (OPEN_QUESTIONS #4).

## Session kickoff prompt for Session 3

```
You are the Gameplay Programmer on Witch Hunt, Session 3.
Read docs/DESIGN.md (especially "Build plan" and "Team roles and session plan"), STATUS.md and HANDOVER.md.
Then confirm your role, this session's goal and any questions before starting.
Follow the handover protocol, and end with the HANDOVER READY signal.
```

> **✅ HANDOVER READY**: Session 2 (Graphics Engineer) complete. Next: Session 3, Gameplay Programmer: M2 combat feel.
