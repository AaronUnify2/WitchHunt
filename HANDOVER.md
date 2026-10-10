# Handover

## Just finished: Session 1, Lead Engineer, M0 (Project skeleton)

M0 is built, deployed and **play-tested by Aaron on the Galaxy Tab S10 FE with the Xbox controller**:

- The live GitHub Pages build loads on the tablet and runs.
- Walking and looking with the controller "feels good".
- Every button tried showed the right action in the debug overlay (interact, jump, reload, switchWeapon, etc.), so the Xbox mapping is correct on Android Chrome.
- Aaron finds the placeholder box trees acceptable for now (see "Trees" below).

Full details of what exists: `STATUS.md`. Decisions waiting on Aaron: `OPEN_QUESTIONS.md`.

### Deployment (working; for reference)

- Live at **https://aaronunify2.github.io/WitchHunt/**.
- `.github/workflows/deploy.yml` tests, builds and deploys on every push to `main` (or Actions > "Deploy to GitHub Pages" > Run workflow).
- **Settings > Pages > Source must stay "GitHub Actions".** On the first deploy it was still "Deploy from a branch". GitHub's branch job then overwrote the build with the raw source: a white page showing only "Turn the tablet to landscape", with `/src/main.js` returning 404. If that symptom ever comes back, check this setting first and re-run the workflow.

### Not yet confirmed on the tablet

Aaron's first session covered loading, movement, look and buttons. These M0 checks haven't been reported yet; fold them into the M1 play-test:

1. The fps reading in the overlay (M1's performance gate needs a baseline).
2. Whether the **B** button also triggers Android Back (leaving fullscreen or the page). This is a known Android risk; if it happens, the Lead Engineer adds a guard.
3. Controller off/on mid-game (hot-plug toasts, active device switching).
4. Screen staying awake during controller-only play (Screen Wake Lock).
5. Hold View + Menu (overlay) and hold L3 + R3 (debug menu) combos on the real controller.
6. Back gesture, then "Tap to resume".

## Next: Session 2, Graphics Engineer, M1 (Look and feel)

Goal from the build plan: renderer with dynamic resolution and post-processing, sky and day/night, the flashlight with its shadow, one clearing with an instanced forest, fog, first-person movement, sprint, crouch, flashlight. Done when walking around at night with the torch feels good on the tablet and holds the frame target for 20 minutes. M1 ends with a performance gate on the tablet.

### Trees: talk to Aaron before building

After the play-test Aaron said the box trees are fine for now, but the plan is a **"more realistic 2D billboard sprite"** as development goes on. `docs/DESIGN.md` currently says **near trees are low-poly instanced 3D (alpha-cut leaf cards, wind sway)** and only **far trees are billboard impostors**. These don't fully agree. Before building M1's forest, settle with Aaron whether billboards are meant for all trees or only distant ones (logged as OPEN_QUESTIONS #13). Whatever the answer, keep trees instanced and in one atlas so draw calls stay low.

### Look at first

- `src/config.js`: add every new number here, never in code.
- `src/core/Game.js`: wiring and the loop. Replace `debug/TestScene.js` and `debug/FreeCamera.js` with the real scene (`render/Sky.js`, `render/Forest.js`, `render/PostFX.js`) and `player/Player.js`.
- `src/debug/FreeCamera.js`: Aaron liked how movement feels. Carry its speed (`config.testCamera.moveSpeed` 4.5 m/s) and look settings (`config.input.gamepad`) into the Player as the starting point, rather than retuning from scratch.
- `src/render/Renderer.js`: make the fixed `renderScale` (0.65) dynamic.
- `src/core/Input.js`: query actions with `isDown`, `wasPressed`, `getMove()` and `getLook()` (already in radians this frame). Sprint (L3/Shift), crouch (R3/C) and flashlight (D-pad left/L) are already mapped and verified.
- `src/core/Clock.js`: `phase`, `hourOfDay` and `phase:*` events, to drive the sky and fog.
- `src/debug/DebugOverlay.js` `addStat()` and `src/debug/DebugMenu.js` `addItem()`: add a render-scale line and any M1 debug toggles.

### Gotchas and decisions

- Systems follow `init()` / `update(dt)` / `dispose()` and talk through `EventBus`.
- Use `rng.fork('label')` for each system's randomness so systems don't shift each other's sequences.
- The Vite `base` is `/WitchHunt/` for build and preview only. Asset URLs (textures, sprite atlases) must be imported or go through `import.meta.env.BASE_URL`; a hard-coded `/assets/...` path will 404 on Pages.
- Lights in three.js r155+ are physically based: placeholder intensities around 1.5–2.
- The overlay's "render" time is CPU-side only, not GPU time.
- OPEN_QUESTIONS #4 (debug combos also fire inventory/pause and sprint/crouch) matters in M1, since sprint and crouch start doing something. A held L3 + R3 to open the debug menu will briefly sprint and crouch.

## M1 play-test script

The Graphics Engineer writes this at the end of M1. It should include the six "not yet confirmed" checks above.

> **✅ HANDOVER READY**: Session 1 (Lead Engineer) complete. Next: Session 2, Graphics Engineer: M1 look and feel.
