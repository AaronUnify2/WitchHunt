# Open questions

Where `docs/DESIGN.md` was silent or unclear, the simplest option was chosen, made a config value where possible, and logged here for Aaron. Newest session first.

## Session 1 (M0, Lead Engineer)

| # | Question | What M0 does now | Where to change it |
| --- | --- | --- | --- |
| 1 | The design doc was uploaded as `Witch Hunt — Game Dev Doc.md` in the repo root, but the doc and the brief both refer to `docs/DESIGN.md`. | Moved (git mv, content unchanged) to `docs/DESIGN.md`. | n/a |
| 2 | How do the phases map onto a clock face? The HUD shows a clock, and the forecast says things like "runs dry around 2am", but no hours are given. | Day 07:00–19:00, dusk 19:00–20:00, night 20:00–06:00, dawn 06:00–07:00. Time moves faster at night (10 h in 6 min) than by day (12 h in 8 min). | `config.clock.phases[].startHour` |
| 3 | When does the day number go up, and where does a run start? | Day N is followed by night N; the counter goes up when a new day phase begins. M0 starts at the beginning of Day 1's day phase. (The opening has Tom wake at dawn; M9 can set `startPhase: 'dawn'`.) | `config.clock.startDay`, `startPhase` |
| 4 | Which controller combos open the debug tools? | Overlay: hold **View + Menu** (as you suggested). Debug menu: hold **L3 + R3**. Both 0.6 s. Both combos also register their single-button actions (inventory and pause; sprint and crouch). Is that OK, or should a building combo suppress them once those actions do something? | `config.input.combos` |
| 5 | Keyboard key for the debug menu? | **`** (backquote). | `config.input.keyBindings.debugMenu` |
| 6 | Keys 1–4 select a weapon slot directly, while Y/RB cycle. Should slots exist? | All four keys fire `switchWeapon` for now; direct slot selection is for M2 to decide. | `config.input.keyBindings.switchWeapon` |
| 7 | What should happen when the controller disconnects mid-game? | A toast and the active device switches to keyboard/mouse. No auto-pause, because there's no pause menu yet. Should it auto-pause once one exists? | `src/core/Game.js` (`input:gamepadDisconnected`) |
| 8 | What happens when the player leaves fullscreen (Android back gesture, Esc)? | The game suspends (clock and camera stop) and shows "Tap to resume", which re-enters fullscreen. | `config.display.resumeScreenOnFullscreenExit` |
| 9 | Should the debug menu pause the clock? | No. It only blocks camera movement while open. | `src/core/Game.js` `update()` |
| 10 | Starting look and dead-zone values for the controller. | Move dead zone 0.15, look dead zone 0.12, outer 0.05, look 180°/s horizontal and 120°/s vertical at full tilt, response curve exponent 2, trigger threshold 0.3. Tune on the tablet. | `config.input.gamepad` |
| 11 | Should the screen be kept awake? (Not in the doc.) | Yes, with the Screen Wake Lock API, because controller-only play never touches the screen. | `config.display.keepScreenAwake` |
| 12 | The doc says "a new map seed each run" but not how to force one for testing. | Random seed each load; `?seed=` in the URL overrides it; `config.rng.defaultSeed` can pin it. | `config.rng` |
| 13 | Trees: after the M0 play-test Aaron said they'll become "a more realistic 2D billboard sprite". DESIGN.md says near trees are low-poly instanced 3D and only far trees are billboard impostors. Billboards for all trees, or only distant ones? | Box placeholders (2 instanced draw calls). M1's Graphics Engineer should settle this with Aaron before building the forest. | `src/debug/TestScene.js` (replaced in M1) |
