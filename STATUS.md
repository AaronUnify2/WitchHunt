# Witch Hunt: Status

Last updated: Session 1 (Lead Engineer), milestone **M0: Project skeleton**.

Design source of truth: [`docs/DESIGN.md`](docs/DESIGN.md). Open decisions: [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md). Next session: [`HANDOVER.md`](HANDOVER.md).

## How to run

```
npm install
npm run dev       # dev server (http://localhost:5173/; also on your LAN via --host)
npm run build     # production build into dist/ (base path /WitchHunt/)
npm run preview   # serve the build at http://localhost:4173/WitchHunt/
npm test          # Vitest unit tests
```

Live build (after the first deploy from `main`): **https://aaronunify2.github.io/WitchHunt/**

Dev conveniences: `?seed=1234` in the URL fixes the run seed. In dev builds, `window.game` exposes the running Game in the browser console.

## What was built in M0

| Area | Files | Notes |
| --- | --- | --- |
| Tooling | `package.json`, `vite.config.js` | Vite 8.3.4, three.js 0.186.1, Vitest 5.0.3. Plain JS ES modules. `base` is `/WitchHunt/` for build and preview, `/` for dev. |
| Deploy | `.github/workflows/deploy.yml` | On every push to `main` (and manually): `npm ci`, `npm test`, `npm run build`, deploy `dist/` to GitHub Pages. A failing test blocks the deploy. |
| Config | `src/config.js` | Every tuning number: loop, seed, clock, display, render, input (dead zones, sensitivity, bindings, combos), test scene, UI, debug. |
| Game | `src/core/Game.js` | Owns all systems; rAF loop with clamped dt; app states `boot` / `running` / `suspended`; turns clock phase changes into `phase:day`, `phase:dusk`, `phase:night`, `phase:dawn` events. |
| Clock | `src/core/Clock.js` | Day/dusk/night/dawn cycle from config (8/1/6/1 min), day counter, clock-face time ("HH:MM"), pause, time scale. |
| EventBus | `src/core/EventBus.js` | `on` / `once` / `off` / `emit`; safe against unsubscribe-during-emit; one throwing handler doesn't stop the rest. |
| Rng | `src/core/Rng.js` | Seeded mulberry32; number or string seeds; `next`, `range`, `int`, `chance`, `pick`, `fork(label)` for independent sub-streams. |
| Input | `src/core/Input.js`, `GamepadInput.js`, `KeyboardMouseInput.js`, `stickMath.js` | Xbox controller (Gamepad API, standard mapping) and keyboard/mouse mapped to every action in DESIGN.md "Controls", plus menu and debug actions. Radial dead zones with rescaling, look response curve, sensitivity and invert-Y, all in config. Tracks the active device. Hot-plug: the controller can connect or disconnect at any time. |
| Display | `src/core/Display.js` | Fullscreen + landscape lock on the start tap; Screen Wake Lock (see below). |
| Renderer | `src/render/Renderer.js` | WebGLRenderer at a fixed render scale (0.65 of native). Exposes draw calls, triangles, buffer size. Handles resize and context loss. |
| Test scene | `src/debug/TestScene.js` | Ground plane, 220 seeded box trees (2 instanced draw calls), night sky colour, fog, ambient + moonlight. 3 draw calls total. |
| Test camera | `src/debug/FreeCamera.js` | First-person look (right stick / mouse) and walk (left stick / WASD) on the ground plane. |
| Start screen | `src/ui/StartScreen.js` | "Tap to start" (fullscreen + landscape), "Tap to resume" after leaving fullscreen, live controller status. Portrait on a touch device shows "Turn the tablet to landscape". |
| Toasts | `src/ui/Toast.js` | "Controller connected / disconnected", context-loss messages. |
| Debug overlay | `src/debug/DebugOverlay.js` | fps, frame time split sim/render (CPU), draw calls, triangles, buffer size, seed, clock, app state, active device, controller name and mapping, live pressed actions, move vector, raw sticks, raw buttons with analogue values. `addStat()` lets later milestones add lines. **F3** or hold **View + Menu**. Visible by default in M0. |
| Debug menu | `src/debug/DebugMenu.js` | Controller-navigable stub with `addItem(label, fn)`. Has only "Toggle debug overlay" and "Close menu" for now. Hold **L3 + R3** or press **`** (backquote). D-pad/stick/arrows to move, A/Enter to select, B/Esc to close. |
| Tests | `tests/*.test.js` | 30 tests: Rng (determinism, bounds, fork), EventBus, Clock (phase order, day count, clock face, pause, time scale), stick maths (dead zone, curve, clamp). |

## What works (verified this session)

- `npm run dev`, `npm run build`, `npm run preview` and `npm test` (30/30) all pass.
- Headless Chromium smoke test against the production build at `/WitchHunt/`, with a mocked Xbox controller: no console errors; tap to start enters fullscreen; keyboard W and left stick both move the camera forward at the configured speed; right stick turns at the configured rate; RT shows as `attack` with its analogue value; controller connect and disconnect toasts appear and the active device switches; holding View + Menu toggles the overlay; holding L3 + R3 opens the debug menu; D-pad moves the selection; A selects; B closes; F3 toggles the overlay.

## Not verified

- **Not yet run on the Samsung tablet or with a real Xbox controller.** That is the M0 "done when" check, and it needs Aaron: see the play-test script in HANDOVER.md.
- Headless Chromium uses a software GPU, so its fps (~20–50) says nothing about the tablet.

## Stubbed / placeholder (by design)

- Test scene and free camera are throwaway M0 scaffolding; M1 replaces them with the real Renderer, Sky, Forest and Player.
- Render scale is fixed (0.65). Dynamic resolution is M1.
- No pause menu, HUD, sprint, crouch or jump yet. Gameplay actions (attack, reload, map...) are detected and shown in the overlay but do nothing.
- The debug menu has no real tools yet; later milestones add them with `addItem`.
- The overlay has no "active enemies" line yet; M2/M4 add it with `addStat`.
- `src/world`, `player`, `ai`, `sigils`, `base`, `encounters`, `story`, `meta`, `audio` and `data` are empty folders (`.gitkeep`).

## Additions outside the brief (with reasons)

- **Screen Wake Lock** (`config.display.keepScreenAwake`): during controller-only play nobody touches the screen, and Android may dim or lock the tablet mid-session. It uses a built-in browser API (no dependency). Turn it off in config if it isn't wanted.
- **`?seed=` URL parameter**: the simplest form of the design's debug "set seed" tool, and handy for checking that a seed reproduces a scene.
- **Raw button/stick readout** in the overlay: shows what the tablet actually reports, so a mapping problem can be diagnosed from a screenshot.

## Dependencies

Only `three` (runtime), `vite` and `vitest` (dev). No others.

## Known issues and risks

1. **Android "Back" on the B button.** On some Android/Chrome versions the controller's B button also acts as the system Back button, which can leave fullscreen or navigate away. If the play-test hits this, the next Lead Engineer session needs a guard (e.g. a history entry that catches `popstate`).
2. **The Xbox (Guide) button** belongs to Android and the browser; the game never sees it.
3. **Chrome only exposes a controller after a button press on it**, so a freshly loaded page shows "No controller yet" until any button is pressed. The start screen says so.
4. **Controller can't start the game.** Browsers only allow fullscreen from a touch, click or key press, not a gamepad button, so the first start needs one tap on the screen.
5. **Debug combos overlap gameplay actions**: View + Menu also registers `inventory` and `pause`; L3 + R3 also registers `sprint` and `crouch`. Harmless in M0 (those actions do nothing); see OPEN_QUESTIONS.md.
6. **Frame times are CPU-side only**: "render" is the CPU cost of submitting the frame, not GPU time. If M1 needs GPU timing, the `EXT_disjoint_timer_query_webgl2` extension is the usual route (often unavailable on mobile).
7. **Desktop Esc** releases pointer lock and exits fullscreen, which shows "Tap to resume". Expected; click to carry on.
8. Production sourcemaps are deployed (helps remote-debugging the tablet via `chrome://inspect`). They add ~3 MB to the Pages site but are only downloaded when devtools are open.

## What M1 needs next

M1, **Look and feel** (Session 2, Graphics Engineer):

- Replace `src/debug/TestScene.js` and `src/debug/FreeCamera.js` with `render/Sky.js`, `render/Forest.js`, `render/PostFX.js` and `player/Player.js` (movement, sprint, crouch, flashlight).
- Make `render/Renderer.js` dynamic resolution (start at `config.render.renderScale`, adjust to hold the frame target); report the current scale in the overlay.
- Drive sky and fog from `Clock` (`clock.phase`, `clock.hourOfDay`, `phase:*` events).
- Keep the overlay's draw calls under ~100 and run the 20-minute performance gate on the tablet.
