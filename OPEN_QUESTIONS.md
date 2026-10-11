# Open questions

Where `docs/DESIGN.md` was silent or unclear, the simplest option was chosen, made a config value where possible, and logged here for Aaron. Newest session first. Resolved items are kept, marked **Resolved**, for the record.

## Session 6b (M5 part 2, Gameplay Programmer)

Agreed with Aaron before building: **four vehicle types** (car, pickup truck, police car, army truck; special one-off vehicles may come with later scenes); **about 45 a map**; **about 60% with a battery**; pulling a battery is **just a noise**; **pulling the battery kills the alarm**; vehicles on the maps **if it doesn't crowd them**; the hold times as proposed; the debug battery stays. His M5 part 1 night-defence verdict: great gameplay, no fps drop, prices pretty balanced so far.

| # | Question | What M5 part 2 does now | Where to change it |
| --- | --- | --- | --- |
| 80 | Where exactly do vehicles go? | Verge cars every ~85 m along the pathways (85% chance each, 20% nosed into the trees); roadblock rows at roadside clearings (3-5) and checkpoints (2-3, mostly army); 2-3 at the gas station; 2-3 army trucks in a row at the outpost; one sure car at the campsite; elsewhere a 35% chance of one. 35-59 a map. | `data/vehicles.json` `placement`, `config.vehicles.placement` |
| 81 | What's in them? | Per type and spot (`loot` in `vehicles.json`): cars mostly scrap with a little of everything; pickups lots of scrap (4-9 in the bed) and shells; police cars pistol rounds, shells, vests, kits; army trucks rifle rounds, helmets, scrap. A search can turn up nothing ("Nothing useful"). Loot you can't carry is left on the ground. | `data/vehicles.json` |
| 82 | The campsite's car. | The campsite (every run, next to home) always has one car with a battery and no alarm: an easy first battery for the fence. | `placement.campsite` |
| 83 | Car alarms (not in DESIGN.md; Aaron: "pulling the battery would kill the alarm"). | 25% of vehicles with a battery have one. Opening the door or the boot sets it off: a two-tone wail, flashing lamps, and every zombie within 65 m comes, every 2 s, until the battery is pulled. Lifting the bonnet doesn't set it off, so you can pull a battery first to be safe (if you know). | `config.vehicles.alarmChance`, `alarm` |
| 84 | What if you don't stop an alarm? | After 60 s it runs the battery flat: the battery's gone ("The battery's flat: the alarm drained it"). Keeps the alarm urgent. | `config.vehicles.alarm.seconds` |
| 85 | How loud is pulling a battery? | A 22 m alert (the rifle is 70 m, the shotgun 55 m). | `config.vehicles.batteryNoise` |
| 86 | When does a vehicle show on the maps? | Once you've been within 40 m (not just revealed by the fog), as a small steel-blue oblong turned to its heading; grey once it's emptied (searched, bonnet up, no battery). | `config.vehicles.seenDistance`, `map` |
| 87 | Do vehicles block shots? | Yes: they're solid cover for you and the zombies alike, and the torch's glare dims on them up close. | `Vehicles.buildColliders()` |
| 88 | The turret's pad (Aaron: could it reach every panel?). | Moved to 3 m east, 17 m south of the fence's centre so the cabin no longer hides the east end; range 45 m. It rests facing the gate. | `config.station.layout.turretPad`, `config.station.turret` |

## Session 6 (M5 part 1, Gameplay Programmer)

Agreed with Aaron before building: **12 fence segments plus an automatic gate**; the turret comes from the **debug menu** until the Car Armory (M11); **barricades, spike traps and floodlights** go in now, as a way to spend spare scrap; runs start with the **east fence torn up, a little scrap and no charge**; **no carry limit and no slowdown** for batteries; prices are placeholders for the play-test; the **turret's rounds go through crowds even more than the rifle's** ("make a bit of a spectacle"); vehicles and battery pulling can be split into a second session.

