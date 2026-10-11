# Witch Hunt: Status

Last updated: Session 2 (Graphics Engineer), milestone **M1: Look and feel**. (Sessions 1 and 2 ran back to back in one conversation, at Aaron's request.)

Design source of truth: [`docs/DESIGN.md`](docs/DESIGN.md). Open decisions: [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md). Next session: [`HANDOVER.md`](HANDOVER.md).

## How to run

```
npm install
npm run dev       # dev server (http://localhost:5173/; also on your LAN via --host)
npm run build     # production build into dist/ (base path /WitchHunt/)
npm run preview   # serve the build at http://localhost:4173/WitchHunt/
npm test          # Vitest unit tests
```

Live build: **https://aaronunify2.github.io/WitchHunt/** (Settings > Pages > Source must be "GitHub Actions"; "Deploy from a branch" serves raw source and shows a blank page.)

Dev conveniences: `?seed=1234` in the URL fixes the run seed (and so the forest layout). In dev builds, `window.game` exposes the running Game in the browser console.

## What exists

### M1: Look and feel (Session 2)

| Area | Files | Notes |
| --- | --- | --- |
| Renderer | `src/render/Renderer.js` | ACES filmic tone mapping, PCF shadow map for the torch, render scale set by dynamic resolution, draw calls counted across all passes. |
| Dynamic resolution | `src/render/DynamicResolution.js` | Averages frame time over 1 s. Drops the render scale one step (0.05) after a slow window; raises one step only after 4 s on target. Bounds come from the quality preset. Target = 60 fps, or the frame cap if set. |
| Post-processing | `src/render/PostFX.js` | Bloom (bright pixels only: torch hot spot, moon), then tone mapping, then one cheap pass for colour grade (saturation, cold tint), vignette and animated film grain. Uses three.js's bundled add-ons (no new dependency). Off in the Low preset. |
| Sky and day/night | `src/render/Sky.js`, `skyPalette.js` | Gradient dome, 1,400 twinkling stars, moon with halo, sun/moon directional light, ambient light and fog colour, all blended from hour-keyed colours in config and driven by the Clock. The sun rises in the east, crosses the south and sets in the west. |
| Fog | `Sky.js` | Linear fog ending at the preset's draw distance (fog end = draw distance, as DESIGN.md asks). Colour follows the sky's horizon. |
| Forest | `src/render/Forest.js`, `src/world/forestLayout.js` | About 3,500 billboard trees from a seeded jittered grid around a 16 m clearing. Camera-facing sprites (rotate about the vertical only) with wind sway, from one 3-variant atlas (two conifers and a dead tree). Grouped into 32 m chunks; chunks beyond the draw distance aren't drawn. Trees cast and receive the torch shadow through a matching depth material. |
| Ground | `src/world/Terrain.js` | Tiled procedural forest floor, a soft dirt patch in the clearing, and 9 rocks (instanced; they cast shadows and block the player). |
| Placeholder textures | `src/render/proceduralTextures.js` | Tree atlas, ground, clearing, moon and torch cookie, all drawn on canvases from the seed. Swapped for real art in the art pass. |
| Flashlight | `src/player/Flashlight.js` | Spotlight held low and to the right with a procedural "imperfect torch" pattern; the one real-time shadow. The beam lags the view slightly so it feels hand-held. D-pad left / L. |
| Player | `src/player/Player.js`, `Stamina.js` | Walk 4.5 m/s (the speed signed off in M0), sprint ×1.6 using stamina (L3 click latches; Shift holds), toggle crouch ×0.5 with eased eye height (R3 / C), jump (A / Space), acceleration and deceleration, subtle head bob, and collision against trunks and rocks. |
| Collision | `src/world/SpatialGrid.js`, `collision.js` | Circle-vs-circle on the ground plane with a spatial grid for lookups; the player slides round trunks. A boundary keeps the player within 100 m of the clearing. |
| Quality presets | `config.quality` | Low / Medium (default) / High: render-scale bounds, draw distance, torch shadow and its resolution, post-processing, bloom, frame cap. Switchable live in the debug menu. |
| Debug menu | `src/debug/DebugMenu.js` | Now has: toggle overlay, skip to next phase, time speed ×1/×10/×60, quality preset, frame cap (off/30/60), dynamic resolution on/off, close. |
| Debug overlay | `src/debug/DebugOverlay.js` | Adds the current render scale, quality line, player line (stance, speed, stamina, position) and world line (tree count, torch on/off). |
| Tests | `tests/*.test.js` | 61 tests (31 new in M1): sky keyframes and sun path, dynamic resolution, stamina, collision and spatial grid, forest layout (determinism, empty clearing, minimum spacing), clock skip and time scale. |

### M0: Project skeleton (Session 1)

Vite + three.js + Vitest; GitHub Pages deploy on every push to `main` (tests must pass first); `config.js` with every tuning number; Game loop and phases; Clock; EventBus; seeded Rng; Input for the Xbox controller and keyboard/mouse with dead zones, hot-plug and active-device tracking; tap-to-start with fullscreen, landscape lock, "tap to resume" and screen wake lock; debug overlay and menu. M0's test scene and free camera were removed in M1.

### M1 follow-up: Aaron's tablet play-test feedback

Aaron's verdict on M1: "really great work". He asked for three changes, now made:

| Feedback | Change | Tune in |
| --- | --- | --- |
| Trees look like flat green and brown cutouts | Each tree sprite now has fine dark dappling (denser on the shadow side) for depth, speckles in five leaf greens, a different green per branch tier, and bark streaks on trunks and dead trees. | `config.forest.dapple*`, `needleVariants`, `bark*` |
| Rocks look too blocky (dodecahedrons) | Rocks are smooth, lumpy stones: a subdivided sphere bent by overlapping waves, smooth shading, each one stretched differently. Darker, mossier grey. | `config.terrain.rocks` |
| The torch glares back too brightly from close trees and rocks | The torch checks 7 rays across its beam each frame. If it's hitting a nearby surface head-on (harder than a head-on surface 8 m away), it dims smoothly to match. The ground ahead, hit at a glancing angle, keeps the full beam. The overlay's `world` line shows the torch's current strength and the distance to the surface causing it. | `config.flashlight.glare` |

## What works (verified)

- `npm run dev`, `npm run build`, `npm run preview` and `npm test` (61/61) all pass. Production build at `/WitchHunt/` runs with no console errors.
- **On the tablet (Aaron, M0):** the live build loads, controller movement and look feel good, and every button shows the right action.
- **Headless Chromium with a simulated Xbox controller (M1):**
  - L3 click latches sprint at 7.2 m/s; stopping clears it; stamina drains and refills.
  - R3 toggles crouch; A while crouched stands up; A otherwise jumps.
  - D-pad left toggles the torch.
  - Hold View + D-pad down opens the debug menu without firing "radio". Quality switches live (High shows the torch shadow at 1024 px).
  - Walking into a trunk stops exactly at player radius + trunk radius and slides round it.
- **Screenshots (software GPU):**
  - Night: moonlit tree silhouettes against stars, a warm torch beam picking out trees and rocks.
  - Day: blue-grey fog, lit pines and dead trees, readable ground.
  - Dusk: warm horizon.
  - Draw calls: 53–55 at medium (budget ~100).

## Not verified

- **Anything on the tablet for M1.** Frame rate, dynamic resolution behaviour, thermal throttling over 20 minutes, and how the torch and night brightness look on a real screen. That is M1's "done when" and needs Aaron (play-test script in HANDOVER.md).
- Headless runs use a software GPU (~10 fps), so its timings say nothing about the tablet.
- The M0 checks still unconfirmed on the tablet (B vs Android Back, hot-plug, wake lock, combos, resume), carried into the M1 script.

## Stubbed / placeholder (by design)

- All art is procedural placeholder (tree sprites, ground, torch pattern, moon). The art pass replaces it.
- One clearing only; M3 generates the real map, terrain and chunked forest from the seed.
- No HUD (the stamina value shows in the overlay only), no pause menu.
- Not built from "Visual ambition": ground mist layers, height fog, fake light shafts, fireflies and other particles, normal-mapped blended ground, distant impostor tweaks, retro pixel filter. These belong to the style passes (OPEN_QUESTIONS #21).
- Billboard trees look like flat cards when you stand right next to one, the expected trade-off of sprites (the decision Aaron made). Final art can soften this with wider, bushier sprites.
- The placeholder drawing proportions in `proceduralTextures.js` (tier shapes, gradient stops) are hard-coded rather than in config, since the whole file is thrown away in the art pass. Colours, counts and sizes are in config.

## Dependencies

Only `three` (runtime), `vite` and `vitest` (dev). Post-processing uses three.js's own `three/addons` modules, which ship inside the `three` package.

## Known issues and risks

1. **Performance on the tablet is unmeasured.** The biggest costs are probably the torch's shadow pass over ~3,500 sprites, bloom's blur chain, and alpha-tested overdraw at the forest edge. Levers in order: the Low preset; shadow map 512 to off; `bloom: false`; a lower `drawDistance`; bigger `forest.cellSize` (fewer trees). All are config.
2. **Switching quality or toggling the torch can hitch once** (around 100 ms on mobile) while shaders compile for the new light setup. Later toggles are instant.
3. **Android "Back" on the B button** (carried from M0): unconfirmed.
4. **The Xbox (Guide) button** belongs to Android and the browser.
5. **Chrome only exposes a controller after a button press on it.**
6. **The controller can't start the game**: the first start needs a tap (browser rule for fullscreen).
7. **View still fires `inventory` on press** during the View + Menu and View + D-pad down combos. Harmless until the inventory screen exists (OPEN_QUESTIONS #4).
8. **Frame times are CPU-side only.** "render" is the CPU cost of submitting the frame, not GPU time.
9. **Desktop Esc** releases the mouse and exits fullscreen, showing "Tap to resume". Expected.
10. Production sourcemaps are deployed (~3 MB, only downloaded with devtools open) for remote debugging via `chrome://inspect`.

## What M2 needs next

M2, **Combat feel** (Session 3, Gameplay Programmer): shovel, service rifle, shotgun; one zombie sprite type; hits, death, aim assist, aim slowdown, health and armour bars, first aid kits. Done when fighting five zombies at night is fun on the controller.

- Gate first: Aaron's M1 tablet play-test. If the frame target isn't held for 20 minutes, fix performance before M2 (DESIGN.md "Performance gates").
- Zombies are billboard sprites like the trees: reuse `Forest.js`'s billboard shader patch, adding an 8-angle frame pick.
- Aim slowdown multiplies `config.player.walkSpeed`; add it next to `sprintMultiplier` and `crouchMultiplier` in `Player.updateMovement()`.
- Rule 10 applies: workshop the zombie and weapon build plans with Aaron before building them.
