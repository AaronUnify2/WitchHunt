# Open questions

Where `docs/DESIGN.md` was silent or unclear, the simplest option was chosen, made a config value where possible, and logged here for Aaron. Newest session first. Resolved items are kept, marked **Resolved**, for the record.

## Session 3 (M2, Gameplay Programmer)

| # | Question | What M2 does now | Where to change it |
| --- | --- | --- | --- |
| 22 | How big is the headshot bonus? | **Decided with Aaron:** headshots are in, "×2 at least, open to ×3–4". M2 uses **×3**, so one aimed rifle headshot (75) kills a 60-health zombie. | `config.weapons.headshotMultiplier` |
| 23 | Which buttons switch weapons and use first aid? | **Decided with Aaron:** RB = next weapon, Y = previous, D-pad right = first aid (keyboard: 1–4 pick a slot, wheel = next, H = first aid). DESIGN.md "Controls" updated. | `config.input.gamepadBindings` |
| 24 | Healing at full health: what happens to queued kits? | DESIGN.md says leftovers are lost. M2 also drops any kits still queued when health reaches 100, and won't let you use a kit at full health (so you can't waste one by accident). | `src/player/Health.js` |
| 25 | Where does the shotgun come from in M2? | All three weapons from the start, so they can be compared. M9 moves the shotgun to the campsite (DESIGN.md). | `config.weapons.startingLoadout` |
| 26 | How hard do zombies hit? | 10 damage per swipe, 0.5 s wind-up (time to back off), 1.25 s between swipes. Five zombies round a player who stands still kill them in about 5 s; L1 zombies walk at 2.5–3.2 m/s, slower than your 4.5 m/s walk, so you can back off and shoot. | `config.zombies.attack*` |
| 27 | Starting ammo. | Rifle 5 + 10 ("a handful"), shotgun 4 + 12. "Give ammo" in the debug menu adds 20 to each gun. | `config.weapons.*.startReserve` |
| 28 | Can you sprint while aiming or just after firing? | No: aiming (LT) and firing slow you to 0.6× and stop a sprint, so fast zombies make you choose between running and shooting (DESIGN.md "Movement"). | `src/player/Player.js` `updateMovement()` |
| 29 | Death in M2. | A "You died" screen with "A / Enter: try again", which resets health, armour, kits, ammo and position and removes all zombies. The real permadeath flow (defeat screen, run summary) is M7 and M12. | `src/combat/Combat.js` |
| 30 | Placeholder sounds. | **Aaron: yes, and note they'll be upgraded.** Every combat sound is synthesised on the fly (Web Audio); no files. **To be replaced in the audio pass (Session 20).** | `src/audio/Sfx.js` |
| 31 | Aim assist on the mouse? | Controller only. The mouse is never slowed. Toggle it in the debug menu to compare. | `config.aimAssist` |
| 32 | The in-hand weapons are unlit. | The torch sits right beside the gun, so real lighting blew it out. The placeholder shapes use baked shading, tinted each frame by the sky's ambient and sun/moon light plus a torch fill (after Aaron saw a black gun by day). The art pass should keep that approach (or a separate view-model light). | `src/player/ViewModel.js` |
| 33 | The overlay clock reads like minutes:seconds. | It's the in-game clock face (hours:minutes); one game minute at night is 0.6 real seconds, so it runs about 100× real time by design (#2). Aaron read "21:15" as a stopwatch. The final HUD (Session 19) shows "Night 1 · 21:15" in the top left, as DESIGN.md asks. | `config.clock.phases` |

## Session 2 (M1, Graphics Engineer)