| # | Question | What M5 does now | Where to change it |
| --- | --- | --- | --- |
| 66 | The compound's size and shape. | The fence is an arc of radius 28 m round a point 16 m south of the cliff, from the cliff on the west to the cliff on the east (about 235° of arc, 111 m of fence plus a 4.5 m gate due south). The cabin (12 x 8 m) stands in the middle, the tower 11 m east of the centre. **The home clearing grew from 38 to 42 m** so there's cleared ground outside the fence: every seed's map changes a little. | `config.station.layout`, `config.map.home.radius` |
| 67 | Health of each defence, and how hard zombies hit them. | Fence segment 200, gate 300, barricade 150, door 300 (600 reinforced). A swipe does the zombie's damage (10, a mutant's 30) × the level's `defenceDamage` (1-2). A level 1 citizen takes about 25 s alone to break a segment. | `config.station.fence`, `doors`, `siege.strikeScale` |
| 68 | How the electric fence "damages and slows". | Each swipe at a charged fence or gate zaps the zombie: 15 damage and a 0.9 s stun (the slow), at most once a second each, costing 1.5 charge. | `config.station.power` |
| 69 | Charge numbers. | A battery adds 100 (max 300). It drains 40 a night (spread over the night), plus 4 per floodlight, 1.5 per zap and 0.05 per turret shot. The fence's security is 20 at 100 charge or more. | `config.station.power`, `security.fenceCharge` |
| 70 | Security values the table doesn't give. | Each fence segment and the gate count as a wall segment (2 each, 26 for the lot); a plain door is 2, reinforced 5; electric charge up to 20. Turret, spikes (3) and floodlights (4) as in the table. A fresh run is about 25. | `config.station.security` |
| 71 | Prices. | Whole fence segment repair 12 scrap (part repairs pay their share), gate 16, door 15, barricade 15, reinforce a door 30, spike trap 20 (rebuild 10), floodlight 25. Runs start with 30 scrap. | `config.station.costs`, `config.inventory.startScrap` |
| 72 | What the buyable defences do. | **Barricade:** a second wall just inside a segment (150 health); zombies have to break both. **Spike trap:** outside a segment; 12 damage and a 0.8 s slow to each zombie on it, 15 bites before it wears out. **Floodlight:** on a pole on 4 fixed segments; at night, while there's charge, it lights a pool outside the fence (zombies in it are lit up) and adds 4 security. Fixed slots; no free placement. | `config.station.spikes`, `floodlight`, `layout.floodSegments` |
| 73 | Turret targeting and "spectacle". | It shoots zombies inside the fence first, then any clawing at the defences, then the nearest, within 42 m and in sight. Each round goes through up to 7 zombies keeping 90% each time (the rifle: 4 and 75%), with a heavy tracer, flash and report that brings zombies within 50 m. Turns at 200°/s. | `config.station.turret` |
| 74 | How the turret is loaded. | **Aaron (M5 test): from a menu.** Holding X at the turret opens its menu: load 1, 5 or all of each ammo type, with the turret rounds each gives; set the fire mode there too. | `config.station.turret.menuAmounts` |
| 75 | How the gate and doors open. | They open themselves when you're close (gate 3.5 m, doors 1.8 m) and close behind you. While open, zombies can get through, so don't hold the gate open with a horde outside. | `config.station.fence.gateOpenDistance`, `doors.openDistance` |
| 76 | The lookout tower. | Hold X at the ladder to climb (1 s): you're on the 9 m platform, the map is revealed for 260 m round it, and zombies below can't reach you. Hold X again to climb down. | `config.station.layout.tower` |
| 77 | What ends the run at home. | A zombie inside the comms room: "The station fell" (a placeholder; M7 builds the real defeat screen). The debug menu can turn this off. | `config.station.siege.overrun` |
| 79 | What do zombies at the station go for? | **Aaron (M5 test): whichever is nearest.** A chasing zombie goes for you or the defence between it and the family, whichever is nearer. Zombies that haven't noticed you go for the family (the comms room). | `EnemyManager.routeAtStation()` |
| 78 | Does the ledger pause the clock? | No (DESIGN.md). While it's open your controls go to the book; the world carries on. | `config.ledger.pausesClock` (stops the clock only; zombies still move) |

