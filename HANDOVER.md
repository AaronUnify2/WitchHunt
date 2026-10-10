# Handover

## Just finished: Session 2, Graphics Engineer, M1 (Look and feel)

Sessions 1 (M0) and 2 (M1) ran back to back in one conversation, at Aaron's request.

M1 is built and verified headless (details in `STATUS.md`):

- Renderer with dynamic resolution, tone mapping and post-processing.
- Sky and day/night driven by the clock.
- Fog that ends at the draw distance.
- The flashlight with its shadow and a procedural torch pattern.
- One clearing ringed by ~3,500 instanced billboard trees (Aaron's decision: every tree is a sprite).
- First-person movement with sprint and stamina, crouch, jump and collision.
- Low / Medium / High quality presets.
- A debug menu with time and quality tools.

**What's left is M1's "done when", which only Aaron can check:** walking around at night with the torch feels good on the tablet and holds the frame target for 20 minutes. If the frame target isn't held, the next session fixes performance before starting M2 (DESIGN.md "Performance gates").

### Changed from M0 (tell Aaron)

- **The debug menu combo is now hold View + D-pad down** (was L3 + R3, which now sprint and crouch). The overlay combo is still View + Menu.
- **The game now starts at night** (20:00), so the torch test needs no skipping. Use the debug menu's "Skip to next phase" to see dusk, dawn and day.

## Next: Session 3, Gameplay Programmer, M2 (Combat feel)

Goal: shovel, service rifle, shotgun; one zombie sprite type; hits, death, aim assist, aim slowdown, health and armour bars, first aid kits. Done when fighting five zombies at night is fun on the controller.

**Rule 10 applies:** zombies and weapons are content, so write a short build plan and workshop it with Aaron before building.

### Look at first

- `src/config.js`: every number goes here.
- `src/player/Player.js`: add aim slowdown as a multiplier next to `sprintMultiplier` and `crouchMultiplier` in `updateMovement()`. `stance`, `speed` and `stamina` are already exposed.
- `src/render/Forest.js`: the billboard shader patch (`BILLBOARD_*` chunks plus a matching `MeshDepthMaterial`). Zombies are billboard sprites too; reuse it and add an 8-angle frame pick.
- `src/world/SpatialGrid.js` and `collision.js`: static colliders; zombies will want the same circle collision.
- `src/core/Input.js`: `attack` (RT), `aim` (LT), `reload` (B), `switchWeapon` (Y/RB), `interact` (X) are mapped and verified on the tablet. RT/LT analogue values are in `input.rawPad.values` if needed.
- `src/debug/DebugOverlay.js` `addStat()`: add "active enemies" (DESIGN.md debug overlay list).

### Gotchas and decisions

- Systems follow `init()` / `update(dt)` / `dispose()` and talk through `EventBus`. Use `rng.fork('label')` per system.
- Draw calls are ~55 at Medium; the budget is ~100. One zombie atlas = one instanced draw (plus one in the torch shadow pass).
- The torch is the only shadow-casting light; DESIGN.md allows at most ~4 point lights (muzzle flash etc.) and they must not cast shadows.
- Toggling lights changes the shader light count and can hitch once while shaders compile. Pool muzzle-flash lights and toggle `intensity`, not `visible`.
- Vite `base` is `/WitchHunt/`: import assets or use `import.meta.env.BASE_URL`, never a hard-coded `/assets/...` path.
- View still fires `inventory` on press during View-based combos (OPEN_QUESTIONS #4).

## M1 play-test script (for Aaron)

On the tablet, in Chrome, with the Xbox controller. Open https://aaronunify2.github.io/WitchHunt/, press a button on the controller, then tap the screen.

**First look (night):**
1. *Good:* a dark clearing ringed by tall pines and a few dead trees, silhouetted against a starry sky with a haloed moon. Stars twinkle, treetops sway slightly, and the torch throws a warm, slightly uneven beam.
2. Read the overlay: `fps`, `buffer … (scale …)` and `draws`. *Good:* fps near 60 or above (the 90 Hz screen may show up to 90), draws under 100. The scale settles somewhere in 0.45–0.75.

**Torch and atmosphere:**

3. D-pad left: torch off and on. *Good:* off, you can just make out the treeline by moonlight; on, the beam lights the ground and trunks. The beam trails your view very slightly when you whip round.
4. Walk up to a tree and shine the torch past it. *Good:* trees cast shadows away from you. Note if they look wrong or flicker.
5. Is the night too dark, too bright, or right? Is the torch too strong or too weak? (Both are single config numbers.)

**Movement:**

6. Walk with the left stick. *Good:* same speed and feel as M0, with a gentle head bob.
7. Click L3 while moving. *Good:* you sprint until you stop or run out. The overlay's `stamina` falls while sprinting and refills a second after you stop.
8. R3: crouch. *Good:* the view drops smoothly and you move at half speed; R3 again stands you up.
9. A: jump. A while crouched just stands you up.
10. Walk into trees and rocks. *Good:* you stop and slide round them, never through.

**Day/night and tools:**

11. Hold **View + D-pad down** (new combo) to open the debug menu. Use "Skip to next phase" a few times. *Good:* dawn has a pink horizon, day has blue-grey fog and sunlight, and dusk has a warm orange horizon. Try "Time speed x60" to watch it change.
12. In the menu, try "Quality: low / medium / high". *Good:* Low looks flatter (no shadow, no glow) but should be the smoothest; note the fps for each.

**The 20-minute gate:**

13. Set Quality back to medium, close the menu and walk around at night with the torch for **20 minutes** (time speed x1). *Good:* fps stays near the target the whole time, the scale doesn't sink to 0.45 and stay there, and the tablet doesn't get uncomfortably hot. Note the fps and scale at the start, at 10 minutes and at 20 minutes.

**Still to confirm from M0:** whether B ever leaves fullscreen or goes back a page; switching the controller off and on (toasts and no reload); the screen not dimming; the View + Menu overlay combo; the back gesture then "Tap to resume".

Send screenshots of the overlay at the start and at 20 minutes, and your answers to steps 5 and 12.

> **✅ HANDOVER READY**: Session 2 (Graphics Engineer) complete. Next: Session 3, Gameplay Programmer: M2 combat feel.
