# Witch Hunt: Status

Last updated: Session 3 (Gameplay Programmer), milestone **M2: Combat feel**.

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

### M2: Combat feel (Session 3)

Plan workshopped and approved by Aaron before building (rule 10). **Aaron's M2 tablet play-test: "Fighting the zombies at night was fun... real lot of fun."** M2's "done when" is met.

| Area | Files | Notes |
| --- | --- | --- |
| Combat hub | `src/combat/Combat.js` | Owns everything below and wires it through the event bus. Game calls `update()`; the player only moves while alive. |
| Weapons | `src/player/Weapons.js`, `src/combat/WeaponState.js` | Shovel, service rifle and shotgun from one table in `config.weapons`. **RB** next, **Y** previous (keys 1–4, wheel). **RT** fires (guns once per pull; the shovel keeps swinging while held). **LT** aims down sights: zoom, tighter spread, stronger aim assist. **B** reloads (rifle: whole magazine; shotgun: shell by shell, and firing cuts the reload short); an empty gun reloads when you pull the trigger. Switching takes 0.35 s. The tap that starts the game never fires. |
| Hit-scan and melee | `src/combat/hitscan.js` | Instant rays. A zombie is a body cylinder plus a narrower head cylinder (**headshots ×3**). Tree trunks and rock bodies block shots (canopies don't). Shotgun: 8 pellets in a cone, damage falls off from 8 m to 25 m, one hit per zombie per shot. Shovel: 2.2 m reach, 70° arc, connects 0.14 s into the swing, big stagger and knockback. |
| Aim slowdown | `src/player/Player.js` | Aiming or firing slows you to 0.6× and stops a sprint (`config.player.aimMultiplier`). |
| Aim assist | `src/combat/aimAssist.js` | Light: controller look slows (to 0.45×, 0.35× aimed) over a zombie's body or head, fading out over 3°. No magnetism. Never on the mouse. Toggle in the debug menu. |
| Zombie | `src/ai/Zombie.js`, `EnemyManager.js` | One "citizen" type using level 1 rules. Pool of 25 (the active cap). Walks straight at you at 0.35–0.45× your sprint (debug: level 5 is 0.5–1.3×, skewed slow). Slides round trees and rocks, keeps apart from other zombies. Swipe: 0.5 s wind-up, 10 damage, only lands if you're still in reach. Hits flash it red, stagger and knock it back (a hit in the wind-up cancels the swipe). 60 health. Falls when killed; the body stays 20 s, then sinks away. Close zombies are fed into the torch glare check. |
| Zombie sprite | `src/render/ZombieRenderer.js`, `zombieSprite.js` | Doom-style billboard: 8 facing angles × 11 frames (walk 4, swipe 2, flinch 1, fall 4) in one procedural atlas, crisp nearest-neighbour pixels up close. One instanced draw call plus one in the torch shadow pass. Lit by the torch, casts its shadow. Dark albedo (`albedoScale`) because sprites face the torch head-on. |
| In-hand weapons | `src/player/ViewModel.js` | Placeholder box-and-cylinder models (one mesh each), footstep-paced sway (`config.viewModel.bob`: one dip per step, 1.8 steps/s walking, 2.3 sprinting), recoil kick, pump slide, reload dip, lower and raise on switch, shovel swing, muzzle flash card. Baked shading (the torch would blow them out). |
| Effects | `src/render/CombatFx.js` | Blood spurts (more on a headshot) and dust puffs where misses land: one pooled `Points` object. A pooled muzzle-flash point light (always in the scene, intensity only, no shadow). Camera kick and shake. |
| Health, armour, healing | `src/player/Health.js`, `Armour.js`, `Inventory.js` | Health 0–100, no regen. Three armour bars soak damage ballistic → energy → nature → health. First aid kits (start with 2): **D-pad right** / H heals 30 at 10 per second; a second kit queues; nothing heals past 100. |
| HUD (placeholder) | `src/ui/Hud.js`, `style.css` | Crosshair (dot only while aiming), hit marker (yellow on headshots, red and bigger on kills), "B: reload" / "Out of ammo" prompt, health in 10 segments (pulses red at 30 or below), a healing "+", three armour bars, weapon name, ammo, reload bar, first aid count, red screen edge when hurt, "You died" screen (A / Enter: try again). |
| Sounds (placeholder) | `src/audio/Sfx.js` | **Placeholder, to be upgraded in the audio pass (Session 20).** Synthesised on the fly: rifle, shotgun and pump, shovel swing and hit, flesh hit, headshot, kill, positional zombie groans and swipes, hurt, reload clicks, empty click, switch, heal, death. |
| Debug menu | `Combat.addDebugItems()` | Spawn 5 zombies, zombie speed level 1 / 5, kill all, god mode, aim assist on/off, give ammo, give armour, give first aid kits, hurt me (−25). |
| Debug overlay | `Combat.overlayLine()` | New `combat` line: living / active enemies, level, health, armour, weapon and ammo, current aim-assist factor, kills, GOD. |
| Tests | `tests/*.test.js` | 116 tests (55 new): weapon sway pacing, armour order, healing queue, aim assist, weapon state (fire rate, magazine and shell reloads, melee), hit-scan geometry (body / head / blockers / falloff / spread / melee arc), zombie behaviour (walk, swipe timing, stagger, death, corpse, knockback, frames, speed rolls), rock-top glare. |

### M2 follow-up: Aaron's tablet play-test

| Feedback | Change | Tune in |
| --- | --- | --- |
| The weapon bobs far too fast, and vibrates at a sprint | The sway was driven by the camera's head-bob cycle and folded with an absolute value, doubling it: about 8 bounces a second walking and 13 sprinting. It now has its own footstep pace: one smooth dip per step at 1.8 steps a second walking and 2.3 sprinting (a little deeper), side to side once every two steps, easing in and out as you start and stop. The camera's head bob is unchanged. | `config.viewModel.bob` |

### M1 follow-up round 2 (Session 3, from Aaron's 20-minute tablet test)

| Feedback | Change | Tune in |
| --- | --- | --- |
| Dead trees look too smooth up close at face height | The dead tree's trunk now has its own dense bark grain, round shading (lit left, dark right), long cracks and knots. | `config.forest.dead*` |
| The torch is a touch too focused to navigate by | A second, wider (48°) and dimmer spotlight round the beam: no shadow, no pattern, dims with the glare check. The edges of the view are no longer black. | `config.flashlight.spill` |
| A rock dead-on up close looks like a magnifying glass burning | The glare check treated rocks as cylinders with no lid, so a torch aimed down onto a rock's top didn't count it and the torch stayed at full power. Rock tops now count; the torch dims to about 7% there. (Aaron's screenshot didn't come through; check this on the tablet.) | `src/world/collision.js` `nearestHit()` |

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

- `npm run dev`, `npm run build`, `npm run preview` and `npm test` (116/116) all pass. Production build at `/WitchHunt/` runs with no console errors.
- **M1 performance gate passed on the tablet (Aaron):** a steady 60 fps for 20+ minutes of night walking at Medium, the tablet warm but not hot. Locking and unlocking, controller off and on, and leaving fullscreen all recover.
- **M2 on the tablet (Aaron):** fighting zombies at night is fun. **60 fps the whole time, even with 20+ zombies spawned at once.** B always reloads and never leaves fullscreen. The torch is enough to fight by. The dead trees look "much, much better" and the rock glare is gone.
- **M2 in headless Chromium with a simulated Xbox controller:**
  - RT fires the rifle and shotgun and hits zombies (body and head); LT zooms; B reloads; RB / Y cycle weapons both ways; the shovel connects and kills; D-pad right uses a kit; zombies walk in, swipe and hurt the player; death shows the screen and A restarts.
  - Screenshots: all 8 facing angles and the fall frames read correctly; zombies are dark and lit by the torch; crisp pixels up close; the red hurt edge, hit markers and HUD.
  - Draw calls 48–57 at Medium with 5 zombies (budget ~100).
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

- The weapon-sway fix on the tablet (made after the play-test; checked headless only).
- Whether the placeholder sounds play on Android Chrome (Aaron didn't mention them either way).
- Feel numbers (aim assist strength, recoil, zombie damage, headshot ×3) passed a first play-test; they get their real tuning in M14.
- Headless runs use a software GPU (~10 fps), so its timings say nothing about the tablet.

## Stubbed / placeholder (by design)

- All art is procedural placeholder (tree sprites, ground, torch pattern, moon). The art pass replaces it.
- One clearing only; M3 generates the real map, terrain and chunked forest from the seed.
- The HUD is a placeholder (no pixel font, no minimap, clock or glyphs); no pause menu.
- Zombies only walk straight at the player. Detection, targeting, levels 2–4, variants, hordes, mutants and loot drops are M4. They don't spawn on their own: use the debug menu.
- The zombie sprite, the in-hand weapons and every sound are placeholders (art pass M13, audio pass Session 20).
- Armour only comes from the debug menu (pickups arrive with the police and army variants in M4).
- The inventory holds only first aid kits; the inventory screen is later.
- Not built from "Visual ambition": ground mist layers, height fog, fake light shafts, fireflies and other particles, normal-mapped blended ground, distant impostor tweaks, retro pixel filter. These belong to the style passes (OPEN_QUESTIONS #21).
- Billboard trees look like flat cards when you stand right next to one, the expected trade-off of sprites (the decision Aaron made). Final art can soften this with wider, bushier sprites.
- The placeholder drawing proportions in `proceduralTextures.js` (tier shapes, gradient stops) are hard-coded rather than in config, since the whole file is thrown away in the art pass. Colours, counts and sizes are in config.

## Dependencies

Only `three` (runtime), `vite` and `vitest` (dev). Post-processing and geometry merging use three.js's own `three/addons` modules, which ship inside the `three` package. Sounds use the browser's Web Audio API.

## Known issues and risks

1. **M2 added two lights** (the torch spill and the muzzle flash). The tablet held 60 fps with them and 20+ zombies. If later milestones push the frame rate down, the levers are: `flashlight.spill.intensity: 0` (or remove the spill), then the M1 levers: the Low preset; shadow map 512 to off; `bloom: false`; a lower `drawDistance`; bigger `forest.cellSize`.
2. **Zombie sprites are lit head-on by the torch**, so their colours are pulled down with `zombies.albedoScale`. The final pre-rendered sprites need the same care (dark, mossy albedos).
3. **The zombie atlas is drawn mirrored for angles 5–7**, so its painted moonlight comes from the right on those rows. Invisible at night; the art pass replaces it.
4. **Switching quality or toggling the torch can hitch once** (around 100 ms on mobile) while shaders compile for the new light setup. Later toggles are instant.
5. **Android "Back" on the B button:** confirmed fine in M2 (B always reloads, never leaves fullscreen).
6. **The Xbox (Guide) button** belongs to Android and the browser.
7. **Chrome only exposes a controller after a button press on it.**
8. **The controller can't start the game**: the first start needs a tap (browser rule for fullscreen).
9. **View still fires `inventory` on press** during the View + Menu and View + D-pad down combos. Harmless until the inventory screen exists (OPEN_QUESTIONS #4).
10. **Frame times are CPU-side only.** "render" is the CPU cost of submitting the frame, not GPU time.
11. **Desktop Esc** releases the mouse and exits fullscreen, showing "Tap to resume". Expected.
12. Production sourcemaps are deployed (~3 MB, only downloaded with devtools open) for remote debugging via `chrome://inspect`.

## What M3 needs next

M3, **The map** (Session 4, Lead Engineer): seeded generation of 22 clearings in bands, the cliff, pathways, chunked forest, colliders, fog of war, minimap and map screen, encounter placeholders from data. Done when a whole map generates the same from a seed and walking end to end holds the frame target on the tablet.

- M2's gate is passed (Aaron: fun, 60 fps with 20+ zombies).
- Zombies and the player both clamp to `config.world.boundaryRadius` round the M1 clearing; M3 replaces that with the map's bounds.
- `EnemyManager` resolves zombies against the same static collider grid as the player, so M3's colliders work for zombies with no changes.
- Shots are blocked by colliders' `r` (trunks) and `top` (rocks): new colliders should carry those.
