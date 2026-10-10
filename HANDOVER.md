# Handover

## Just finished: Session 1, Lead Engineer, M0 (Project skeleton)

M0 is built and verified headless (see `STATUS.md`). What's left is the **on-device check**: Aaron runs the play-test script below on the Galaxy Tab S10 FE with the Xbox controller. If anything in it fails, the next Lead Engineer session fixes it before M1 goes far.

### Deployment setup (one-time, Aaron)

1. Merge the M0 branch into `main`.
2. GitHub repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Pushing to `main` (or Actions → "Deploy to GitHub Pages" → Run workflow) builds, tests and deploys.
4. Live at **https://aaronunify2.github.io/WitchHunt/**.

If the deploy job is refused, check **Settings → Environments → github-pages → Deployment branches** allows `main`. GitHub Pages on a free account needs a public repo.

## Next: Session 2, Graphics Engineer, M1 (Look and feel)

Goal from the build plan: renderer with dynamic resolution and post-processing, sky and day/night, the flashlight with its shadow, one clearing with an instanced forest, fog, first-person movement, sprint, crouch, flashlight. Done when walking around at night with the torch feels good on the tablet and holds the frame target for 20 minutes.

### Look at first

- `src/config.js`: add every new number here.
- `src/core/Game.js`: wiring and the loop. Swap `TestScene` and `FreeCamera` for the real scene and Player.
- `src/render/Renderer.js`: make the fixed `renderScale` dynamic.
- `src/core/Input.js`: query actions with `isDown`, `wasPressed`, `getMove()` and `getLook()` (already in radians this frame). Never read keys or buttons directly.
- `src/core/Clock.js`: `phase`, `hourOfDay` and `phase:*` events for the sky.
- `src/debug/DebugOverlay.js` `addStat()` and `src/debug/DebugMenu.js` `addItem()`: add a render-scale line and any M1 debug toggles.

### Gotchas and decisions

- Systems follow `init()` / `update(dt)` / `dispose()` and talk through `EventBus`.
- Use `rng.fork('label')` for each system's randomness so systems don't shift each other's sequences.
- The Vite `base` is `/WitchHunt/` for build and preview only. Asset URLs must be relative or go through `import.meta.env.BASE_URL`.
- Lights in three.js r155+ are physically based: intensities around 1–2 for the placeholder look.
- Open questions for Aaron are in `OPEN_QUESTIONS.md` (#4 combos, #7 disconnect behaviour and #10 stick tuning matter most for M1).

## Play-test script (M0) for Aaron

On the tablet, in Chrome, with the Xbox controller paired over Bluetooth:

1. **Open** https://aaronunify2.github.io/WitchHunt/ in landscape.
   *Good:* "WITCH HUNT / Tap to start" over a dark scene. The overlay is top-left with a moving fps number.
2. **Wake the controller:** press any button (e.g. A) before tapping.
   *Good:* the start screen line turns green with "Controller: Xbox Wireless Controller", and a "Controller connected" toast appears.
3. **Tap the screen.**
   *Good:* the browser bars disappear (fullscreen) and it stays landscape if you rotate the tablet.
4. **Read the overlay.**
   *Good:* `fps` near 60 (90 Hz screen: up to 90; 30 is the floor), `draws 3`, `device GAMEPAD`, `pad … [standard]`. If it says anything other than `[standard]`, take a screenshot: the button layout may be wrong.
5. **Move and look:** left stick walks, right stick looks around, among dark box trees in fog.
   *Good:* no drift when the sticks are released (`move +0.00 +0.00`); slow fine aiming with a light push and fast turns at full tilt; pushing up looks up; you can't walk off the ground.
6. **Buttons:** press each controller button in turn and watch `actions` and `buttons`.
   *Good:* A `jump`, B `reload`, X `interact`, Y and RB `switchWeapon`, LB `flare`, LT `aim`, RT `attack` (analogue value climbs as you squeeze), L3 `sprint`, R3 `crouch`, D-pad up/left/down `map` / `flashlight` / `radio`, View `inventory`, Menu `pause`. **Watch B:** if pressing it exits fullscreen or goes back a page, note it (known Android risk).
7. **Overlay toggle:** hold **View + Menu** for about half a second.
   *Good:* the overlay hides; hold again and it comes back.
8. **Debug menu:** hold **L3 + R3** (click both sticks) for about half a second.
   *Good:* a "DEBUG MENU" box opens. The D-pad or left stick moves the gold highlight; the camera stops moving; A on "Toggle debug overlay" toggles it; B closes the menu.
9. **Hot-plug:** switch the controller off.
   *Good:* a "Controller disconnected" toast and `device KEYBOARDMOUSE`. Switch it on and press a button: "Controller connected" and `device GAMEPAD` again, with no reload.
10. **Leave and come back:** use the Android back gesture (swipe in from the screen edge).
    *Good:* "Tap to resume"; one tap returns to fullscreen and the clock carries on from where it stopped.
11. **Leave it running for 5 minutes** without touching the screen.
    *Good:* the screen doesn't dim, fps stays steady, and the clock in the overlay counts up (`Day 1 day 07:xx`).

Send a screenshot of the overlay (fps line and `pad` line) with the results, and note any button that shows the wrong action.

> **✅ HANDOVER READY**: Session 1 (Lead Engineer) complete. Next: Session 2, Graphics Engineer: M1 look and feel.