| # | Question | What M1 does now | Where to change it |
| --- | --- | --- | --- |
| 14 | How bright should the flashlight be, and how dark the night? | Aaron's M1 play-test: the torch is great, but it glared back from close trees and rocks; now fixed with close-range dimming (`config.flashlight.glare`). Torch 300 cd with decay 1.6 over 45 m. Night ambient 1.1, moonlight 0.9. Tuned from screenshots on a software renderer; needs a look on the tablet. | `config.flashlight`, `config.sky.keys` |
| 15 | Should sprint be hold or toggle? | Controller: click L3 once and you sprint until you stop moving or run out of stamina (common console behaviour). Keyboard: hold Shift. | `src/player/Player.js` `updateStance()` |
| 16 | Should jump work while crouched? | Pressing jump while crouched stands you up instead of jumping. Sprinting also stands you up. | `src/player/Player.js` |
| 17 | Head bob: wanted, and how much? | A subtle 3.5 cm bob that scales with speed. Set `amplitude: 0` to turn it off. | `config.player.headBob` |
| 18 | Where should a run start on the clock? | M1 starts at the beginning of night so the torch test needs no skipping. M9 sets the real start (#3). | `config.clock.startPhase` |
| 19 | Quality defaults for the tablet. | **Medium** by default: render scale 0.45–0.75 (dynamic), 80 m draw distance, torch shadow on at 512 px, post-processing and bloom on, no frame cap. **Low** turns off shadow and post and caps at 30 fps. Pick live from the debug menu. | `config.quality` |
| 20 | Frame cap on a 90 Hz screen. | No cap by default (the game runs at the display's 90 Hz when it can; dynamic resolution only aims for 60). A 60 cap on a 90 Hz screen would drop every third frame and judder, so try it from the debug menu before making it the default. | `config.quality.presets.*.frameCap` |
| 21 | The retro pixel filter, ground mist, height fog and particles (Quality settings and "Visual ambition" in DESIGN.md). | Not built in M1 (M1's scope is the renderer, sky, fog, torch, forest and movement). Belong in the style passes (M13 / session 10). | n/a |

## Session 1 (M0, Lead Engineer)

| # | Question | What M0 does now | Where to change it |
| --- | --- | --- | --- |
| 1 | The design doc was uploaded as `Witch Hunt — Game Dev Doc.md` in the repo root, but the doc and the brief both refer to `docs/DESIGN.md`. | Moved (git mv, content unchanged) to `docs/DESIGN.md`. | n/a |
| 2 | How do the phases map onto a clock face? The HUD shows a clock, and the forecast says things like "runs dry around 2am", but no hours are given. | Day 07:00–19:00, dusk 19:00–20:00, night 20:00–06:00, dawn 06:00–07:00. Time moves faster at night (10 h in 6 min) than by day (12 h in 8 min). | `config.clock.phases[].startHour` |
| 3 | When does the day number go up, and where does a run start? | Day N is followed by night N; the counter goes up when a new day phase begins. (The opening has Tom wake at dawn; M9 can set `startPhase: 'dawn'`.) | `config.clock.startDay`, `startPhase` |
| 4 | Which controller combos open the debug tools? | **Changed in M1.** Overlay: hold **View + Menu**. Debug menu: hold **View + D-pad down** (was L3 + R3, which now sprint and crouch). The first button is a modifier: while View is held, Menu and D-pad down don't fire pause or radio. View itself still fires `inventory` on press; when the inventory screen is built, it should open on release so it doesn't flash open during a combo. | `config.input.combos` |
| 5 | Keyboard key for the debug menu? | **`** (backquote). | `config.input.keyBindings.debugMenu` |
| 6 | Keys 1–4 select a weapon slot directly, while Y/RB cycle. Should slots exist? | All four keys fire `switchWeapon` for now; direct slot selection is for M2 to decide. | `config.input.keyBindings.switchWeapon` |
| 7 | What should happen when the controller disconnects mid-game? | A toast and the active device switches to keyboard/mouse. No auto-pause, because there's no pause menu yet. Should it auto-pause once one exists? | `src/core/Game.js` (`input:gamepadDisconnected`) |
| 8 | What happens when the player leaves fullscreen (Android back gesture, Esc)? | The game suspends (clock and movement stop) and shows "Tap to resume", which re-enters fullscreen. | `config.display.resumeScreenOnFullscreenExit` |
| 9 | Should the debug menu pause the clock? | No. It only blocks movement while open. | `src/core/Game.js` `update()` |
| 10 | Starting look and dead-zone values for the controller. | Move dead zone 0.15, look dead zone 0.12, outer 0.05, look 180°/s horizontal and 120°/s vertical at full tilt, response curve exponent 2, trigger threshold 0.3. Aaron: "walking around feels good" in the M0 play-test. | `config.input.gamepad` |
| 11 | Should the screen be kept awake? (Not in the doc.) | Yes, with the Screen Wake Lock API, because controller-only play never touches the screen. | `config.display.keepScreenAwake` |
| 12 | The doc says "a new map seed each run" but not how to force one for testing. | Random seed each load; `?seed=` in the URL overrides it; `config.rng.defaultSeed` can pin it. | `config.rng` |
| 13 | **Resolved (M1).** Billboards for all trees, or 3D near and billboards far? | Aaron chose **billboards for every tree**. DESIGN.md updated ("Visual ambition" and the "Assets" table). | `src/render/Forest.js` |