## Session 5 (M4, AI Programmer)

Agreed with Aaron before building: the placeholder 3D mutant; sigil grounds get only what matters for play now; a stand-in plants the sigils until the witch (M7); the loot plan (pistol ammo kept for the pistol, miners wait for the mineshaft); the map screen pauses the game (#39).

| # | Question | What M4 does now | Where to change it |
| --- | --- | --- | --- |
| 51 | How many zombies does a sigil raise, and how often? (DESIGN.md: "a spawn timer" and "a per-sigil cap".) | Every 18-36 s at night, up to 6 living zombies of its own, then it waits until one dies. A horde counts toward the 6 but can overshoot it. Sigils on sigil grounds raise every 11-22 s. Only at night (not dusk or dawn). | `config.sigils.spawnInterval`, `perSigilCap`, `groundSpawnMultiplier`, `spawnPhases` |
| 52 | How fast does the stand-in witch plant? | One sigil per dusk from night 2, up to five, so the level climbs by one a night unless you dig them up. Night 1 stays safe. M7 replaces this with the real witch. | `config.planter.perNight`, `firstNight` |
| 53 | Does a level change affect zombies already walking about? | Yes for speed (each zombie keeps its roll inside the level's range), damage and notice range: digging a sigil up slows the whole night down at once. Health is set when a zombie rises and stays. Hordes and mutants keep their own slow speeds at every level. | `src/ai/EnemyManager.js` `setLevel()` |
| 54 | Detection numbers. | Sight at night 13 m (standing, torch off), by day 38 m; torch ×2.3 at night; crouched ×0.45; sprinting ×1.2; in the brush ×0.75; behind a zombie ×0.55; once chasing, ×1.7. Footsteps heard at 6 m walking, 18 m sprinting, never crouched. Always noticed within 2.5 m. Each level multiplies all of it (×1 to ×1.4). | `config.detection` |
| 55 | Do trees block a zombie's view? | No: only the hills do (88,000 trunks are too many to ray-test cheaply). Standing in the brush counts as cover (×0.75). | `config.detection.undergrowth` |
| 56 | How far does gunfire carry? | Rifle 70 m, shotgun 55 m, shovel 4 m. Every zombie in range comes for you for 8 s (×the level's notice). | `config.weapons.*.noise`, `config.detection.gunfireMemory` |
| 57 | How are pickups collected? | Walk over them (no button), Doom-style. Armour is added on the spot; a full bar or a full kit bag (9) leaves the pickup lying for later. They vanish after 15 minutes. | `config.pickups` |
| 58 | Digging details. | 4 s of holding X within 2.2 m. Letting go pauses the dig; stepping away starts it over; taking damage loses the progress (DESIGN.md: "interrupts"). You can still look, move and shoot while digging. | `config.digging`, `src/player/Digging.js` |
| 59 | Dawn: how many zombies thin out? (DESIGN.md: "most ... a few stragglers".) | 85% sink back into the ground at random through the 60 s dawn, never within 25 m of you or while chasing you; 15% stay and wander the pathways by day. Stragglers can still notice you (sight is longer by day). | `config.zombies.dawn` |
| 60 | Mutant numbers. **Aaron (M4 test): felt like a bit of a bullet sponge. Decided: health stays; headshots on it do 4×, and a glowing red weak spot on its back does 8× (shots from behind, or a shovel swing from behind).** It also charges: 3 sprinting steps when it notices you, then 2 every 3 s while chasing (Aaron). Still open: should every zombie's headshot be 4× too (now 3×, #22)? | 300 health × level (360 at level 3: about 15 rifle body shots or 5 aimed headshots), 30 damage per swipe × level with a 0.9 s wind-up and 1.9 m reach, 0.36-0.48× sprint, 75% stagger and 80% knockback ignored. At most 4 at once. | `config.mutant` (`headshotMultiplier`, `weakSpot`) |
| 61 | How much tougher are police and army? | Police ×1.5 health (the vest), army ×1.6. Same speed and damage as citizens. | `config.zombies.variants` |
| 62 | Loot rates. | **Aaron (M4 test): far too much ammo; cut hard.** A kill now returns about 0.1 rifle rounds on average (army 20% for 1-2), so ammo runs down and looting matters. See `data/loot.json`: police drop a vest 35% of the time, army a helmet 35%. Citizens drop shotgun shells most often; DESIGN.md says "mostly ammo" without saying which. | `src/data/loot.json` |
| 63 | How fast do zombies wander? | 0.55× their own speed along the pathways; they speed up to full when they notice you, so a shambling zombie suddenly coming at you reads as "it's seen me". | `config.zombies.wander.pace` |
| 64 | Night 1 has no sigils. Is there a "level 0"? | No: with no sigils the level is 1 (stragglers and debug spawns use level 1 numbers), but nothing is raised. | `src/ai/zombieLevels.js` `levelForSigils()` |
| 65 | Where off-path sigils go. | 6-16 m off a pathway into the forest, at least 70 m from another sigil and 160 m from home. Their zombies use the nearest clearing's variant mix. | `config.planter` |

## Session 4 (M3, Lead Engineer)

| # | Question | What M3 does now | Where to change it |
| --- | --- | --- | --- |
| 35 | How big is the map? | **Decided with Aaron:** 1 km wide, 1.4 km north to south; after the M3 test: "a really good size map for the game". About 5 minutes' walk from home to the hut, 2 between neighbouring clearings. | `config.map.width`, `depth` |
| 36 | Off-path forest: slow or blocked? | **Decided with Aaron:** never blocked; the slowdown "feels appropriate" (M3 test), with more bushes to show it ("I like to give the option"). Undergrowth everywhere off the pathways slows you to 0.55× (walk 2.5 m/s, sprint 4.0). Zombies push through at 0.75× (my pick), so cutting through while chased costs you. | `config.player.undergrowthMultiplier`, `config.zombies.undergrowthMultiplier` |
| 37 | What's at the east, west and south edges? (The doc only describes the cliff.) | **Resolved (Aaron):** fine as plain forest. An invisible line 60 m inside dense forest; the forest carries on beyond it and the fog hides the rest. Could become a river, a ravine, a fence or more cliff. | `config.map.edgeMargin` |
| 38 | Flat or rolling ground? | **Decided with Aaron:** gentle rolling hills ("I would be thrilled"): about ±5 m, levelled in clearings, smoothed along pathways. | `config.terrain.octaves` |
| 39 | Does the map screen pause the game? | **Resolved (Aaron, M4): yes, it pauses the game.** Movement, firing, zombies and now the clock all stop while it's open. | `src/core/Game.js` `update()` |
| 40 | Minimap orientation. | Turns with you (the way you face is up) with an N marker on the rim; the full map is north up. | `src/ui/Minimap.js` |
| 41 | What do you see on the map? | Revealed terrain and pathways; a marker on every clearing whose centre you've seen; names on the full map (not for plain clearings); living zombies in revealed areas. Reveal radius 45 m. | `config.fogOfWar.revealRadius` |
| 42 | Encounter placement hints. | Not yet honoured: gas station "on a road edge" (there are no roads), mineshaft "hillside edge", stairs "off-path", Bigfoot cave "rocky clearing or path edge", crashed plane "off a pathway". Each sits anywhere in its band for now. The encounter sessions (M9-M11) can add rules. | `src/world/MapGenerator.js` `candidate()` |
| 43 | The outpost "2-3 paths from home". | A soft rule: if it lands elsewhere, it swaps places with a north clearing that is 2-3 pathways from home. If none fits, it stays and the map records a warning (none in 200 seeds tried). | `data/encounters.json` `hopsFromHome` |
| 44 | Plain clearings. | **Resolved (Aaron):** they stay empty ("the empty clearings almost add something to the game"). Home, the hut, the encounters (7-15 a run, about 12 typically) and sigil grounds (4-6) usually leave about 3 of the 22 clearings with nothing in them: they're plain clearings with just a type (bog, graveyard, etc.). Should they hold something (loot, a car, a trail camera)? | `data/encounters.json`, `config.map.clearingCount` |
| 45 | The hut "many edges away". | At least 4 pathways from home (5-11 in practice). | `config.map.hut.minHops` |
| 46 | Loops in the pathway graph. | Shortcuts are added (shortest first, 80% chance each) where walking round would be 1.8× longer; every north clearing is at most 2.5× its straight-line distance from home by pathway. | `config.map.edges` |
| 47 | Where does a run start? | Day 1 at 07:00, at home, facing south (Aaron). Supersedes #18's night start. M9 sets the real opening. | `config.clock.startPhase`, `World.spawn` |
| 48 | The Caller. | A radio event, not a place: rolled 0-2 per run and stored in `map.radioEvents` for M10. | `data/encounters.json` |
| 49 | Cliff height and look. | 26 m ± 8 m; trees on the plateau above for a skyline. The player can't see over it. | `config.map.cliff` |
| 50 | Clearing type look. | Types tint the map and name the signpost; their real look (bog fog, graveyard stones, cars) is for the encounter and style sessions. | `data/clearingTypes.json` |

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
| 34 | Do bullets go through zombies? | **Decided with Aaron:** yes, to carve through mobs. Rifle up to 4 zombies (75% damage kept after each), shotgun pellets 2 (50%). Not decided: whether the turret (M5) and pistol penetrate too; each weapon has its own `pierce`. | `config.weapons.*.pierce` |
| 33 | The overlay clock reads like minutes:seconds. | It's the in-game clock face (hours:minutes); one game minute at night is 0.6 real seconds, so it runs about 100× real time by design (#2). Aaron read "21:15" as a stopwatch. The final HUD (Session 19) shows "Night 1 · 21:15" in the top left, as DESIGN.md asks. | `config.clock.phases` |

## Session 2 (M1, Graphics Engineer)

| # | Question | What M1 does now | Where to change it |
| --- | --- | --- | --- |
| 14 | How bright should the flashlight be, and how dark the night? | Aaron's M1 play-test: the torch is great, but it glared back from close trees and rocks; now fixed with close-range dimming (`config.flashlight.glare`). Torch 300 cd with decay 1.6 over 45 m. Night ambient 1.1, moonlight 0.9. Tuned from screenshots on a software renderer; needs a look on the tablet. | `config.flashlight`, `config.sky.keys` |
| 15 | Should sprint be hold or toggle? | Controller: click L3 once and you sprint until you stop moving or run out of stamina (common console behaviour). Keyboard: hold Shift. | `src/player/Player.js` `updateStance()` |
| 16 | Should jump work while crouched? | Pressing jump while crouched stands you up instead of jumping. Sprinting also stands you up. | `src/player/Player.js` |
| 17 | Head bob: wanted, and how much? | A subtle 3.5 cm bob that scales with speed. Set `amplitude: 0` to turn it off. | `config.player.headBob` |
| 18 | Where should a run start on the clock? | **Changed in M3** (#47): runs start by day at home. M1 started at night so the torch test needed no skipping. M9 sets the real start (#3). | `config.clock.startPhase` |
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
