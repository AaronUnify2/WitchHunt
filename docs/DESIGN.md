# Witch Hunt — Game Dev Doc

Oct 9, 2026 · @Aaron · **Brought up to date with the build on Nov 7, 2026** (after Session 19 and the experimental vehicles) · **Mid-game and end-game story folded in Nov 8, 2026** (Aaron's workshop: [Witch Hunt — Mid-game story notes](https://claude.ai/artifact/JEPw823tjQJEn6Z3Vy7pHL)) · **Optional encounters folded in Nov 8** ([Milo's barn and more](https://claude.ai/artifact/VtxTRYZ716JQcK63NEmtJq))

## How to use this doc

This is the single source of truth for building **Witch Hunt**. It is written for a coding agent (Claude Code) and for Aaron, the designer.

- Every decision here is final unless it is listed in **Open questions** at the end, or marked *(proposed)* or *(open question)* where it appears.
- Every number is a **placeholder** that belongs in `config.js`, not in code.
- Build in the order given in **Build plan**. Do not build ahead.
- Where the doc is silent, pick the simplest option, make it a config value, and log it in `OPEN_QUESTIONS.md` in the repo.
- **Where things stand** (Nov 7, 2026): the next section, **State of the game**, says what's built, what's a stand-in and what's still only designed. Sections describe the game **as it plays now** where it's built; designs not yet built are marked **Designed, not built**. In the built encounters, **"As built" and "As it plays now" notes override the original design text** below them, which is kept (with its *(proposed)* marks) as the record of what was planned. The mid-game and end-game encounters (everything past the cordon) were redesigned with Aaron on Nov 8: see **Encounters: the story spine after the outpost**. Their sections now carry that design; the older designs they replace are noted as replaced, not kept in full. None of it is built yet.
- `STATUS.md` has the build's detail session by session; `OPEN_QUESTIONS.md` the calls made along the way; `PLAYTEST.md` Aaron's play-test rounds.

## Overview

A browser-based first-person survival shooter in three.js. Play as a park ranger in an Appalachian-style forest: scavenge by day, defend your ranger station by night, and hunt the witch whose buried sigils raise the dead. "Witch Hunt" is a working title.

**Win:** kill the witch. **Lose:** the player dies, or the station is overrun and enemies reach the family. Death is permanent and ends the run.

### Design pillars

1. **Every night is a choice.** Stay home and defend, or go out and stop the witch. The dusk forecast (security vs danger) makes the choice readable.
2. **The witch is an opponent, not a target.** She roams, plants, flees, fights back and lays traps.
3. **Exploring and defending feed each other.** Day loot builds defences; digging up sigils lowers the night's danger.
4. **Atmosphere over constant combat.** Not every place attacks you. Dread, quiet and the unexplained carry as much weight as fights.
5. **Cheap to run, big to explore.** Atmospheric lighting, fog and simulation level of detail keep a large living map looking good and running smoothly in a browser.

### Platform

- Desktop browser on a PC or a tablet (10" and up), played with an **Xbox controller** through the Gamepad API.
- Keyboard and mouse is a secondary scheme, mainly for development. No small-phone layout.
- **Target device:** a Samsung Galaxy Tab S10 FE 5G (SM-X526B, April 2025: Exynos 1580, Xclipse 540 GPU, 2304×1440 display at 90 Hz) in Android Chrome, with an Xbox controller over Bluetooth. Runs fullscreen in landscape (Fullscreen API; lock to landscape where supported). Hosted on **GitHub Pages**.

## State of the game (Nov 7, 2026)

A snapshot for redesigning the mid-game and end-game: what a run is today, what's built that new encounters can lean on, and what's still only on paper. Built through Session 19 (style pass 2) plus the experimental vehicles; 726 tests pass; live on GitHub Pages.

### A run today

1. **The menu** over a live CCTV feed of the station gate: Continue, New Run, Skip intro (once the opening's been seen on this device). Modifiers and Settings are greyed out.
2. **The opening** (Day 1, can't be failed): the Ground Zero cold open; Tom wakes in the comms room; the tower (the red light far south, the campsite's smoke); the campsite (the camcorder, the shotgun, the first wave, the first battery); home (patch the fence, fit the battery, Junie's talk).
3. **Night 1**, the first defence: 9 zombies in three overlapping waves at the fence; the rifle on the tower or the shotgun at the fence; camera six's clip of the witch planting at the Pruitts' storm shelter; a fade to dawn.
4. **Day 2 onward**, the rest of the opening cluster: the gas station (the forecourt pack, the first mutant, Earl's note, the scanner, the witch at the treeline, Earl's quad bike) → the storm shelter (12 dead and Earl holding the hatch, the sigil, Earl's keys, the room below, the diary and the tapes; a stop at home on the ride back) → the safe opens (the hunting rifle, empty; Ellen's call to adventure) → the military outpost (waves of army dead, helmets, the gun pit's rounds and machine gun, the generator and its floodlights, the barricade's peak, the compound's beetles, the Mothman's container C-7, the resin body, the armoury's charge, the field report and manifest, the dogfight through the scope from the watchtower) → the checkpoint opens.
5. **Past the cordon** the map is the seeded frontier, but **none of its encounters are built**: every frontier clearing is a placeholder signpost (or a sigil ground). What works out there is the system layer: sigils and their marches home, the witch roaming and planting from her hut, trail cameras, abandoned cars, pathway fights with her, and the hut and the final battle (with charges from the outpost's armoury or the debug menu).
6. **Every night** the witch plants (only inside the cluster until the cordon's crossed), sigils raise zombies that march on the station, and the station holds or falls whether Tom's home or away. Dawn autosaves.

### Built (and reusable for the mid and end game)

| Area | What's there |
| --- | --- |
| World | Seeded 22-clearing map (1 km × 1.4 km) with the fixed opening cluster, the road, the military cordon (blocks Tom only), story-flag gates, fog of war, minimap and map screen with objective stars |
| Station | Fence (12 panels and a gate), doors, comms room, barricades (outside the fence), spike traps, floodlights, the fence box and charge, the turret (debug-given), the ledger (plan of the compound, upgrades, security, forecast, monitors, papers), real and simulated nights, alarm, dawn autosave |
| Combat | Shovel, service rifle, shotgun, hunting rifle (scope, helmet-piercing), flare gun (lure, conk); pistol, SMG, heat-scope semi-auto and auto shotgun exist but only from the debug menu. Health, three armour bars, first aid. Explosive charges and the detonator. Exploding cars and gas pumps |
| Enemies with AI | Zombies (citizen, police, army with helmets, Men in Black, Earl), mutants (incl. the gas station's authored one), hordes and marches, giant beetles (crates, the shell and the face), the witch (roam, plant, fight, flee, traps, hexes, wounds), the outpost's machine gun |
| Models without AI yet | The grey alien (four cowboy-drift kit stages), the armed Men in Black. the Mothman (Session 24: worn by the flyer spike). **Not modelled:** Bigfoot, the miner zombie |
| Story systems | Dialogue from data (158 lines), radio with rate limits, face-to-face talk, subtitles with blips, trail cameras, cutscenes from data (69, every one in the debug menu) with camera looks, lore hand-ins (17 items) and the monitors, papers in close-up, tapes on D-pad down, story flags, objectives with breadcrumbs, the ESCAPE THE WITCH alert |
| Vehicles | Abandoned cars (search, bonnet, battery, alarms, wear, explosions); **Earl's quad bike**; three **experimental vehicles** in the debug menu (the ute with a turret, the alien quad, the forestry dozer) |
| Look | Style passes 1 and 2: ground blend, six tree kinds with solid trunks near, mist, fog nights, the grade, fireflies, beam dust, light shafts, the props kit (weathered, glare-capped meshes), dressed opening cluster, camera looks |
| Debug | Overlay, debug menu in categories (time, cutscenes, models, teleport, witch, hut and explosives, zombies, player, station and vehicles, experimental vehicles, story, flags and gates, first day, outpost, dialogue, run and save, display), model viewer |

### Stand-ins and gaps in what's built

- **The HUD is a placeholder:** no clock or zombie-level pips on screen, no pixel font, no controller glyphs (prompts name the button in text). **No pause menu, inventory screen, settings, save-and-quit, modifiers or achievements.** The Menu and View buttons do nothing in play.
- **Saving:** a dawn autosave only (and one after Skip intro). Zombies, pickups and the random streams aren't saved (OPEN_QUESTIONS #102).
- **Sigil grounds** work (planting, faster spawning) but look like a signpost and a ring of stakes; their set dressing, twists and tells aren't built. The cemetery is the one inside the cluster.
- **The witch's sighting lines** from trail cameras, the family's idle lines and most of the dialogue plan beyond the opening are unwritten.
- **Sounds** are all placeholder Web Audio synth; the audio pass (Session 50) is to come.
- **The crash sites** of the plane and the UFO are only marked by smoke columns after the dogfight; nothing is built at either.

### Designed, not built (the mid and end game)

Everything past the cordon. **Redesigned with Aaron on Nov 8** as one story spine (see Encounters: the story spine after the outpost):

- **The spine, in order:** the crashed plane (the quick-draw grey) → the Mothman at the crash site (Tom knocked out) → Junie taken by the Caller → the old church and the time capsule → the stairs in the woods (the place beyond; Junie brought home) → the military's dozer on the cordon strip → the bug-zapper night at the station → the Bigfoot cave (the Mothman killed, Bigfoot freed, the Blessing) → the quad gone and the mega night → the crashed UFO and the mothership (the big core, the alien quad) → the Car Armory, Sheriff and the ute → the garage and the killdozer → Ground Zero and the portal (the realm of stories) → the witchfire falls and the hut.
- **Optional seeded encounters** (Nov 8), each giving a killdozer part: the moonshiners' holler, the railway cutting, the sawmill, the mineshaft, Milo's barn designed; the Flatwoods landing, the National Guard convoy, the Men in Black listening post and the Headless Horseman bridge named only. The 1903 railway line on every map *(built, Session 21, with the road north and the cave's brush; the optional encounters are dealt and placed as placeholders)*.
- **The systems they need:** a fixed story spine on the map *(built, Session 21)*; the interior system *(built, Session 21)*; Men in Black and alien AI; the Mothman (two fights) and Bigfoot; the Caller as a voice only; the place beyond and the realm of stories (procedural); new zombie types (the Hollow, the Screamer, the Hanged); giant moths; the railroad spike maul, the chainsaw and its workbench, dynamite, the wire cutters; set-piece rides (the mineshaft's turret cart); the garage and Sheriff's upgrades; one power unit for the fence and the alien quad; the healing pool, the loadout and tool belt, ammo types on B, inspect cards for special items; the classified documents (outlined, unwritten); sigil grounds' dressing.
- **Late-game meta:** modifiers, achievements, the final HUD and menus.

## Core loop

The game runs on a repeating day/night cycle. Each night the witch plants more sigils, so pressure rises until the player kills her or is overrun.

1. **Day (explore).** Few enemies. Travel the pathways, loot, dig up sigils, follow the witch's trail, visit encounters.
2. **Dusk (decide).** The forecast shows the station's security against tonight's danger. Spend scrap on repairs and defences.
3. **Night (defend or hunt).** Sigils raise zombies. The witch roams and plants. Hold the station, or go out and interrupt her.
4. **Dawn (recover).** Enemies thin out. Damage carries over. Autosave. Repeat.

**Early-game shape:** for the first few nights the player can't safely leave, so it's explore by day, defend by night. Once security beats danger by a safe margin, night hunting opens up: the shift from survival to pursuit.

### Time

- Day/night length is config: 8 min day (07:00-19:00), 1 min dusk, 6 min night (20:00-06:00), 1 min dawn (about 16 min per cycle). Runs start at 07:00 on Day 1.
- The clock is meant to be always on the HUD. **As built:** not on the placeholder HUD yet (the final HUD, Session 49); the debug overlay shows it.
- The clock pauses while the map screen, a paper in close-up or a cutscene is up, and on Day 1 it holds at 17:00 until the opening's done (see Opening and first run).

### Run length and saving

- A run should feel like a long board game session, like a game of Monopoly: roughly 1.5–2.5 hours across about 6–10 nights. Tune the witch so a skilled player can corner her around night 6–8.
- **A longer run is accepted (Aaron, Nov 8):** with the new story spine, a run is **3–4 hours in by the time Sheriff is at the garage**, before the portal and the hut, so a full run is likely 4+ hours. Aaron accepts the longer run; save and quit moves forward to M10 so it's comfortable, and the target length is set once full runs are played (M18). The 1.5–2.5 hours above was the original aim. Between story beats, players keep scavenging, facing night hordes and exploring.
- **Permadeath:** one life per run, a new map seed each run.
- **Saving:** autosave at each dawn; save and quit from the pause menu. **As built (Session 20):** the dawn autosave (and one after Skip intro; *Session 23:* it waits for dawn's own story flags, `StoryProgress.settle()`, and a run continued at dawn replays them), and the **pause menu**: Menu / Esc (or losing the mouse lock on desktop) pauses the world and the clock; Resume, **Save and quit**, Settings (greyed). Save and quit saves the run and reloads to the main menu, where Continue picks it up with **Tom back at a safe point: home, in the cabin's main room** (Aaron: the run is short, so a safe point is good enough), the clock and everything else as they were. It's greyed during the opening (Day 1 and Night 1 are scripted and aren't saved) and after the hut's destroyed. No pausing during a cutscene, the ledger, the map or a paper. Save version 3: older saves are discarded. `ui/PauseMenu.js`; `Game.saveAndQuit()`; `config.station.safePoint`. One save slot per run, deleted when the run ends (win, death or overrun). **Destroying the hut also deletes it** (Aaron, Session 9): the final battle is a true point of no return, and nothing saves again that run.
- **The save stores** (as built: seed, clock, player, inventory and armour, the station, vehicles, sigils, the witch, story flags, heard lines and milestones, lore, the opening's encounters, Earl's quad, the outpost's state, and the experimental dozer's felled trees and cut trails; not yet zombies, pickups or the random streams). As designed: seed, clock and night number, player stats and inventory, armour bars, revealed map, station state (defences, damage, fence charge, turret ammo and mode), sigils, enemies, witch state and wounds, looted containers and vehicles, prizes secured, documents found, dialogue lines heard, Mothman attention, Men in Black state.
- **Persistent across runs** (stored with settings, never deleted): achievements, unlocked modifiers, Skip intro. **As built:** only Skip intro (whether the opening has been seen on this device).

## Player

The player is **Ranger Tom Hale**, a park ranger and a silent protagonist. First-person.

### Controls

| Xbox controller | Keyboard / mouse | Action |
| --- | --- | --- |
| Left stick | WASD | Move (riding: drive) |
| Right stick | Mouse | Look |
| L3 | Shift | Sprint (uses stamina; click L3 once to sprint until you stop) |
| R3 | C | Toggle crouch |
| A | Space | Jump; skips a cutscene; picks in menus and the ledger |
| RT | Left click | Attack / fire |
| LT | Right click | Aim down sights (the hunting rifle: the scope) |
| X (hold) | E (hold) | Interact: dig, search, take, build, repair, fit a battery, plant a charge, get on or off a vehicle, talk to the family |
| B | R | Reload (designed, Nov 8: tap to reload, hold to choose the ammo type, e.g. normal or alien shells) |
| RB / LB | 1–8 / scroll | Next / previous weapon (decided with Aaron in M2; LB instead of Y from M5; keys 5–8 for the Session 10b guns) |
| Y | F | Fire flare (Y from M5; was LB) |
| D-pad up | M | Full map |
| D-pad left | L | Toggle flashlight |
| D-pad right | H | Use a first aid kit (decided with Aaron in M2; designed, Nov 8: heal from the healing pool, the kit chosen automatically); riding, the vehicle's headlamp instead |
| D-pad down | V | Watch: play a tape or a feed that's waiting (Session 16, Aaron; was "radio home", never built). Designed, Nov 8: also watches a tape from its inspect card |
| View | Tab | Inventory (no screen yet) |
| Menu | Esc | Pause, save and quit (no pause menu yet) |
| View + D-pad down (hold) | ` | Debug menu |
| View + Menu (hold) | F3 | Debug overlay |

- Light aim assist (slowdown near targets), adjustable stick sensitivity and dead zones (config).
- **Headshots** do extra damage (config multiplier; Aaron in M2: ×2 at least, open to ×3–4; M2 uses ×3).
- Detonating planted charges: a remote, selected like a weapon (RB / LB) and fired with RT.
- Papers read in close-up (Earl's note, his diary, the field report, the manifest): D-pad / LB / RB turn pages, A goes on (and takes the paper on its last page), B puts it down.
- **On vehicles** the gun is slung: no firing, charges or digging from the saddle of Earl's quad. The experimental vehicles have their own controls (see Vehicles Tom drives).

### Movement, flashlight and stealth

- **Sprint** uses stamina. **Aiming and firing slow the player** (config, e.g. 0.6×), which matters against fast zombies.
- **Flashlight:** toggle, no battery to manage. Essential in the dark, but makes the player much easier to spot.
- **Crouch:** toggle. Slower (config, e.g. 0.5×), quieter, smaller silhouette.
- **One detection model for every enemy:** distance, line of sight, light level, flashlight on/off, crouching, and noise (sprinting, gunfire).
- **Crouched with the light off, the player is much harder to see:** zombies notice from much closer, Men in Black can be slipped past or quietly taken down, and the player can watch the witch plant without spooking her.
- **Hiding** (Aaron, M6): crouched, torch off and in the brush (just off the path counts), the player is seen from no further than about 6 m, day or night, at any zombie level. A zombie already chasing keeps its longer pursuit range. A stealth eye on the HUD shows it.
- **Trade-off:** dark and low is slow and hard to see by. Good for sneaking and ambushes, bad for running from a horde.

### Weapons

**As built (Sessions 15-16, Aaron):** Tom wakes **empty-handed**, with no first aid kits and no flares. The opening hands him his kit as he goes:

- **The shovel** leans by the cabin's front door (it can be taken once Night 1's clip has shown the witch burying something). Digging a sigil needs it.
- **The service rifle** waits at the top of the lookout tower (5 + 10 rounds), there from the first climb but taken on Night 1 (its beat).
- **The shotgun** is at the campsite (the green dome tent), with 8 shells.
- **The hunting rifle** is in Earl's gun safe (the gas station's stockroom), empty; its rounds are in the outpost's gun pit (10).
- **The flare gun** is always to hand on Y; flares are found (police car boots, sometimes an army zombie). Carry 3. **Changed (Nov 8, not built):** no flares in the opening at all; they join the drop tables only once the Mothman's been met at the crashed plane (see Flares).
- **First aid:** the comms room's first aid box holds 2 (once).
- **The pistol, SMG, heat-scope semi-auto and auto shotgun** are built (Session 10b) but only come from the debug menu until encounters give them (OPEN_QUESTIONS #143).
- Skip intro starts with the shovel, the service rifle, the shotgun, the box's 2 kits and the tutorial's scrap.

The original design, kept for reference: the player starts each run with the **shovel**, the **flare gun** (and a few flares) and the **ranger service rifle** with only a handful of rounds.
- Guns that fire the same rounds share one pool (Session 10b): the pistol and SMG, the pump and auto shotgun, the hunting rifle and the heat-scope rifle.

| Weapon | Role | Where it comes from | Damage (placeholder) |
| --- | --- | --- | --- |
| Shovel | Melee, digging, quiet takedowns | By the cabin door (as built) | 20 |
| Service rifle | Long range, good against the witch | The lookout tower (as built) | 25 per round |
| Shotgun | Close range, crowd control | Campsite (guaranteed, every run) | 8 pellets × 6 |
| Pistol | Reliable sidearm | The crashed plane: the pilot's pistol, taken off the grey alien that picked it up (Nov 8). Not built, debug only for now | 10 per round |
| Hunting rifle (scoped, bolt-action) | Kills with a headshot (Aaron); punches through a line of zombies and through army helmets. Its own rare rounds; the scope doubles as binoculars | The gas station's gun safe (in the stockroom), opened with the combination on Earl's keys (storm shelter); its rare rounds are in the military outpost's gun pit (Session 18; they were up the watchtower) | 50 per round (150 to the head) |
| Semi-auto rifle (heat scope) | The hunting rifle's rounds, 10 at a time; its scope shows the living white-hot | An encounter: Aaron is looking for a good spot (Nov 8). Debug only for now | 50 per round |
| SMG (MP5-style) | Full auto; fires pistol rounds | **Wherever there are dead Men in Black** (Aaron, Nov 8): the first such place in a run gives it, so the sawmill's dead agents can, and on the story spine the Car Armory always does. Debug only for now | 10 per round |
| Auto shotgun (AA-12-style) | Full auto, a 20-shell drum; fires shotgun shells | *Proposed (Nov 8):* the moonshiners' holler. Debug only for now | 8 pellets × 6 |
| Flare gun | Light; lures zombies; a direct hit conks | Always to hand (flares are found) | 18 on a hit |
| Railroad spike maul (melee) | A heavy sledge: slower than the shovel, hits much harder | The railway cutting (optional; Nov 8). Designed, not built | Config |
| Chainsaw (melee) | Shreds up close; no fuel. Loud (pulls every zombie nearby), slows Tom while it revs, overheats if held, and dulls (a sharpness gauge; sharpen at the station's workbench for scrap) | The sawmill (optional; Nov 8). Designed, not built | Config |
| Dynamite (thrown) | The first handheld throwable: small, unstable, short-fused crowd clearing. **Not a hut charge** | The railway cutting's powder store, the mineshaft (optional; Nov 8). Designed, not built | Config |
| Explosive charge | Remote-detonated blast | Built: the military outpost's armoury (one). Designed: the Car Armory's restocking crate (the mineshaft now gives dynamite instead; Nov 8). Debug menu | Config |

- **Alien shotgun shells:** 150% of a normal shell's damage, with a purple muzzle flash. From aliens; the first come off the crashed plane's grey. *(Built Session 20; debug menu only until the plane.)*
- **Ammo types** *(Aaron, Nov 8; built Session 20)*: **tap B to reload; hold B to choose the ammo** (normal or alien shells). The gun reloads with what's chosen, and the HUD shows the type (a purple shell for alien). The crashed plane's shells teach it.
  **As built:** past 0.35 s held, B swaps to the other type, **once per hold** (Aaron, round 31: no cycling), the prompt says what releasing loads, and the gun reloads with it on release. **Holding only does this with another type in the pack** (Aaron); otherwise B reloads on the press, as a gun with one type does. Out of the chosen type, a reload falls back to one that has rounds. A magazine holds one type: reloading with another first puts its rounds back in their pool. Both shotguns share the alien shell pool. Alien shells hit 1.5x and flash purple; the turret takes them at 7.2 rounds each (listed once Tom has some). Saved. Alien shells come from the debug menu until the crashed plane. `config.weapons.ammoTypes`, `altAmmo`; `WeaponState` (`chosen`, `loaded`); `Weapons.updateReload()`.

#### Loadout *(Aaron, Nov 8; built Session 20)*

- Tom carries **two long guns, a sidearm, one melee weapon and the flare gun**. The rest wait on a **gun rack in the comms room**.
- *(Proposed)* The ute has a gun locker in its tray, so loadouts can be swapped in the field without a trip home.
- Choosing a loadout fits "every night is a choice": the hunting rifle for the witch, or the auto shotgun to hold the fence.
- **Carrying isn't a real pressure.** No limits that force pointless trips home to drop things off.
- **As built (Session 20, Aaron's answers):** long guns are the service rifle, shotgun, hunting rifle, heat-scope rifle and auto shotgun; the sidearm is the pistol or the SMG. A gun found with its slot full **asks** *(Session 23, Aaron: the safe's hunting rifle went to the rack by itself every run, so the outpost's dogfight was skipped)*: take it and leave one of the guns in that slot (it goes to the rack), or send the new one to the rack (B); the world waits (`ui/GunChoice.js`). Its rounds still go to its ammo pool. **The rack shows its guns** *(Session 23, #343)*: placeholder shapes standing on its shelf against the pegs (`render/rackGuns.js`, `config.station.gunRack.show`). The rack hangs on the comms room's east wall: hold X there (or open the ledger) for the **Gun rack** page, to put a carried gun on the rack, take one into a free slot, or swap one for a carried gun of the same slot (it takes the same place in the RB / LB cycle and keeps its magazine). Saved. `player/loadout.js`; `config.weapons.loadout`. The rack shows no guns on it yet.

#### Tools vs weapons *(Aaron, Nov 8; the belt built Session 20)*

- *As built (Session 20):* the shovel is the melee weapon until it's swapped out; then it hangs on the belt and still digs (the dig always shows the shovel). Everything that needs it asks whether Tom owns it (`Weapons.has`), not whether it's in hand.
- **Tools go on a tool belt** (the shovel; the **wire cutters** from the moonshiners' holler, Nov 8, for disarming trip wires; later perhaps an axe or a crowbar). They come out automatically when you interact (dig a sigil and the shovel comes out) and never take a slot. They're keys to the world.
- **One melee slot for fighting.** It starts as the shovel and can be swapped for something better: the **railroad spike maul** (the railway cutting) or the **chainsaw** (the sawmill) (Nov 8).
- **No flamethrower for Tom** (Aaron, Nov 8: tedious in shooters); it's a killdozer part only. **No fuel anywhere in the game.**
- Damage values live in one weapon table in config; the turret's ammo conversion reads from it.

### The shovel and digging

- Main melee weapon: short range, no ammo, silent.
- **Hold interact** on a buried sigil to dig it up over a few seconds. Taking damage interrupts digging.
- The same action digs open the storm shelter hatch, digs up the time capsule, and buries the Bigfoot's Blessing.
- **As built:** a 2 s dig (Session 18) with a dig animation; a sigil being dug raises nothing. No digging on Night 1.

### Health, armour and healing

**Health:** 0–100. No natural regeneration. Death at 0 ends the run.

**Armour:** three separate bars, each 0–100 (up to 300 total). Armour is never an inventory item: pickups are consumed on the spot and added to their bar. Pickups stack within a type (two vests = 80 ballistic). Armour never regenerates.

| Armour | Colour | Comes from | Per pickup | Supply |
| --- | --- | --- | --- | --- |
| Ballistic | Grey-blue | Police zombies (vest), army zombies (helmet), Men in Black (body armour) | Vest +40, helmet +20, body armour +40 | Repeatable |
| Energy | Green-cyan | Aliens (alien shields) | +30 | Limited: the crashed plane's lone alien and the alien ship *(designed, not built)* |
| Nature | Mossy green | Bigfoot's gift | +40 | One-off *(designed, not built)* |

- **Damage order** (one config list): ballistic → energy → nature → health, so the commonest armour goes first.
- Energy and nature being limited is a starting position; revisit after play-testing.

**Healing:** first aid kits are kept in the inventory (the healing pool below, up to 270 points) and used from it or a quick-use button (D-pad right / H). No animation: the player keeps moving. Tom starts with none (the comms room's box has 2).

- **The healing pool** *(Aaron, Nov 8; built Session 20; replaces the kit count)*: one pool of healing points, whatever the kit (a first aid kit adds 30, an alien med kit 60). D-pad right heals from it, the kit chosen automatically (it won't waste an alien med kit on a small top-up). No menu; choosing gives the player nothing. The HUD shows one total, e.g. "Healing: 90". The 10-a-second cap stays.
  **As built (Session 20):** the pool is capped at **270** (Aaron). The kit used is the biggest that heals no more than what's still missing (after anything already healing), else the smallest carried. **Kits that don't fit go to the comms room's first aid box** (Aaron), wherever they're found; the box starts with 2, and holding X at it fills the pool. Alien med kits come from the debug menu until the crashed plane (Session 25). `player/healingPool.js`; `config.inventory.healing`.

- Health climbs one point at a time at **10 per second**: a **first aid kit heals 30** (3 s), an **alien med kit heals 60** (6 s).
- A second kit used while one is working queues rather than stacks, so the 10/sec cap holds and nobody can spam-heal out of a burst of damage.
- Healing stops at 100; leftovers are lost.

**The health floor** *(Session 20)*: a general switch a set piece holds (`Combat.setHealthFloor(owner, fraction, onHit)`): health can't drop below that share of full, and each hit it stops raises `player:floorHit` and the owner's `onHit` (the crash site's 10% and its blackout, Session 25). Day 1's can't-fail 20% uses it too. The debug menu (Player) can hold a 10% floor to try.

### Resources and inventory

- **Scrap:** the catch-all for building, repairing and upgrading.
- **Batteries:** power the electric fence and turret. Taken from vehicles and some encounters. (Aaron, M5: no carry limit and no slowdown for carrying them, for now.)
- **Explosive charges:** carry at most two. Take carry slots.
- **Flares:** carry at most 3 (config). Few sources: police car boots, army zombies (as built). **Changed (Nov 8, not built):** none in the opening; after the Mothman's been met at the crashed plane they join the general drop tables as random finds.
- **Ammo** per weapon type, **first aid kits**, **lore items** (documents, logbooks, the camcorder, the time capsule, Earl's note, diary and tapes, the field report, the manifest).
- Limited carry slots, so trips home matter. **As built:** no carry slots or inventory screen yet; ammo, kits, batteries, scrap and charges are counted on the HUD. **Changed (Nov 8):** carrying isn't a real pressure (see Loadout); guns beyond the loadout go on the comms room's rack.
- **Pickups** *(Aaron, Nov 8; inspect cards built Session 20)*: common pickups (ammo, scrap and so on) get a quick toast; the first of each in the opening is introduced, then a small toast as normal. **Special items** (tapes, papers, alien tech) get an **inspect card**: the item turning slowly, its name, a line about it, and the action on the card: **D-pad down** to watch a tape, **A** to read a paper, **B** to keep it for later. Watching becomes the player's choice rather than the game cutting away (fixing today's disjointed tape cutscenes); anything kept for later plays from the ledger's monitors.
  **As built (Session 20):** the card holds the world (like a paper). Tapes offer D-pad down (V) to watch, papers A (Enter) to read; B (Esc) keeps it for later. The opening's six go through it: the camcorder, Earl's note, his diary and tapes, the field report, the manifest. **Keeping a tape** leaves the D-pad down prompt waiting (Day 1's script waits for the camcorder), and handed in at the comms room it plays from the monitors; **keeping a paper** carries on the story as reading it would (the family's line, the flags), and it's read again from the ledger once handed in. The turning item is a CSS placeholder (a box in the item's shape and colours). Card text in `lore.json` (`card`; drafts). `ui/InspectCard.js`. The common pickups' first-time introductions aren't built yet.

### Vehicles and batteries

- Abandoned cars and trucks sit along pathways, in clearings and at encounters. **As built:** about 45 a map (the cluster's in the same places every run), four types (sedan, pickup, sheriff's car, M35 army truck), each worn differently; three fixed wrecks on the road, the bloody wreck on the trail to the campsite, the campers' car, the gas station's forecourt cars, the outpost's trucks. Searching is quick (1.25 s; the bonnet 0.75 s, the battery 1.5 s). Cars blow up (see Ideas for later: exploding cars, built).
- Searching the cabin and boot gives scrap and ammo.
- **Getting a battery is physical:** hold interact on the bonnet to lift it (animation and sound), then hold again to pull the battery. Never a menu loot.
- Each vehicle can be looted once per run.
- (Aaron, M5: four types to start, car, pickup truck, police car and army truck, with special one-off vehicles possible for later scenes; about 45 a map, about 60% with a battery. Pulling a battery is noisy, and some have an alarm that pulling the battery kills.)

### Vehicles Tom drives

**Earl's quad bike** (built, Session 15b; Aaron: "too much walking and running"): behind the gas station by the stockroom's back door; Wyatt points it out after the witch sighting.

- Hold X to get on (and, slowed right down, off). Left stick: gas, brake then reverse, steer (tighter slow). About 47 km/h on pathways, a third of that in the brush; trunks and walls stop it with a jolt; ridden into the dead at speed it knocks them down.
- **No shooting from the saddle** (the gun's slung). Its engine draws the dead every 1.5 s, and **the witch is 1.6x faster while Tom rides**.
- A headlamp (D-pad right), on by itself in the dark, dimmed up close like the torch. A witch's snare ridden over wraps round the front wheel: get off and tap X by it to free it.
- Shown on both maps (an orange icon) where it was left; saved. Tom is never saved riding.

**Where they come from in the story** *(Aaron, Nov 8; designed, not built)*:

- **The dozer** is the military's, the machine that cut the cordon strip, found parked where the clearing crew stopped. It gets a **grappling hook and winch**; it clears the brush at the Bigfoot cave and hooks the Mothman at the station. Late on, Sheriff rebuilds it as **the killdozer** for the portal (see Encounters: the endgame).
- **The alien quad** is Earl's quad: the greys steal it from where Tom parked it when he takes the dozer, and Tom finds it rebuilt in the mothership's hangar.
- **The ute** comes from the Car Armory's motor pool: Tom drives it out while Sheriff mans the turret, then mans the tray's gun himself (as built: Y climbs into the tray).
- **The garage:** the station gets a three-bay garage for the quad, the dozer and the ute, where Sheriff lives and works.
- **The alien quad's power:** driving is always free (fast travel is never taken away); power cells feed only the boost and the weapons. Run dry and the firepower is gone, not the speed. Cells are shared with the fence (see Power), so every cell is a choice: home or the quad.

**The experimental vehicles** (built after Session 19, **debug menu only**: "Experimental vehicles"; not in the story yet, but now designed into it, above; OPEN_QUESTIONS #321-339). Each rides on the quad's rules (hold X on and off, its headlamp, its noise, the witch faster while Tom's on it, a snare round a wheel) and has its own HUD.

- **The ute with a turret** (`world/Ute.js`): a right-hand-drive farm ute (bull bar, driving lights, snorkel, alloy tray) with a heavy machine gun behind a shield on a post in the tray. Driven from the cab: the view from the driver's seat (working gauges through five gears, the radio showing the game's time, a live rear-view mirror, his hands on the wheel), a handbrake that slides it round (A), a horn (B) that draws the dead. Ridden into the dead it throws them, with blood on the windscreen and the wipers clearing it. **Y climbs over into the tray** (it handbrakes to a stop) to man the gun: RT fires, LT steadies; a belt with no end that overheats; brass, tracers, a lamp on the gun. About 85 km/h.
- **The alien quad** (`world/AlienQuad.js`): Earl's quad as the greys rebuilt it: neon veins, glowing hubs, a holo ring of cells over the bars. **L3 / A boosts** for 3 s (about 108 km/h, the brush hardly holding it, the ram tripled; 7 s to refill). **RT fires plasma bolts** that home gently and burst with splash; **hold LT to charge an orb** and let go. A capacitor of 10 cells. Answers the "quad upgrades" idea below.
- **The forestry dozer** (`world/Dozer.js`, `world/LandClearing.js`): built as Earl's old crawler dozer (now the military's in the story). Tank steering (it pivots on the spot), about 19 km/h. **It changes the woods for the rest of the run:** the blade pushes trees over (the big ones strain first) leaving logs and stumps; the tracks crush the undergrowth; the blade, down (RT), cuts bare-earth trails that show on the map and are saved. The dead are shoved before the blade and crushed when pinned or under the tracks (blade up, LT); it's an open cab, so the dead climb on while it's slow. The blade shoves abandoned cars; **the winch** (B at a car or one of the dead) drags them. The loudest thing in the woods.

## Map

A dense forest stored as a graph: **clearings** are nodes, **pathways** are edges.

### Structure

- **North to south.** The player always starts on the northern edge; the witch's hut is always deep in the south. The run is a push south.
- **A fixed story spine** *(Aaron, Nov 8; **built, Session 21**: the whole spine fixed at once, Aaron's go-ahead)*: playing the opening showed that a fixed map is more enjoyable. The random seed stays, but the **main story encounters are fixed** (non-optional, always in the same place): they are the spine of the map. **Optional seeded encounters** fill the areas around it, and the witch roams, plants and hunts through those broader areas. **The witch never enters the main story encounters**, so boss fights never overlap.
  - **As built** (`src/data/storySpine.json`, `world/MapGenerator.js`): placed right after the opening cluster, at fixed spots (metres from home): the crashed plane (beat 1; just past the checkpoint, about 160 m south-west of the outpost's watchtower; the checkpoint's pathway runs straight to it), the clearing crew's dozer (beat 7; the east end of the cordon strip, on its south side: *which end is still open*), the old church and the time capsule (beat 4; west of the middle band), the stairs (beat 5; east of the middle band, off the pathways: one faint trail), the crashed UFO (beat 9; south-west), the Car Armory (beat 10; south-east), Ground Zero (beat 11; south, centre) and the hut (beat 12; deep in the south-west). Each has a fixed clearing type and its own vehicle rule. Bigfoot's cave (beat 7) is north of the cordon, so it's part of the opening cluster now (below). Until each is built its clearing has a signpost ("Story beat N: built in M1x"). The dogfight brings the plane and the UFO down at the same spots every run.
  - **The witch's routes avoid them** (`Witch.avoided()`): she only passes through a spine place, or the cave, when there's no other way (the crashed plane is the frontier's only way in from the checkpoint). She never plants in an encounter's clearing (as before).
- **Northern cliff.** A tall cliff runs along the north edge. Nothing comes from the north and the player can't go north.
- **The road north** *(Aaron, Nov 8; **built, Session 21**)*: the road past the gas station runs north as well as south. North it ends at a **ROAD CLOSED barrier** (nobody in or out) instead of an invisible wall. Just south of that barrier, near Earl's store, is **Bigfoot's cave**, its entrance hidden behind brush until the story calls for it. That's why Earl saw Bigfoot so often and opened the Home of Bigfoot shop there.
  - **As built** (`world/road.js` `buildBranch`, `world/roadNorth.js`, `world/RoadNorth.js`, `render/RoadNorthProps.js`; `openingCluster.json` `roadNorth`, `config.map.roadNorth`): it forks off the main road about 75 m west of the gas station and runs about 250 m north-north-west to the foot of the cliff, the same every run, its asphalt leaf-strewn (nobody's driven it since the army closed it), poles up its west side. A **fallen oak** lies across it near the fork until `day2`, like the gas station trail's (so Day 1 can't use it to get round). **The end** (Claude's call, Aaron: "your recommendation"): an old road tunnel into the cliff, the **Laurel Gap Tunnel (W.P.A. 1936)**, its bore fallen in a few metres back; in front of it the army's **ROAD CLOSED barrier** (striped barricades with ROAD CLOSED boards and amber lamps still blinking, jersey barriers, a stencilled NO ENTRY / QUARANTINE ZONE notice), which stops everyone. **The cave:** a spur of rock juts out of the cliff on the east side of the road, its south face about 15 m south of the barrier; the cave's mouth is in that face, packed with **brush** (bushes, briars, deadfall) that stops Tom ("too thick to push through... it would take a machine") but not the dozer: **driven into it, the dozer's blade tears it away**, the mouth shows (a black bore into the rock), the story flag **`caveFound`** is set and it's saved. Until then the map calls the place **Road's end** and it has no signpost. At the mouth: "A cave, going deep into the rock. It smells of wet fur." (the cave itself is M12's). Earl's hand-painted signs on the way up (**BIGFOOT XING**; **HOME OF BIGFOOT... WE BELIEVE!** for anyone coming out of the tunnel) and three huge prints in the soft ground by the brush.
- **30 clearings** (config; 22 until Session 21, when the fixed spine and the optional encounters needed room around them): home, the witch's hut, one per encounter and one per sigil ground, the rest plain clearings. The map is big on purpose: **1 km wide by 1.4 km north to south** (decided with Aaron in M3, to revisit after play-testing). Clearings and encounters are **data-driven**, so more can be added later without code changes.
- **The 1903 railway line** *(Aaron, Nov 8; **built, Session 21**: see As built below)*: part of the map on **every run**, like the road and the cordon. The railway that severed the forest in the time capsule's story runs the full width east to west, rusted and abandoned for a century, mostly a faint straight scar through regrown forest, lost at each edge in a collapsed tunnel. It marks the **soft border between the middle and the south band**: no fence and no lock, unlike the cordon, but a landmark that tells the player how far south they are without opening the map. South of it is more open and less structured; the structure comes from the main story. The railway cutting (an optional encounter) sits somewhere along it, by the seed, and other encounters spawn around it.
  - **As built** (`world/railway.js`, `render/Railway.js`, `world/GroundField.js`; `config.map.railway`): the same line every run, on the middle/south border (southness 0.7), in long straights and gentle curves. **The bed** is worn ballast, graded (the ground eased to a smooth grade along it: low cuttings through the rises, banks over the dips), only partly open: young trees (about one tree spot in eight) and brush (about one bush spot in two) have come back onto it, so it slows a little, and the gap in the canopy is the scar. **Rusted rails** on rotten ties, half sunk; whole stretches of rail buried or gone. **The old telegraph line** along its north side, poles leaning every way or down in the brush, glass insulators, a few spans of wire. **Crossings** (Aaron on whether the road crosses it: "have some fun"): the road never reaches the line (it ends at the checkpoint), but every pathway that crosses it gets a period crossing: planks between the rails, crossbucks (RAILROAD CROSSING), the old **LOOK OUT FOR THE CARS** board, and **W** (whistle) posts up and down the line. **At each edge** a cut-stone portal with **1903** in its keystone, set in a hill at the end of a short cutting, its bore fallen in. Every clearing keeps clear of the line (26 m beyond its radius) except the railway cutting, which sits on it. Drawn on the map as a railway. *Not done:* "south of it is more open and less structured": the forest is the same either side. **Aaron's pick (Session 21): a mix of burn country (an old wildfire scar: sparse, blackened snags, ash, new growth, open sight lines, low fog) and government ground (the programme's clearings: stumps in rows, survey stakes, straight access tracks between the Car Armory and Ground Zero).** To workshop and build in a later session (HANDOVER.md has the ideas).
- **Danger gradient.** Each clearing has a band (north, middle, south) and a 0–1 "southness" value that scales enemy strength, trap danger and how strange the encounters get. As built: north 0–0.40, middle 0.40–0.70, south 0.70–1 (Session 14 widened the north so the north frontier fits south of the cordon).
- **Pathways** are walkable corridors through thick forest. Off-path forest is full of undergrowth that slows the player (and, less, zombies), so movement mostly follows the graph. Decided with Aaron in M3: it never blocks, so cutting through is a choice with a cost.
- **Ground:** gentle rolling hills, levelled in clearings (decided with Aaron in M3).

### Generation

- Seeded: place clearings with minimum spacing, connect with a spanning tree, add extra edges for loops.
- **Fixed rules:** the home cluster (the station on the northern cliff, the campsite, storm shelter, gas station and military outpost, and since Session 21 the Bigfoot cave at the end of the road north) is placed first, identical every run (see Fixed opening cluster); then the **story spine** (Session 21), identical every run; the hut deep in the south, many edges away; each encounter in its band; nothing on the 1903 railway line but the railway cutting.
- Randomised per run: which optional encounters appear (**Session 21: 3 or 4 of the five designed, each equally likely**, `config.map.optional`) and where, sigil ground positions, plain clearings, clearing types for the seeded ones, every pathway past the cordon, loot, trail-camera positions.

### Fixed opening cluster (decided with Aaron, Oct 16)

**Fixed hub, random frontier.** The opening of every run is a hand-authored **home cluster** of five places that always spawn in the same fixed relationship, identical every run:

1. **The ranger station** (home)
2. **The abandoned campsite** (Day 1)
3. **The storm shelter** (the Night 1 sigil)
4. **The roadside gas station** (the guaranteed second outing)
5. **The overrun military outpost** (the gateway south)

Everything past the outpost is the seeded, randomised **frontier**, generated as above.

- **One engine.** The cluster is a fixed sub-graph the generator places first (same positions, paths and clearings every run) and then builds the rest of the map around. It is not a separate hand-built map, so it reuses all the generation, chunking and simulation tech.
- **Why.** It gives authored onboarding while keeping seeded replay value. The scripted early beats always land, in order, every run, and the opening is where all the tutorial teaching and starting equipment is packed: searching, the first battery, the shotgun, the first sigil, close quarters and the flashlight, the first mutant, the witch in the flesh, and a proper firefight.
- **The arc:** home and safety → the witch on tape (*she exists*) → the first sigil (*what she does*) → the witch in the flesh (*she's here, watching you*) → the overrun checkpoint (*nobody's coming*).
- **The rest of the north band** (barn, crashed plane, mineshaft) sits just past the outpost, in the frontier's northern edge: the **north frontier** (Session 11). *Changed Nov 8:* the crashed plane is fixed just past the checkpoint; the barn and mineshaft are now optional seeded encounters that can land in any band; the **Car Armory moves to the south band** (so the turret now arrives late), and the **Bigfoot cave moves into the home cluster's north**, by the gas station (see the road north above).
- **One road** (Session 11): the cluster has one authored road, past the gas station's forecourt and south to the checkpoint (the outpost's approach). It's the only road on the map for now; the M3 hint "the gas station on a road edge" (OPEN_QUESTIONS #42) comes true here. *Designed, Nov 8:* past the gas station it also runs **north**, to a ROAD CLOSED barrier, with Bigfoot's cave hidden just south of it (see Map: Structure).
- **Clearing types in the cluster** (Session 11): no checkpoint or roadside types inside it, so its sigils raise citizens and the first army zombie really is met on the outpost approach.

**Soft-gated path order (the classic soft funnel).** The world stays continuous: paths open and close; nothing teleports.

| Step | When (as built) | What opens | On the forced corridor? |
| --- | --- | --- | --- |
| 1 | Day 1, once Tom's been up the tower (the gate is chained until then) | Only the path to the abandoned campsite | Yes |
| 2 | Dawn 1 (flag `day2`) | The path to the gas station (a fallen oak across the trail until then): the player's guaranteed second outing | Yes |
| 3 | Once the gas station's witch sighting and Earl's note are both done (flag `shelterCall`; back-up: the first dawn after the gas station) | The way to the storm shelter on Pruitt land (a padlocked pipe gate) | No: a short spur inside the cluster, never forced, but needed for the safe's combination |
| 4 | The moment the safe opens and the hunting rifle is claimed (flags `rifleClaimed`, `outpostCall`), with Ellen's call to adventure | The path to the military outpost (chained gates on the road and the cemetery path) | Yes |
| 5 | Once the barricade's peak is down (flag `outpostCleared`) | The checkpoint opens; crossing it (`crossedCordon`) lets the frontier take over | Yes |

*Changed in play-testing (Session 15b, Aaron):* the shelter was step 2 (open from Night 1); it now waits until after the gas station ("Pruitt land stays shut until the gas station"), so the order is always campsite → gas station → storm shelter → outpost.

**The outpost is the genuine wall.** The M3 rule says off-path undergrowth only slows, never blocks. The home cluster is the deliberate, meaningful exception, and the block is the **military cordon** itself, not random terrain: the military sealed off the south, and the outpost's sandbag walls and checkpoint are the barrier. It's reinforced psychologically with signage, a checkpoint and the clear sense that Tom isn't supposed to go past. Tom's a ranger and this is nominally his forest, but the military have fenced off the south of it and won't say why. The player fights through the overrun checkpoint to open the south.

- The cordon runs east to west across the map's full width (chain-link and razor wire, sandbag-and-concrete near the checkpoint, edge to edge of the map), with the outpost's checkpoint as its only gate, so the player can't walk around it (agreed with Aaron, Session 14).
- The gates inside the cluster are lighter in-world blocks that clear through story beats (agreed, Session 14): a padlocked ranger pipe gate on the shelter spur, a fallen oak on the gas station trail, the outpost's chained gates. **They stay soft for now** (Aaron, Session 14): they block the path and their wings reach into the trees, but Tom can push round through the slow undergrowth. To revisit later in development.

**The cordon blocks Tom, not the dead** (Session 11). The cordon is a wall for the player only. The dead and the witch come through where it's torn: gaps pulled open from the far side, too low, too narrow or too tangled with wire for a man with a pack (a collider that blocks the player and nothing else). It's the story made visible: containment has already failed, and the things it held are getting out. So night marches from the frontier still reach the station, and the witch can reach the cluster.

**Before Tom crosses the barricade** (Session 11):
- **She plants only inside the cluster** (still preferring a sigil ground if there is one there). That's exactly what Ellen notices: sigils turning up outside containment. It also means every sigil she plants before the cordon opens is one Tom can reach and dig up.
- Once the barricade is crossed, her normal planting rules take over across the whole map.
- **One sigil ground is inside the cluster** (Aaron, Oct 17): one of the two north grounds is placed with the cluster, the same on every run. Her early sigils (nights 2-4 or so) usually go there, so the player learns its tells and can stake it out to ambush her mid-ritual close to home, before the frontier opens. The other north ground is in the north frontier.

**Call to adventure.** Ellen, who worked on the edge of the portal programme, knows what a quarantine zone means. When the witch's sigils turn up **outside** the military's containment zone, she realises containment has failed and sends Tom to the military checkpoint to report that the witch has escaped it. When Tom reaches the outpost, it's already overrun: the soldiers are dead, the containment has collapsed and nobody is coming. It's just Tom now. This is the big call to adventure and the point where the game lets go of the player's hand. It recasts the push south as Tom defying a failed cordon to find out what the military were hiding, which ties into Ground Zero and the portal backstory.

- **As built (Session 17, Aaron):** Ellen's call comes the moment the safe opens and the hunting rifle is in Tom's hands ("...and come home if it goes bad"). The outpost path opens with it.

**As built (M9.1, Session 14):**
- **The cluster is data** (`src/data/openingCluster.json`): the five places plus the family cemetery (the cluster's sigil ground), in metres from home, which sits on the cliff in the middle of the north edge. Its pathways make a loop (station, campsite, gas station, outpost, cemetery, shelter), so the dead and the witch reach the shelter side without walking through the station. Everything north of the cordon (the cliff, hills, trees, rocks, the cluster's pathways and cars) comes from a fixed seed, so the opening looks the same every run. The frontier joins it by one pathway, due south out of the outpost through the checkpoint. The north band runs to southness 0.40 (was 0.34) so the north frontier fits south of the cordon; the cluster's clearings are a "home woods" type (citizens, some police, no army).
- **The road** (`world/road.js`, `render/Road.js`): in from the dense forest at the west edge, past the gas station's forecourt (about 14 m south of its centre: the station building goes north of it, M9.3), through the outpost and the checkpoint. Worn asphalt, telephone poles, a ROAD CLOSED sign; three fixed wrecks (a sedan on the forecourt, the sheriff's car, a jackknifed M35).
- **The cordon** (`world/cordon.js`, `render/Cordon.js`): along the line 290 m south of home, just past the outpost. Whole panels stop everyone; the five torn gaps and the shut checkpoint gate stop only Tom (a `playerOnly` collider). Shots pass the wire.
- **The gates and story progress flags** (`src/data/progress.json`, `story/StoryProgress.js`, `world/Gates.js`): saved flags, each set by a trigger, all real since Sessions 15-17 (no stand-ins left). Gas station trail: `day2`. Shelter spur: `shelterCall`. The outpost's road and cemetery gates: `outpostCall` (the safe opening). The checkpoint: `outpostCleared` (the barricade's peak down). `crossedCordon` when Tom is south of the line. Lines and objectives can name the flags as conditions; the debug menu can toggle any of them.
- **The witch's cluster rule:** until `crossedCordon`, she plants only north of the cordon (config `witch.clusterPlantMargin`), still preferring a free sigil ground.
- **Camera six** (the Hales' Night 1 camera) is fixed at the storm shelter (#153); the five seeded trail cameras are all in the frontier.
- **Session 21 (M10.2): the road north and the Bigfoot cave join the cluster** (see Map: Structure, the road north): the road forks off west of the gas station to the old tunnel and the ROAD CLOSED barrier, a fallen oak across it until `day2`; the cave (a cluster clearing, "Road's end" on the map until `caveFound`) behind brush on the spur of rock just south of the barrier. **The storm shelter's room is an interior** (see Interiors), loaded as Tom climbs down.
- **A want planted here** (Session 21): Earl's signs on the road north (BIGFOOT XING) and the huge prints by the brush, guaranteed every run; the payoff, the cave, comes with the story (M12).

**Plant wants here, pay them off out there.** The home cluster is where the game reliably seeds threads that pay off later. The authored zone hands the player their reasons to explore the unauthored zone.

- **The campsite** plants the witch on tape.
- **The gas station** plants the hunting rifle chain: the safe, and the owner's note pointing to the storm shelter.
- Future threads planted in the cluster should follow the same rule: the want is guaranteed every run; the payoff lives out in the frontier. (The hunting rifle chain is the exception: it completes inside the opening, so it always resolves.)

**The hunting rifle chain always completes (resolved Oct 16).** All three links are in the authored opening, so every seed has them: the gas station (the safe and the note) → the storm shelter (the combination on Earl's keys, where he falls) → the outpost's gun pit (the rounds; Session 18 moved them from the watchtower).

**The storm shelter is a spur, never forced (Aaron, Oct 17).** It's reachable from Night 1 and the game never forces *when* it's done, but it is **required** before the outpost: the outpost path needs the hunting rifle, which needs the shelter's combination.

### Clearing types

Each clearing has a type that sets its look and its zombie variant mix (sigils planted there spawn that mix).

| Type | Feel | More common variant |
| --- | --- | --- |
| Bog | Low fog, soft ground | Citizens |
| Graveyard | Old stones, mounds | Citizens |
| Roadside | Abandoned cars, roadblock | Police |
| Checkpoint | Sandbags, wrecked jeeps | Army |
| Standing stones | Open, ritual feel | Even mix |
| Home woods (as built; never rolled at random) | The opening cluster's own clearings | Citizens, some police, no army |

As built, clearing types tint the map, name the placeholder signpost and set the variant mix; their own looks (bog fog, graveyard stones, the checkpoint's jeeps) aren't built.

### The map screen and fog of war

- A round minimap on the HUD (it turns with the player, with a north marker) and a full-screen map (D-pad up), north up. Opening the full-screen map pauses the game, clock included (Aaron, M4).
- The map starts hidden. Areas are revealed only by visiting them (reveal radius), or from the station's lookout tower.
- Revealed areas show live enemy positions, including enemies in the abstract simulation tier. Unrevealed areas show nothing, even if the witch is there.
- Seen things are marked: home, sigils, vehicles, encounters, traps, trail cameras, the hut.
- Implementation: a low-res reveal texture over the map graph.
- **As built:** the minimap and the map screen (placeholder looks) show the revealed terrain, clearings and their names, pathways, the known sigils, seen vehicles (dimmed once emptied), trail cameras (blue; red and blinking after a sighting), Earl's quad (orange), and the current **objective** (a gold star, several at once when a step has several places, sitting on the minimap's rim when off it; "NEXT: ..." on the map screen). Trails cut by the experimental dozer are drawn in.

## The ranger station (home)

The player's home and base, set against the northern cliff. The family live here.

### Layout

- **Fence:** a chain-link electric fence runs in a semicircle from cliff to cliff. The cliff closes the north side, so the fence is the only way in.
- **Cleared ground** inside and outside the fence gives the turret and the player clear lines of fire.
- **Station cabin** in the centre, with the **fire lookout tower** beside it. Climbing the tower reveals the map within a large radius (config).
- **Comms room:** a fortified room inside the station with the radio, the CCTV monitors and the ledger. The family shelter here every night.
- **Three layers of defence:** fence → station front door → comms room door. Each has its own health and is repaired and upgraded with scrap.
- **As built (Sessions 15-18):** the comms room's **first aid box** (2 kits, once), the **shovel** by the cabin's front door, the **service rifle** at the top of the tower. On Day 1 the gate is chained until Tom's been up the tower. **Barricades stand outside the fence** (Session 18): the dead get through them first, and the fence zaps through a barricade.
- **Decided with Aaron in M5:** the fence is **12 segments plus a gate** due south that opens itself for the player. Runs start with the **east fence torn up, a little scrap and no charge**. Spare scrap goes on **barricades** (an outer wall in front of a segment, outside the fence: Session 18, Aaron, so the dead have to get through it before they can pull the fence down), **spike traps** (outside a segment) and **floodlights** (four fixed poles), all at fixed slots.

### The ledger

A ledger book on the comms room desk is the one place to manage the whole station.

- Repair the fence and doors, buy and place defences, install the turret, fit batteries, load turret ammo, set the turret's fire mode, see the security breakdown.
- Paid for with scrap; deposits come straight from the inventory.
- Everything can also be done directly in the world (hold interact on the fence, the turret, the fence box).
- A full-screen book with pixel-font pages and tabs (Fence, Doors, Turret, Power, Upgrades), controller-driven. Doesn't pause the clock (config).
- **Reworked (Aaron, Session 15b):** tabs **Fence, Turret 🔒, Upgrades, Security**, then the forecast and the monitors. Doors and Power are folded into the Fence tab.
  - **Fence:** "Repair the whole fence and gate" on its own at the top (the default). Under it, a **plan of the compound** (`base/fencePlan.js`) to tap, or D-pad round and press A: the fence's panels and the gate (the outer ring: repair), the barricade slots (the inner ring: build or repair), the cabin's two doors (repair, then reinforce) and the fence box (fit a battery). Coloured by state: sound, hurt, down, not built.
  - **Turret:** padlocked until the turret's found; then the turret page as before.
  - **Upgrades:** the floodlights all in one go (100 scrap: 4 × 25); spike traps a side at a time: west 60, south-west 40, south 40, south-east 40, east 60 (20 a trap, as before). A worn side rebuilds for its traps' rebuild cost.
  - Tap a tab, a row or a part of the plan to do it; × closes. The D-pad walks a ring left and right (the fence and gate, the barricades, the doors and fence box), up steps inward (then to the rows above), down steps out. LB / RB turn the page (Q / R, Page Up / Down on a keyboard); the mouse is freed while the book is open.

### Security rating

The sum of every defence's current value (each scales with its remaining health). Values are placeholders.

| Defence | Value |
| --- | --- |
| Wall segment / barricade | 2 each |
| Reinforced door | 5 |
| Spike trap | 3 |
| Floodlight | 4 |
| Electric fence | Scales with charge |
| Automated turret | 5 / 10 / 20 by fire mode × ammo coverage; 0 if unpowered |
| Bigfoot's Blessing | +20, permanent (Tom buries it himself; it also restores the family's comms in the south) |

### Electric fence and power

- Damages and slows enemies that touch it. Its security contribution scales with its stored charge.
- Fitting a battery at the fence box adds charge. Charge drains every night (a fixed amount plus a little per enemy hit), so batteries must keep coming in.
- The fence needs scrap to build and repair; batteries only power it. At zero charge it's just a weak barrier.
- The turret draws from the same charge.
- The **alien power core** adds a huge charge and drains far slower.

**Power: one unit for everything** *(Aaron, Nov 8; the unit built Session 20)*

- **A car battery = 100.** The fence starts with a **capacity of 300**. The alien quad holds **1000** (10 car batteries fill it).
- **The crashed plane's small alien power cell** raises the fence's capacity to **1000** and puts 500 in; batteries top up the rest. Ellen's line once it's in (wording to polish): the cell supercharged the fence; she can't believe one alien was carrying it around, so their ships must run on something far bigger. It plants the alien ship.
- **Why:** collecting batteries is the early game's job. The upgrade lifts that chore just as the frontier pulls Tom away from home, and zombie numbers can rise without endangering the base.
- **The big core:** after the mega night (see Encounters), Ellen says they won't survive another like it and sends Tom for the alien ship's big core: the reason the station needs much more power. *(Proposed: the comms room's big radio could reach the outside world, given enough power.)*
- Cells are shared between the fence and the alien quad.
- **As built (Session 20):** the fence's store has a saved **capacity** (300 at the start); the plane's cell (`config.station.power.cells.planeCell`; the debug menu until Session 25) raises it to 1000 and puts 500 in. The alien quad has its own store of **1000** in the same units, full when it's brought: **driving is free**; refilling the plasma capacitor costs 10 a cell and the boost 20 a second (an empty store ends a boost and stops the refill). A battery fits at the quad's back (hold X). `base/powerUnit.js`; `config.alienQuad.power`.

### The workbench *(Aaron, Nov 8; designed, not built)*

- A workbench at the station, **there from the start**. Tom sharpens the chainsaw (from the sawmill) there for a little scrap. *(Proposed: it could also be where Sheriff's upgrades are bought before he arrives, or be folded into the garage; open.)*

### The garage *(Aaron, Nov 8; designed, not built)*

- A **three-bay garage** at the station for the vehicles: the quad, the dozer and the ute.
- **Sheriff**, the friendly grey from the Car Armory, lives there as an alien mechanic who loves human machines and works alien technology into them. He **upgrades guns, ammo and vehicles** (including the quad upgrades, like the spiked ram), and builds the **killdozer**. Scrap has gone into the compound all game; late in the game it goes into the weapons.
- Open: the upgrade list and costs.

### The automated turret

One per run, from the Car Armory (now a late, south-band beat: Nov 8, so the turret arrives late; accepted, since the mid-game has plenty in it). **As built:** the turret itself works (installed on its pad, powered by the fence, loaded by hand, three fire modes, the forecast's run-dry warning), but it comes from the debug menu until the Car Armory exists; the ledger's Turret tab is padlocked until then.

- **Power:** wired into the fence's charge. Unpowered = offline, whatever ammo it holds.
- **Aaron, M5:** its rounds carve through a crowd even more than the rifle's: make a spectacle of it. Until the Car Armory exists (M14) the debug menu gives it.
- **Ammo:** loaded by hand (at the turret or the ledger). Any ammo converts to turret rounds **by damage**: turret rounds gained = rounds deposited × (that ammo's damage ÷ turret round damage).

| Ammo | Damage per round | Turret rounds per round (turret round = 10) |
| --- | --- | --- |
| Pistol | 10 | 1 |
| Rifle | 25 | 2.5 |
| Shotgun shell | 48 | 4.8 |
| Alien shotgun shell | 72 | 7.2 |

- **Fire modes:**

| Mode | Seconds per shot | Rounds per 6-min night | Security while firing |
| --- | --- | --- | --- |
| Slow | 3 | 120 | 5 |
| Medium | 1.5 | 240 | 10 |
| Fast | 0.5 | 720 | 20 |

- **Ammo coverage** = rounds loaded ÷ rounds needed for the night (capped at 1). **Turret security** = mode value × coverage. Half a night's ammo on fast scores 10 but falls silent halfway.
- The dusk forecast warns when it will run dry ("Turret runs dry around 2am").
- Player at home: it really fires, only when it has a target. Player away: the coverage formula is used.
- Fractional rounds are kept internally; the HUD shows whole numbers.

### Danger rating, forecast and simulated nights

- **Danger** = sum over active sigils (and the sigils she's out to plant tonight) of each one's marchers × the share that reaches home before dawn × a per-zombie weight. The level counts through the marchers, their pace and their damage, not as a second multiplier (recalibrated with Aaron, M6, so the forecast matches what happens).
- **Dusk forecast:** security vs danger, with a breakdown of both.
- **Player at home:** the night plays out for real.
- **Player away:** the night is resolved by simulation using the margin:

| Margin (security − danger) | Result while the player is away |
| --- | --- |
| +20 or more | Clean night, minimal damage |
| 0 to +19 | Holds, takes damage |
| −1 to −10 | May fall (chance-based) |
| Below −10 | Likely overrun |

- Damage carries over until repaired. Turret ammo and fence charge are consumed.
- **Alarm:** below 50% security during a night, a radio alarm plus a HUD banner with the direction home.
- **Lose:** enemies break the fence, then the station door, then the comms room door and reach the family.

## Sigils

Buried sigils are the source of every zombie. The witch plants them; the player digs them up.

- Each sigil has a position and a spawn timer. At night it raises zombies around itself, up to a per-sigil cap.
- **Five-sigil cap:** at most five active at once. She replants on later nights when one is dug up.
- **Zombie level = number of active sigils** (1–5), map-wide. Digging one up lowers the level immediately: the player's main lever on difficulty.
- Sigils show as a faint glow and disturbed earth, easier to spot at night.
- **As built:** all of the above. A sigil the family have seen go in is `known` (on the map); the Night 1 sigil `hold`s its dead near it rather than marching them. While one is being dug it raises nothing. Digging needs the shovel.
- **Lore:** the sigils were originally the land's own protective warding marks. The witch has corrupted them into spawn points, so digging one up is cleansing the land.

### Sigil grounds

Five eerie clearings per run (config): two in the north band, two in the middle, one in the south (Aaron, M6, so sigils and their marches come from all over the map). The witch favours them for planting.

- **She prefers them:** most plantings (config, e.g. 60%) go to empty sigil grounds. A player who knows them can stake one out and ambush her.
- **Tells:** in the days before she uses one, crows gather, earth is turned, candles appear. Junie often notices.
- **Sigils planted there spawn faster** (config).
- A ground can be reused after its sigil is dug up.
- **Design rule: sigil grounds never attack the player.** No guardians, no monsters of their own. The tension is atmosphere and the chance of meeting the witch. (Their sigils still raise zombies at night like any sigil; by day they are empty.)

| Ground | Look | Atmosphere when a sigil is there |
| --- | --- | --- |
| Scarecrow field | Tilled furrows, a ragged scarecrow on a post | The sigil is at its feet. It never moves while watched, but its head is turned toward the player whenever they look back, and it may stand in a different furrow on the next visit |
| Family cemetery | A tiny fenced plot of leaning headstones | Several graves lie open, dug from the inside. The sigil is in the one still closed |
| Stick-figure grove | Blair Witch–style stick figures hanging from the branches | They clatter and turn in a wind the player can't feel. More hang there each visit |
| Hanging oak | A huge dead oak hung with charms, bones and rope | The witch lingers here longest when planting: the best ambush spot. Ropes sway when nothing moves |
| Abandoned circus | A faded big top, rusted rides, sideshow booths | The sigil is in the sawdust ring. Powered sideshows (fortune-teller, laughing clown head, jack-in-the-box game) lurch to life as the player passes. Jump scares only |

More grounds = a look, set dressing and one atmospheric twist.

**As built:** the grounds are placed (one, the family cemetery, inside the opening cluster on every run) and the witch prefers them, but each is still a placeholder signpost and a ring of stakes. Their set dressing, twists and tells (crows, turned earth, candles) are **designed, not built**.

## Enemies

### Roster

| Enemy | Where | Render | Behaviour | Status |
| --- | --- | --- | --- | --- |
| Zombie (citizen, police, army, Men in Black; Earl Pruitt; designed: miners, moonshiners) | Forest, from sigils | Doom-style billboard sprite, 8 angles (5 stored, 3 mirrored); a palette swap gives each zombie its own hair, clothes, sleeves and blood (Session 13) | The main enemy. Levels 1–5 | Built |
| Mutant zombie | Forest, level 3+; the gas station's authored first mutant | 3D | Giant, mutated, much more health. A mini-boss in the horde | Built |
| Giant beetle | The military outpost's crates (built); mineshaft, Bigfoot cave's egg tunnels (designed) | 3D | Armoured shell (30% damage); the soft spot on its face takes 3x. Emerge, threat display, charge, rear and snap | Built (Session 17) |
| The Mothman | The crashed plane (first meeting), the station (the bug-zapper night), Bigfoot cave (killed); the forest if flares are spammed | 3D | Flying dive attacks, disorienting screech, calls beetles | Model built (Session 24), worn by the flyer spike; encounters not built (flares are counted) |
| Giant moths | The mineshaft (first met), the Mothman's lair in the Bigfoot cave | 3D | Flying; the Mothman's kin. Behaviour to design | Designed (Nov 8), not built |
| New zombie types: the Hollow, the Screamer, the Hanged | Debut on the mega night, then the normal mix | Sprite or 3D (open) | Each with a job, Left 4 Dead style (see Zombies) | Designed (placeholders), not built |
| The Caller | Wherever the forest is severed; the radio in the south | None: a voice only | Imitates the family's voices; can't be shot | Designed, not built |
| Men in Black | The Car Armory (as zombies, and a few barricaded survivors), Ground Zero | 3D: the cutscenes' Man in Black with a pistol (most), an SMG or a sniper rifle (Session 13) | Armed agents using cover; stealth-aware squads | Model and poses built; no AI |
| Alien | The mothership; one at the crashed plane | 3D: the grey alien with its four cowboy-drift kit stages (Session 13) | Hides behind cover, ambushes up close | Model and poses built; no AI |
| The witch | Forest and hut | 3D | See The witch | Built |
| The outpost's machine gun | The military outpost's gun pit | 3D | Not an enemy: Tom's. Dead until a battery's fitted, then fires 25 rounds at the nearest dead, overheats and blows up | Built (Session 17) |

**Friendly:** Bigfoot (can't be harmed; designed, not built, no model); **Sheriff**, the friendly grey (designed, not built); **Milo**, who never attacks Tom and can't be hurt (designed, not built). Harmless: the animals in Milo's barn, the staring donkey (designed, not built).

### Enemy targeting

Every few seconds each enemy picks a goal:

1. Player detected (see detection model) or closer than the station → go for the player.
2. Else station within its base radius → attack the defences.
3. Else → random walk along the pathway graph.

- **Night marches** (Aaron, M6): about two thirds of each night's zombies rise as marching groups (4 at level 1 up to 10 at level 5; a horde always marches) and set off for the station along the pathways at once, faster while out of sight so far sigils still arrive before dawn. Meeting them on the pathways protects the base. A cap per sigil per night keeps the totals in check.
- **Revisits** (Aaron, M6, night only): come back at night to an encounter you've already been inside and a few zombies of its mix have turned up there, once per clearing per night.
- **At the station**, a chasing zombie goes for whichever is nearer, the player or the defence between it and the family (Aaron, M5).

### Zombies

The witch raises only zombies. Speeds are multiples of the player's full sprint (1.0×).

| Level | What's new | Single-zombie speed | Horde chance | Mutant chance |
| --- | --- | --- | --- | --- |
| 1 | Slow singles, mixed variants | 0.35–0.45× | 0% | 0% |
| 2 | Hordes appear | 0.35–0.55× | 10% | 0% |
| 3 | Mutants appear | 0.4–0.7× | 10% | 5% |
| 4 | More hordes and mutants | 0.45–0.95× | 20% | 10% |
| 5 | True fast zombies | 0.5–1.3× | 30% | 15% |

- **Speed variance:** each single zombie rolls its speed on spawn, skewed toward the slow end. At level 1 one zombie leads the pack; by level 5 a few outrun the player, who must turn and shoot (and slow down) while the pack closes in.
- **Hordes:** one spawn of 7–15 slow zombies (0.35–0.5×) in a tight cluster.
- **Mutants (3D):** far more health, heavy hits, better loot.
- **Exception:** the gas station's authored first mutant appears whatever the zombie level, with its own tuned stats (see Roadside gas station).
- Higher levels also mean more health and damage, wider notice range and harder hits on defences.

**New zombie types** *(Aaron, Nov 8; placeholders to design in detail later; designed, not built)*. They debut on the **mega night** after Bigfoot is freed, then join the normal mix, Left 4 Dead style, each with a job:

| Type | Job |
| --- | --- |
| The Hollow | Huge and slow; charges and tears whole fence panels down |
| The Screamer | Hangs back and shrieks, calling more zombies and speeding them up; hunt it first |
| The Hanged | Drops from the trees and pins Tom until it's shot off (Wyatt on the tower can save him) |

- **Cut:** the Burrower (it would come up inside the fence, and the fence shouldn't be compromised that easily).
- **From the mega night on, the difficulty rises:** more mutants, more hordes and the new types, so upgrading the fence really matters for the family's safety.

| Variant | Look | Drops |
| --- | --- | --- |
| Citizen | Everyday clothes | Mostly ammo, sometimes scrap, rarely first aid |
| Police | Uniform and bulletproof vest; tougher | Vest (+40 ballistic), pistol ammo |
| Army | Fatigues and helmet; tougher. The helmet blocks the headshot bonus, so they eat extra bullets. It comes off with enough damage, or a powerful enough round (the hunting rifle) punches straight through it; once the helmet is gone, headshots land normally (Aaron, Oct 16). First met on the military outpost approach | Helmet (+20 ballistic), rifle ammo (the main rifle ammo source) |
| Men in Black | A dead agent: torn black suit over a white shirt, tie, sunglasses, body armour; as tough as the army (Session 13). Found where the agents fell (the government base, Ground Zero) | Body armour (+40 ballistic, the vest pickup), pistol ammo |
| Miner (mineshaft only; designed, not built) | Helmet and headlamp | Scrap, lamp batteries |
| Moonshiner (the holler only; designed, not built) | The turned family who ran the still | Open |
| Earl Pruitt (the storm shelter only; built, Session 13) | One fixed look: a faded red trucker cap, grey stubble, a tan work shirt, jeans | His keys (the safe's combination) |

**Daytime:** most zombies thin out at dawn; a few stragglers wander the pathways by day. An encounter's own dead (`authored`: the gas station's pack and mutant, the storm shelter's horde, the outpost's soldiers) don't sink at dawn.

### Men in Black

*Designed, not built (the model and its poses are; the AI is M14's).*

- Government agents guarding the base and covering up the disaster.
- **Detection states:** unaware until the player is in their sight in light, or makes loud noise (gunfire). Then the whole squad goes alert. Killing an unaware agent quietly (shovel) doesn't raise the alarm.
- Alert agents use cover and shoot from range.
- **Drops:** body armour (+40 ballistic), pistol ammo.
- First visit: fully staffed. Each return for explosives: a smaller squad.
- **Changed (Nov 8):** at the Car Armory the base is mostly overrun by **Men in Black zombies**; the living agents are **a few paranoid survivors** barricaded deep inside who shoot anything that moves (a stealth section; see the Car Armory). This keeps the forest empty of people.

### Aliens

*Designed, not built (the model and its kit stages are; the AI is M11's and M13's).*

- Martians. They hide behind crates and cover, wait until the player is close, then jump out.
- **Cowboy drift (running gag):** they've started adopting Americana. Near the ship's entrance they just carry shotguns; deeper in they add hats, bandanas and holsters; the deepest is a full saloon gunslinger. The costume doubles as a threat gauge.
- They use custom shotgun shells because Earth shotguns turned out to beat their ray guns. **The gag starts at the crashed plane** (Nov 8): a lone grey studying the plane to work out what technology shot its ship down, the pilot's pistol already in its hand.
- **Drops:** alien shields (+30 energy armour), alien med kits (heal 60), alien shotgun shells; the plane's grey also drops a small alien power cell.
- **Sheriff** (Nov 8): one grey is friendly. Where his crew took the outlaw side of the Old West (black hat, territorial, hostile), he took the lawman's: white hat, a tin star, community, standing up for what's right. See the Car Armory.

### Giant beetles

- The Mothman's brood. Armoured shell: body shots do little. A soft spot on the face takes full damage, so the player has to face them and aim.
- **As built (Session 17):** first met at the military outpost, from crates in the compound (one breaks open by itself as Tom passes; opening a second sets the rest off in a burst) and scratching in a sealed container. The shell takes 30%, the face 3x. They emerge, threaten, charge, rear and snap, flinch and die flipped over; they can't climb the watchtower.

### The Mothman

*Designed, not built. **A flying-enemy spike is (Session 22, M10.3: flyovers and dives; "Build plan: the M10.3 spikes").*** The outpost hints at him (the torn-open container C-7, never named); flares are counted for his attention but nothing comes yet.*

- **His model is built (Session 24;** `render/mothmanModel.js`, `render/MothmanRenderer.js`, `config.mothman`**):** a gaunt dark man-shape, 2.3 m, furred like a moth (a ragged ruff with the head sunk into it, feathery antennae, clawed hands and feet), two pairs of dusty moth wings about 5.3 m across with faint eye-spots; his eyes the only bright thing on him (they glow and aren't fogged). One draw call, no lights. Poses: stand, mantle, perch, cling, glide, fly, dive, strike, flinch, wounded, dying, corpse. The flyer spike wears him; his encounters' AI is Session 25 on.
- A tall winged figure with glowing red eyes. **Met three times** *(Aaron, Nov 8)*:
  1. **At the crashed plane:** the pilot's signal flare answers its long-counted flare attention. A flyover, a second flyover, then a full attack that goes aggressive fast and hits hard. Tom either does enough damage that it flies off early, or drops to a **scripted health floor of 10%** and blacks out (see Encounters: the Mothman at the crash site).
  2. **At the station (the bug zapper):** lured by flares into the cleared ground, hooked by the dozer's winch, shot, and zapped on the fence. It doesn't die; it breaks free and flees to its cave.
  3. **In Bigfoot's cave:** wounded, in the final chamber, where Tom kills it.
- Flies and swoops in for dive attacks; a screech briefly blurs the screen and slows the player; calls beetles; lands or clings to walls between swoops (the window for heavy damage).
- **It can't die outside the cave.** Once it's dead, the Caller is gone for good (see the Caller).
- **Its brood:** the cave's tunnels are full of its eggs, beetles hatching all around. It keeps Bigfoot in a silk cocoon (moths spin cocoons, not webs).
- **In the forest (flares):** every flare adds to a hidden attention meter that slowly drains. Spam flares and the Mothman arrives: wingbeats, red eyes in the treeline, dive attacks for a while, then it leaves; hurt enough, it flies off. *(Nov 8: this only matters once flares are back in the drop tables, after the plane; the plane's signal flare is what first answers the meter.)*
- **Origin:** it first came through at the abandoned mineshaft (Nov 8: the seam at the bottom, beside the giant torn cocoon it hatched from; see Optional encounters). *(proposed, reconciling Oct 16)* The military caught it there and were moving it through the military outpost, where it broke out of its container in transit; it then moved into Bigfoot's cave. The outpost hints at it but never names it.

### Flares

**As built (Session 20):** flares (`loot.json`: `"after": "mothmanMet"`) never drop from any table (army zombies, police boots, the outpost's searches) until the story flag `mothmanMet` is set (Session 25 sets it at the crashed plane; the debug menu's story flags can set it now). The dice still roll, so the rest of a seed's loot is the same either way.

- **Changed (Aaron, Nov 8; designed, not built):** **no flares in the opening.** Take them out of police car boots and army zombie drops until after the crashed plane. Both big Mothman moments fire their flares in cutscenes (the plane's signal flare, the station's lure flares). Once the Mothman's been met at the plane, flares join the general drop tables as random finds.
- **Lure:** zombies near a burning flare chase the flare instead of the player for its burn time (e.g. 20 s). Fire one away to drag a horde off, or toward a planted charge.
- **Cost:** too many flares draw the Mothman (above).
- **Capped:** carry limit 3 (config), few sources.
- **Flares never attract the witch.** A reliable lure plus explosives would make her too easy to trap.
- **As built (M9.1, Session 14; Aaron):** the flare gun fires like any gun, along the crosshair: Y (F) sends a fast, glowing flare that drops a little (air drag and gravity: fired straight up it arcs over and drifts down). **A direct hit conks** a zombie or the witch (18 damage, 3x on the head, a stagger). It falls where it hit, or lands, and burns red for 20 s. **Only the newest flare counts:** the last one fired casts the one real light (made at load), and the last one to land is the lure: every zombie within 35 m goes to it and mills about, unless Tom walks right up to one. Older flares just glow out. Carry 3, start with 3; road flares in police car boots, sometimes one off an army zombie. The Mothman's attention meter is counted, unused until M10 (`combat/Flares.js`, `config.flares`).

## The witch

A fully 3D, agile folk-horror witch. She roams at night planting sigils, and flees or fights depending on her health and how close she is to her hut.

### States

| State | When | What she does |
| --- | --- | --- |
| Resting | Day | In or near her hut |
| Roaming | Night | Travels the pathway graph toward a planting spot (mostly sigil grounds) |
| Planting | At the spot | Plants a sigil over about 45 seconds (config; Aaron, M7), crouched and contorting, with a visible ritual effect and singing |
| Fleeing | Hurt, or far from the hut | Runs, cuts between trees, drops traps behind her |
| Attacking | Healthy, or cornered near the hut | Ranged hexes, close strikes, summons a few zombies |

- **By day** she stays hidden inside the hut and comes out in the early evening (Aaron, M7). You can stake out the hut and take shots at her as she leaves. (One scripted exception: the gas station sighting, which plays whatever the time.)
- **Planting pace:** night 1 is safe at the station, then 1–2 sigils a night (Aaron, M7). Night 1's one scripted sigil at the storm shelter is the exception (see Opening and first run), and until the cordon is crossed she plants only inside the opening cluster (see Map).
- **Toughness:** about 3–4 good ambushes on the pathways to kill her outright, if she isn't given time to heal (Aaron, M7: "make her good and strong"; 1000 health after the gate, Session 9).
- **Her fight** (Aaron, Session 9): when she turns on you she backs off, weaving, to about 20 m, dropping traps, and holds there throwing a hex every few seconds (fast, but they can be sidestepped or blocked by a trunk). Come within 10 m and she backs off again. Any hit but the shotgun's sends her **rushing** in to swipe again and again; a shotgun hit, or enough damage, drives her back out. She summons a few zombies whenever she can.
- **Her look** (Aaron, M7): a thin **shadow creature**, unlit near-black so the torch never lights her; only her silhouette and narrow slit eyes read. She **glides** upright, head level, arms hanging limp, with no steps. In the ritual she folds right down and contorts (head craned too far, arms splayed like a spider's, joints that jerk and hold, elbows that sometimes bend the wrong way). The real model comes in the art pass; she's one of the few characters worth extra drawing.
- **Fight-or-flee score** = health % plus a bonus for being near her hut. High → attack; low → flee. She's far more dangerous near home.
- **Movement:** a Left 4 Dead–style agile runner (vaults logs, weaves, doubles back). Faster than the player on paths; slower while dropping traps. Simulated as a point on the graph when far away.
- **Planting interruption:** enough damage while planting (config) cancels the sigil; she then flees or attacks.

### Running from her (Aaron, Sessions 14 and 17)

In the early game Tom can run from her: she gives up a fight once he's 50 m from where it started (140 m once he's crossed the cordon; never in the final battle), then leaves him be for 40 s unless he hits her (`config.witch.pursuit`).

**Escape the witch** (Session 17, `story/WitchEscape.js`): until the cordon's crossed, while she attacks Tom close by, ESCAPE THE WITCH stands on the screen, Ellen tells him to get away (at the outpost: leave the checkpoint and come back), Wyatt says to take the quad if it's near, and Wyatt says when she's gone. The outpost holds its beats meanwhile. You can't fight her properly this early.

### Wounds and recovery

- Damage persists between nights. She recovers over 2–3 nights (config), mostly resting by day.
- While wounded she favours fleeing and plants fewer sigils. Sustained pressure keeps her weak.

### Traps

- Dropped while fleeing and placed around the hut approach. Denser closer to the hut, so they act as breadcrumbs.
- Snare (roots the player: mash A for about 2 seconds to break free, Aaron M7), hex totem (damage zone), alarm charm (calls nearby zombies).

### Two ways to fight her

1. **Pathway fights (optional, never forced).** Meet her by luck or by reading the map: sigil grounds, their tells, trail-camera sightings. Ambush her mid-ritual. She flees when hurt. She **can** die here, but realistically only after several encounters and a very good run.
2. **The final battle at the hut**, deliberately triggered by the player.

- **Scripted witch beats** along the story *(Aaron, Nov 8; still to design)*, so she isn't forgotten while the spine's bosses are the Mothman and the portal. She never enters the main story encounters.

### Destroying the hut

- The hut is hidden deep in the south behind trap-lined approaches.
- **The hut is gated** *(Aaron, Nov 8; designed, not built)*: from the start, an impassable **ring of witchfire** surrounds it, fed through the portal. Once Tom breaks what she draws power from on the other side of the portal (see Encounters: inside the portal), the witchfire gutters out and the way to her opens. So in the story, the portal comes before the hut. *(Today the hut can be reached and blown at any time; how this sits with pathway fights killing her early is open.)*
- **Only explosives** can destroy it: **two charges, planted at the hut and detonated together** by remote.
- The carry limit is two, so both are used on the hut and none can be brought into the final battle.
- Planting is dangerous: the approach is the most trapped area and she may come out to stop the player.
- Detonation is a **point of no return** (Aaron, Session 9): when the second charge goes on, Junie radios to ask if Tom is sure he's ready, then a pop-up pauses the game to say that setting them off starts the final battle and deletes the save.

### Explosives

- **As built:** one charge in the outpost's armoury locker; the rest from the debug menu until the mineshaft and the Car Armory exist. Charges blow up cars and gas pumps too.
- **Changed (Aaron, Nov 8): hut charges now come only from the outpost's armoury (one) and the Car Armory's restocking crate.** The mineshaft gives dynamite instead. **Dynamite is not a hut charge:** small, unstable, short-fused crowd clearing. Thrown at the hut it only scorches it, and Ellen says it'll take real charges set off together.
- *Earlier:* sources: the mineshaft (one), the military outpost (one), and the Car Armory's crate, which restocks. The outpost is now every run (Oct 16), so every run has at least one early charge; a second depends on the mineshaft appearing. (This replaces the earlier "two, one or none" variety. Aaron, Oct 17: one guaranteed charge is no problem, since the hut needs two charges together, so one alone can't start the final battle.)
- Also a general weapon: plant one as a trap on a path, or drop one while chased and detonate as enemies follow.
- Always manual detonation (no proximity trigger). The player is hurt if caught in the blast. Radius and damage are config.

### Final battle

- First-person cutscene: the hut explodes and the witch bursts out.
- **Blood night:** the game jumps to a special night: red sky, embers and ash, witchfire. **The clock freezes** for the whole fight. Detonating by day jumps straight to night (Aaron, M7).
- **The station is still attacked** (simulated), so a weak base can still be overrun mid-fight. Secure it first. The attacks run on in real time while the clock is frozen (Aaron, M7).
- **No escape:** the hut clearing is sealed (ring of thorns or witchfire). Her fight-or-flee logic is off; she attacks until one of them dies.
- **Attacks:** her pathway pattern (retreat, hex, rush), faster and harder: heavier swipes, hexes more often, more summoning, and snares and hex totems spammed round the player. She keeps a few metres inside the witchfire ring so she never snags on its trees.
- Her current wounds carry in, so pathway fights beforehand make it easier.

### The ending

**Victory:**

*As built (M7-M8): the final battle's intro, the victory and the defeat play as cutscenes from data (`final.intro`, `ending.victory`, `ending.defeat`); the victory's montage is trail-cam shots in placeholder form, without the Ground Zero portal shot yet. Then the run summary.*

1. First-person: the witch is consumed by her own witchfire and bursts apart in embers, sticks and bone. The red sky drains away.
2. CCTV montage: on trail cam after trail cam, the zombies collapse mid-stride.
3. Ground Zero's camera: the portal, open and humming all game, flickers and goes dark.
4. Dawn: the family come out of the comms room to meet Tom. Closing lines.
5. Run summary, then the main menu.

**Defeat:** the screen fades as the radio fills with static and the family calling Tom's name. No graphic scene. Run summary; the save is deleted.

## Encounters

Hand-built set pieces placed by the map generator. The campsite, gas station, storm shelter and military outpost are the exception: they're part of the fixed opening cluster (see Map: Fixed opening cluster). Every encounter needs nine things: opening cutscene, aesthetic, enemies, loot, dungeon or not, lore, whether it appears every game, its band, and a novel interaction. All are designed below.

**The redesign (Aaron, Oct 17; Nov 8).** The four in the fixed opening cluster (campsite, gas station, storm shelter, military outpost) are **built and play-tested**; their sections below describe them as they play now. On **Nov 8** Aaron workshopped the mid-game and end-game into one **story spine** (next section); the encounter sections past the outpost now carry that design. **None of it is built.** Items marked *(proposed)* came up and were liked but aren't locked. Each encounter's session still workshops its build plan with Aaron first (rule 10).

### The story spine after the outpost (Aaron, Nov 8)

The main story encounters, in order. They become **fixed** places on the map as the story settles (for now only the crashed plane is fixed; see Map: Structure). The optional, seeded encounters fill the map around them.

1. **The crashed plane:** a quick-draw standoff and shootout with a lone grey alien. It drops the pilot's pistol, alien shells, an alien med kit and a small power cell.
2. **The Mothman at the crash site:** Tom fires the pilot's signal flare and the Mothman answers. He's beaten down to 10% and knocked out.
3. **Junie is taken:** while Tom's unconscious, the Caller lures the family out of the compound with his voice. Junie doesn't come back.
4. **The old church and the time capsule:** the 1903 warning. Where the nature spirit is, the Caller isn't.
5. **The stairs in the woods:** into the foggy place beyond. Follow the silence three times and bring Junie home.
6. **The family's plan:** the nature spirit is Earl's Bigfoot, and Earl's maps point to the cave.
7. **The Bigfoot cave:** the military's dozer, the bug-zapper fight at the station, then the rematch in the cave. Kill the Mothman, free Bigfoot, and the Caller is gone for good. The Blessing is buried at the station; comms reach the south again.
8. **The quad goes missing and the mega night:** the witch's answer, about 150 zombies at the station; Ellen asks for the alien ship's big core.
9. **The crashed UFO and the mothership:** the beam up, the big core, and Earl's quad rebuilt as the alien quad.
10. **The Car Armory, Sheriff and the ute:** free the friendly grey, escape in a turret chase; Sheriff moves into the station's new garage.
11. **The killdozer and the portal:** Sheriff builds the killdozer from parts the optional encounters give; Tom goes through the portal at Ground Zero into the realm of stories and breaks the anchor.
12. **The hut:** the witchfire ring gutters out; the final battle.

**What it gives Tom:** a personal goal from beat 3 on (get Junie back, as well as kill the witch); a lonely stretch in the south when only the Caller is on the radio; and the family's voices back as the reward for freeing Bigfoot. **The seed** still decides the optional encounters, which killdozer parts they give, and what waits beyond the portal, so every run's endgame differs.

### Overview

| Encounter | Band | Appears | Placement | Status (Nov 8) |
| --- | --- | --- | --- | --- |
| Abandoned campsite | North | Every run (fixed opening cluster) | Next to the ranger station; first gated path | **Built** (Session 15) |
| Roadside gas station | North | Every run (fixed opening cluster; guaranteed witch sighting) | On the cluster's road; second gated path from home | **Built** (Sessions 15b-16) |
| Storm shelter | North | Every run (fixed opening cluster; Night 1 sigil) | Inside the home cluster, on Pruitt land | **Built** (Session 16) |
| Overrun military outpost | North | Every run (fixed opening cluster; the gateway south) | The checkpoint in the military cordon, the only way out of the home cluster | **Built** (Sessions 17-19) |
| Bigfoot cave | North (moved Nov 8) | Every run (story spine, beat 7; unique prize) | Just south of the ROAD CLOSED barrier on the road north of the gas station, behind brush the dozer clears | **Placed, Session 21:** the road north, the barrier, the spur of rock and the mouth behind brush (the dozer clears it); the cave itself is M12's |
| Crashed plane | North (frontier) | Every run (story spine, beat 1; fixed) | Fixed just past the checkpoint, where the dogfight shows it come down; the first stop after the outpost | Its clearing is fixed (Session 21), the checkpoint's pathway runs to it and it smokes after the dogfight; the encounter is designed (Nov 8), not built |
| The cordon strip and the dozer | North/middle (along the cordon) | Every run (story spine, beat 7) | Where the military's clearing crew stopped, along the cleared strip (which end is open) | A fixed clearing at the strip's east end (Session 21: Claude's pick of end); designed (Nov 8), not built |
| Time capsule (the old church) | Middle | Every run (story spine, beat 4) | A ruined old church | A fixed clearing (Session 21); designed (Nov 8), not built |
| Stairs in the woods (the place beyond) | Middle | Every run (story spine, beat 5); whether other stairs appear too is open | Off-path clearing | A fixed clearing off the pathways, one faint trail to it (Session 21); designed (Nov 8), not built |
| The Caller | Wherever the forest is severed | Story (beat 3 until beat 7) | A voice only: the radio and the trees | Designed (Nov 8), not built |
| Crashed UFO and the mothership | South | Every run (story spine, beat 9; unique prize) | A south clearing; the beam up to the mothership | Its clearing is fixed (Session 21) and smokes after the dogfight; designed (Nov 8), not built |
| Car Armory and the government base | South (moved Nov 8) | Every run (story spine, beat 10; unique prize) | Near the government's main teleporter | A fixed clearing (Session 21); designed (Nov 8), not built |
| Ground Zero and the portal (the realm of stories) | South | Every run (story spine, beat 11) | A crater clearing; the portal leads to a procedural dungeon | A fixed clearing (Session 21); designed (Nov 8); only the cold open's cutscene is built |
| The 1903 railway line | Middle/south border | Every run (map feature) | East to west across the full width | **Built** (Session 21): the bed, rails, telegraph line, crossings, the two collapsed tunnels |
| Optional: moonshiners' holler, railway cutting, sawmill, mineshaft, Milo's barn | Any (the cutting on the railway line) | Seeded (none guaranteed): **3-4 a run** (Session 21) | Around the spine | Placeholder clearings, dealt and placed by the seed (Session 21); designed (Nov 8), not built |
| Optional: Flatwoods landing, National Guard convoy, Men in Black listening post, Headless Horseman bridge | Any | Seeded | Around the spine | Named only |
| Witch's hut | South | Every run (fixed; story spine, beat 12) | Deep south, ringed by witchfire until the portal's anchor is broken (Nov 8) | **Built** (M7; its look Session 13), and since Session 21 at the same spot every run (deep south-west); the witchfire gate is designed, not built |

The frontier's clearings are placed by the generator from `data/encounters.json` (which ones appear, in which band); until each is built it shows as a placeholder signpost. The design checklist below predates the Nov 8 redesign for some frontier rows; where it differs, the encounter's own section wins.

### Design checklist

| Encounter | Dungeon? | Opening cutscene | Aesthetic | Enemies | Loot | Lore | Novel interaction |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Witch's hut | No | Approach: establishing sweep. Final battle: first-person explosion | Blair Witch hut, trap-lined approach | The witch, summoned zombies, traps | None | Deliberately none | Two charges detonated together start the final battle |
| Crashed UFO and the mothership | Yes | Tom finds the crashed ship; its beam takes him up | Wreck clearing; the mothership high in the atmosphere, clean metal, purple-green light | Cowboy-drift greys | The big alien power core, the alien quad (Earl's, rebuilt), alien shields, med kits, shells | Shot down by the patrol plane; the Day 1 red light was this ship | The beam up and back down; never seen from the ground |
| Ground Zero and the portal | Yes: the realm of stories (procedural) | CCTV: glitching government feed | Crater, shattered portal ring, cracked bunker; beyond, red sky, floating rock, witchfire *(proposed)* | A few Men in Black; beyond, all-out arenas seeded per run | Scrap, batteries | Final classified documents; the field is held open from the other side | The killdozer; the family imagine help; Bigfoot answers Junie |
| Car Armory | Yes | CCTV: sleek government camera | Military-style outpost mixing alien and human technology; a crude copy of the alien teleporter; the motor pool | Men in Black zombies; a few barricaded survivors | Turret, one-time ammo, first aid, scrap, body armour, restocking explosives; the ute | Classified documents; the portal supply point | Freeing Sheriff; a stealth section; the ute turret chase |
| Bigfoot cave | Yes (seeded) | The dozer clears the brush to the entrance | Stones and trees; Bigfoot's handmade crafts; the Mothman's eggs | Hatching beetles, the wounded Mothman | Bigfoot's Blessing, nature armour | Bigfoot as land guardian; the Mothman's brood | Two-stage Mothman fight (the station, then the cave); cutting Bigfoot from his cocoon |
| Stairs in the woods | Yes: the place beyond (procedural) | Establishing sweep to the stairs | A lone staircase attached to nothing; beyond, an extra-foggy alternate forest | None (nothing kills him there) | Junie | Never follow the voice calling your name | Four paths per clearing: take the silent one three times in a row |
| Time capsule | No | Establishing sweep to the plaque | Ruined old church, weathered plaque | None | None | The 1903 town's warning: the railway, the Caller, the nature spirit | Dig it up |
| The Caller | No | None (a voice) | At most, fog that moves when it shouldn't | None of its own | None | The forest's own old story; comes where the forest is severed | Takes Junie; taunts on the radio in the south |
| Military outpost (gateway south) | No | Tom arrives to report the witch; waves of dead soldiers on the approach reveal it's overrun | Approach road, watchtower, gun pit, sandbag barricade with breached steel fence, compound of tents, comms hut, armoury lockers and armoured shipping containers; working floodlights on a generator | Waves of helmeted army zombies peaking at the barricade; caged beetles in the compound | Rifle ammo, helmets, scrap, first aid, a truck's battery, one charge; hunting rifle rounds in the gun pit | A failed transfer point: torn-open containers (C-7 held the Mothman, never named), the resin-frozen alien (C-4), the field report and the manifest | Needs the hunting rifle to reach; the gun pit's machine gun (a battery); the generator's floodlights (a battery); the scope cutscene shows the live dogfight; the barricade's peak opens the checkpoint; beetle crates break open when shot |
| Mineshaft | Yes: a deep mine on rails | The cage lift down (a battery) | Surface office; timber, rails, the seam and the torn cocoon at the bottom | Zombie miners, beetles, giant moths | Dynamite | The Mothman's origin | The turret cart ride; the plunger and the fireball escape |
| Crashed plane | No | The camera on the grey at its work; it turns and lifts the pistol | Military patrol plane torn through the trees; a gun pod's parts laid out on the wing | One plain-grey alien; then the Mothman | Pistol, alien shells, alien med kit, small power cell | The dogfight Tom watched; the greys studying Earth guns | The quick draw; the signal flare |
| Storm shelter | Small room (a platform under the hatch, no loading) | Wyatt: whoever dug this hid it well; the camera reveals a horde standing on the hatch | A low earth mound, a rusted hatch in a timber collar; a small plank room Earl dug himself | 12 citizens and Earl holding the hatch (more climb out of the sigil until it's dug) | The gas station safe's combination (on Earl's keys) | Earl's diary and his trail-cam tapes: the witch at the hatch, the kids running into the trees | The first sigil dug (the family work out sigils raise the dead); dig the hatch open; the tapes on D-pad down |
| Milo's barn | No | Milo swings the car gates open one-handed | The barn from The Lone Clown; the dead stacked in rows | None of Milo's (he kills the dead) | A killdozer part (open) | Milo, ambiguous; the morning reveal | Hold still for three knives; shooting fails |
| Gas station | No (a store with an office and a stockroom) | Sweep from behind the store across the pumps to the "Home of Bigfoot" sign; first-person cutscene of the mutant waking and of the witch on the way out | Store, pumps, cars, "Home of Bigfoot" sign; dark aisles inside | 5 citizens on the forecourt; the authored first mutant inside | Scrap, car batteries, first aid, bulk ammo behind the counter; the hunting rifle in a locked gun safe; Earl's quad out back | "Home of Bigfoot" souvenirs and sighting photos (played straight); Earl's note; the scanner's quarantine broadcast | First mutant reveal by torchlight; guaranteed witch sighting; a safe that needs the storm shelter combination; the scanner needs a battery; the pumps blow |
| Campsite | No | Sweep past the campers' car to the torn tent and up over the camp; Wyatt: check the tents | Tents (one slashed from inside), cold campfire, blood, marked trunks | None on arrival; a wave of 7 when the shotgun is taken | Guaranteed shotgun, shells, a first aid kit, scrap, car battery | The campers were killed by the witch; a camcorder clip of her attacking them | Picking up the shotgun triggers a zombie wave; the game's first battery pull |

### Unique prizes

Three base upgrades exist exactly once per run, each from one encounter. A three-item checklist on the pause screen shows which are secured. *(Designed, not built: none of the three sources exist yet; the turret works but comes from the debug menu.)*

| Prize | Source | Effect |
| --- | --- | --- |
| Bigfoot's Blessing | Bigfoot cave | +20 security, permanent, never drains; weak zombies avoid or slow near the station; restores the family's comms in the south (Nov 8) |
| Automated turret | Car Armory (south band since Nov 8, so it arrives late) | Up to +20 security; needs fence power and hand-loaded ammo |
| Alien power core | The mothership, through the crashed UFO's beam (Nov 8) | A huge fence charge that drains far slower than batteries. *Before it, the crashed plane's small cell raises the fence to 1000 (see Power)* |

### North band

#### Abandoned campsite (every run, next to home)

Fleshed out with Aaron, Oct 16. Items marked *(proposed)* are suggestions not yet agreed; confirm them before building (rule 10).

**Purpose.** The first stop of every run and the player's introduction to the witch. Day 1 has no witch roaming and nothing else to do, so this encounter has to turn what would be a boring first outing into the moment the game announces itself. It also quietly teaches the rhythm every later encounter uses: **arrive calm, search, get hit with a turn, get rewarded, go home changed.** It must never feel like a tutorial with its hand up.

**How the player is pointed here.** From the top of the lookout tower (see Opening and first run): the view lingers on the forest, Wyatt spots the campers' car, and Junie mentions the smoke she saw above the trees last night. A thin wisp of smoke, or its last trace, is visible above the canopy from the tower, so her line points at something real on screen.

**Tone: deliberately understated.** The arrival should feel almost disappointingly calm. The signs of the witch are all there but read as background clutter until the camcorder recontextualises the whole clearing. Don't overcook the dread before the footage; the footage does that job.

**Layout** *(proposed)*

- A small clearing a short walk from the station gate, entered from the path on the north side.
- The campers' car parked at the clearing's edge by the path.
- Two or three tents around a cold campfire ring in the centre; folding chairs, a cooler, scattered gear.
- Stick figures hanging in the trees above the tents and ritual marks cut into bark: visible, but placed high and to the sides so they're easy to miss on the way in.
- Tents slashed open from the inside, and a little blood; the slashes face away from the entrance so they're found, not presented.
- Thick treeline on the south and east sides, where the wave comes from.

**Beat by beat**

1. **The walk out.** A plain walk down the path from home. Nothing happens.
2. **Arrival.** Establishing sweep of the clearing, settling on the campers' car. Wyatt (radio, line 5): check the tents, in case anyone made it (Session 15b: the cars wait until the tape has played).
3. **The search.** The player searches tents, backpacks, the cooler and the car. Each search point teaches a pickup type: shotgun shells, rifle rounds, a first aid kit, a little scrap.
4. **The camcorder.** Found mid-search, in the same rhythm as everything else, so it feels like the player's own discovery rather than an object on a pedestal. Picking it up plays the clip (line 6 before, line 7 after).
5. **The clip (the turn).** Shaky handheld camcorder footage, at night, of this same campsite: **the witch running through the camp and attacking the campers.** Fast, violent and physical, but cut and blurred enough that she's never seen clearly. It establishes that she is quick and dangerous, which seeds how she feels to fight later, and tells the player how much action is coming. The clip cuts out mid-attack.
6. **The shotgun.** The player keeps searching and finds the shotgun with a good stack of ammo: the real prize.
7. **The wave.** The instant the shotgun is picked up, zombies burst from the treeline (line 8). The footage just warned the player; now the zombies prove it right. This is the game's first fight.
8. **Wave cleared.** Lines 9 and 10.
9. **The battery.** The player pulls the battery from the campers' car. **This is the game's true first battery pull** (bonnet lift, then pull; see Vehicles and batteries). The gas station later reinforces it.
10. **The walk home.** Carry the battery back; the Day 1 loop continues at the station (fence, fence box, family).

**Order guarantee** *(proposed)*: the camcorder must come before the shotgun. Place the camcorder near the entrance (the first tent or the cooler) and the shotgun deeper in (the far tent or the car's boot). If the player somehow takes the shotgun first, the camcorder clip still plays when picked up, and the wave still triggers on the shotgun.

**Enemies**

- None on arrival: the clearing is empty and quiet.
- **The wave:** about 6–8 level-1 citizen zombies (config) from the south and east treeline, staggered over a few seconds so a new player is pressed but not swamped. Day 1 can't be failed (see Opening and first run), so the wave is tuned to be survivable with the shotgun's starting ammo plus the shells found in the search.
- No sigil and no horde; no scaling with zombie level, since this always happens on Day 1.

**Loot**

| Search point | Holds | Guaranteed or rolled |
| --- | --- | --- |
| A search point deep in the camp (proposed: far tent or car boot) | Shotgun and a good stack of shells | Guaranteed |
| A search point near the entrance (proposed: first tent or cooler) | The camcorder | Guaranteed |
| At least one tent or backpack | A first aid kit | Guaranteed (it's a teaching pickup) |
| Other tents, backpacks, cooler, car cabin | Shotgun shells, rifle rounds, a little scrap | Campsite loot table (rolled) |
| The campers' car | A battery | Guaranteed |

**Day vs night.** On a normal run the campsite is always visited on Day 1 by day. If the player skips it on Day 1, the wave and camcorder still trigger whenever they visit, day or night. *(proposed)*

**Revisits** *(proposed)*: once looted, the campsite stays empty: no restock and no second wave. The camcorder clip can be rewatched on the comms room monitors after it's handed in.

**Skip intro.** Repeat runs that skip the intro start at Dawn 1 with the campsite already looted and the shotgun in hand; the camcorder is already handed in.

**Lore and dialogue hooks**

- Uses tutorial lines 5–10.
- The camcorder is a lore item, handed in at the comms room; it unlocks Ellen's lore lines.
- The campers were killed by the witch: stick figures in the trees, ritual marks in the bark, tents slashed open from the inside. None of this is spelled out; it reads clearly only after the clip.

**Edge cases** *(proposed)*

- The player leaves mid-wave: the wave follows them toward the station like any zombies, and the fence handles them.
- The player dies in the wave: Day 1 can't be failed, so god mode or a softened wave applies until the tutorial ends (config).
- The player ignores the battery: Ellen's line 10 and the fence step at home nudge them back.

**Performance cost.** Low: one small clearing, 6–8 sprite zombies, no extra point lights (the fire is cold), one short cutscene clip.

**As built (M9.2, Session 15, then Aaron's play-tests; OPEN_QUESTIONS #185-197, #304):** `encounters/Campsite.js`, `data/campsite.json` (laid out from where the path from home walks in), dressed in Session 19 (`CampsiteProps`).
- **The walk out** passes the bloody wreck on the trail (the same every run, a window smashed); Wyatt and Ellen's first foreshadowing.
- **Arrival:** the sweep starts at the clearing's edge, past the car to the torn tent and up over the camp; line 5.
- **The searches** (hold X; the tents from their centres, 3.2 m): **the camcorder in the torn tent**, **the shotgun (+8 shells) in the green dome tent**, a first aid kit in the near tent, shells in a backpack, about 15 scrap for the fence across the camp.
- **The camcorder:** offered on D-pad down to play (the watch queue), lines 6-7 around it; about 8 s, never a clean frame of her. The cars can't be searched until the tape has played (or the wave's down).
- **The wave:** 7 level-1 citizens from both flanks over 6 s when the shotgun's taken (line 8), lines 9-10 when they're down. Day 1 can't be failed (health stops at 20%).
- **The campers' car:** a sure battery, the game's first battery pull.
- **Removed in play-testing:** the stick figures in the trees (Session 16), the axe and its stump (Session 19). The X-marked trunks and the slashed tent stay.
- Visited on any day or night it plays the same; once looted it stays empty; saved.

**Open questions for the campsite**

- Exact wave size and how forgiving Day 1 should be.
- Where exactly the camcorder and the shotgun sit, to keep the order.
- How the clip frames the witch: how much of her is seen, and for how long.

#### Roadside gas station (every run)

Fleshed out with Aaron, Oct 16. Items marked *(proposed)* are suggestions not yet agreed; confirm them before building (rule 10).

**Purpose.** No longer the battery tutorial (the campsite is the first battery pull; the gas station's cars are a refresher). The gas station has three jobs:

1. **The first tease that this is Bigfoot country.**
2. **The player's first mutant**, an authored moment.
3. **A guaranteed witch sighting**, every run.

It also plants the game's first **"come back later"** promise: a gun safe the player can't open yet (see The safe below).

**Tone: dead serious in-world.** The "Home of Bigfoot" gift shop is a sad, dusty roadside trap selling a joke nobody knew was true. The game never winks at the camera or plays it for comedy. The irony exists only for the player, in hindsight, once they've met Bigfoot and realise the gift shop was telling the truth.

**How it escalates.** Each beat teaches something and raises the stakes: the forecourt teaches ranged crowd control in the open, the dark store teaches close quarters, and the exit shows the player the enemy they can't yet touch.

**Layout** *(proposed)*

- A two-lane road edge with a gravel forecourt, two pump islands under a sagging canopy, and three or four abandoned cars (some with batteries).
- The big **"Home of Bigfoot"** sign on a pole by the road, faded and peeling.
- **The store:** one room of tight aisles and knocked-over shelves, a front counter by the door, windows boarded or grimed so the inside is dark even by day.
- **The back office** behind the counter: a desk, a filing cabinet, the owner's note, and the **gun safe**.
- A **stockroom** off the back, where the mutant waits.
- Treeline around the back and sides of the clearing; the witch appears at the forest edge across the forecourt, facing the store's front door.

**Beat by beat**

1. **Arrival.** Establishing sweep from the road, across the pumps to the car bonnets and up to the "Home of Bigfoot" sign. A family radio line notes the cars could have batteries.
2. **The forecourt fight.** A small citizen pack among the pumps and cars, in the open. Teaches ranged crowd control.
3. **Into the store.** Dark and confined, so the flashlight matters. It quietly introduces the light-vs-being-seen trade-off in a low-stakes place: the torch lights the aisles but marks the player.
4. **The first mutant.** A controlled first-person camera moment: the torch beam sweeps over something hunched and still at the back of the store, the camera hitches, and it rises to full height, far bigger than any zombie the player has seen. Then it comes at them up close, in the aisles, where they can't keep their distance. The shotgun and shovel exist for exactly this.
5. **Looting.** Shelves, the counter and the back office. Bigfoot souvenirs, plaster footprint casts and blurry sighting photos are set dressing, played straight. The player finds the **gun safe** and the **owner's note**.
6. **The witch.** As the player steps back out onto the forecourt, a short first-person cutscene takes the camera: the witch stands dead still at the edge of the clearing, looking at the gas station, then turns and runs into the trees, faster than anything should move. No fight, no damage, nothing the player can reach. Control returns with the player standing there with a weapon and nothing to shoot.
7. **The radio.** The family confirm it was real (e.g. Ellen: it's her, the one from the tape).
8. **Batteries.** The player can pull batteries from the forecourt cars before heading home.

**Why the witch beat works**

- It pairs with the campsite. Camcorder: *she exists*. Gas station: *she's here, in real space, watching you*.
- She runs **away**, not toward, on her own terms, as if she was only ever observing Tom. That's more unsettling than a lunge.
- It lands right after the player has just got stronger (the mutant beaten, a gun found). "I just got stronger, and she still walked right up and I couldn't touch her."
- Being guaranteed, it hits differently on repeat runs: first-time players get shock; returning players walk out of that door **bracing** for her, scanning the treeline, and the game makes them wait.
- **Exception to the witch's rules:** she normally hides in her hut by day. This sighting is scripted and plays whatever the time. *(proposed)* It uses a cutscene actor rather than the simulated witch, so it never moves her on the graph or exposes her to fire.

**The first mutant: rules exception**

- A deliberate exception to "mutants appear at zombie level 3+": this is the player's **introduction** to mutants, before a horde ever throws one at them.
- It has its **own tuned stats as an encounter-specific config value**, separate from the general mutant numbers, most likely reduced health so it's beatable close-quarters with the shotgun and a handful of shells.
- Aaron plans to rework mutant and zombie tuning for more variety in difficulty, so this mutant will need rebalancing when it's built.

**The safe: a three-part chain across the map**

The back office holds a heavy **gun safe**. Inside is the **hunting rifle** (the scoped bolt-action). It is not the heat-scope semi-auto, which stays a late-game reward.

1. **The gas station (see it).** The safe is found and the owner's note explains what's inside. A steel safe can't be forced with a shovel or a shotgun, so the locked state reads as real, not as video-game rules.
2. **The storm shelter (the combination).** The owner, **Earl Pruitt**, fled to his family's storm shelter and took the combination with him. He died at the hatch and came back: he's a zombie there, and the combination is on his body once he's put down (Aaron, Session 13). His look is the zombie variant `earl` (Session 13): sixties, a faded red trucker cap, grey stubble, a tan work shirt, jeans; one fixed look.
3. **The military outpost (the ammo).** The rifle is empty and its rare rounds are at the outpost: in the gun pit's ammo box since Session 18 (first designed up in the watchtower).

- **The owner's note** (text to be written) says roughly: the rifle's in the safe, but she's empty; never could find the right rounds. Combination's with me. Gone to the shelter. It explains why a man fleeing for his life left his gun behind (it was useless to him), and why he locked it up (so it wouldn't fall into the wrong hands). It also points the player at the storm shelter.
- **Order:** the combination and the ammo can be found in either order. *(proposed)* The rifle can be claimed with just the combination and carried empty.
- **Rarity matters:** the hunting rifle can one-shot the witch's head and punches through lines of zombies, so its rounds stay genuinely scarce. It's a special-occasion gun for witch ambushes, not a daily driver.
- This is the first instance of **"make the walk back matter"** (see Ideas for later).

**Enemies**

- **Forecourt:** a small citizen pack, about 4–6 (config), scaled by zombie level like any zombies.
- **Store:** the authored first mutant, alone. *(proposed)* Nothing else inside, so the mutant fight is clean and readable.
- No sigil here.

**Loot**

| Search point | Holds | Guaranteed or rolled |
| --- | --- | --- |
| Back office | The gun safe (the hunting rifle, opened with the storm shelter combination) | Guaranteed |
| Back office desk | The owner's note | Guaranteed |
| Forecourt cars | Car batteries (*proposed:* at least one guaranteed) | Rolled, per vehicle rules |
| Shelves and counter | Scrap, a few first aid kits, some ammo | Gas station loot table (rolled) |
| The mutant | Better loot than a zombie, per the mutant rules | Rolled |
| Shelves | Bigfoot souvenirs, plaster casts, sighting photos | Set dressing only *(proposed:* a sighting photo could be a lore item to hand in) |

**Day vs night.** *(proposed)* Usually visited by day. At night the forecourt pack is larger (normal night spawning), and the store is no darker, since it's already dark inside. The witch cutscene and the mutant play on the first visit whatever the time.

**Revisits** *(proposed)*

- The mutant and the witch sighting happen once. Later visits have only whatever zombies wander in.
- The safe stays until opened. Coming back with the combination is the point of the chain.
- A return visit is a good spot for the Caller's first whisper on the walk home (see Ideas for later).

**Skip intro.** No change: the gas station isn't part of Day 1.

**Lore and dialogue hooks**

- An encounter-discovery line on arrival (batteries in the cars).
- The witch confirmation over the radio after the sighting.
- *(proposed)* A line from Wyatt or Ellen after the mutant: that wasn't like the others.
- *(proposed)* Junie, back home, on the "Home of Bigfoot" sign or the photos. Played straight; she's a frightened kid, not a punchline.
- The owner's note leads to the storm shelter; finding the combination there should trigger a family line tying them together.

**Edge cases** *(proposed)*

- The player flees the mutant: it follows out of the store and keeps fighting in the open, and stays a mutant on the forecourt. The witch cutscene waits until it's dead.
- The player never enters the store: no mutant, no witch beat, and the safe isn't found. They play out on the next visit.
- The player already has the combination before ever visiting (e.g. the storm shelter first): the safe can be opened on the first visit, and the note still reads as backstory.
- The player dies to the mutant: normal permadeath. This is past Day 1, so the reduced health is the only safety net.

**Performance cost.** Low to medium: one small clearing, a single-room interior with no loading, 4–6 sprite zombies plus one 3D mutant, the torch as the main light, one short cutscene.

**As built (Sessions 15b-18, then Aaron's play-tests; MORNING.md and OPEN_QUESTIONS, Sessions 15b-18):** `encounters/GasStation.js`, `data/gasStation.json`, `render/GasStationProps.js`.
- **The set:** a low block north of the road (GAS · GIFTS · BAIT), the forecourt with two pump islands under a sagging canopy, the HOME OF BIGFOOT pole sign (PRUITT & SONS EST. 1971), a dumpster out back where the trail from the campsite comes in. Inside, dark by day: the counter, shelf runs (one knocked over), dead coolers, a chainsaw-carved Bigfoot, a board of sighting photos ("EARL SAW IT"), plaster casts. Behind a partition: **Earl's office** (his desk and note, dressed in Session 19) and **the stockroom** (the gun safe, the scanner, boxes, the back door out to the quad).
- **Arrival:** the sweep starts behind the store and comes over to the sign; Wyatt: "No lights on... their truck's gone."
- **The forecourt pack:** 5 citizens lingering among the pumps and cars before Tom arrives.
- **The first mutant:** crouched down the west aisle, dormant and silent (not on the minimap); a first-person reveal as Tom reaches the aisle (it wakes only from inside the store), the camera jolts, then it charges. Its own health: **240** (Aaron: 180 was too easy). Ellen when it's down.
- **Searches:** counter (a sure 14 shotgun shells and 14 rifle rounds: bulk ammunition), shelves, coolers, cabinet, boxes, rack. **The phone** is dead. **Earl's note** opens in close-up and is taken (a lore item). **The scanner** needs a battery (Wyatt: the cars out front), then plays the quarantine broadcast and Ellen. **The safe** stays locked until Earl's combination; then the hunting rifle, empty, and Ellen's call to adventure.
- **The witch:** once the mutant's down, back out on the forecourt: first person, she stands at the treeline across the road looking at the store, then runs; a cutscene actor, nothing to shoot. Ellen, then Junie once the note's been read; then Wyatt points Tom at Earl's quad out back.
- **The pumps blow** (Session 18): each island takes shots, hisses, and goes up in a big blast that chains to the other island and the cars.
- **Leaving** (after the shelter call): Ellen sends Tom home for the shovel.
- **Earl's note (final):** "Marcy, I've taken the kids to the shelter. If you find this, come straight there. Do NOT go to the military checkpoint, they don't know what they're dealing with. That witch has been burying things in the woods for weeks. Rifle's in the safe, but she's empty, never found the right rounds. Combination's on my keys. E."
- One forecourt car has a sure battery; all of it is saved.

**Open questions for the gas station**

- Settled (Oct 16): the gas station appears every run, as part of the fixed opening cluster, and is always the player's second outing.
- Resolved (Oct 16): the storm shelter and the military outpost are both in the fixed opening cluster, so the chain always completes. See Map: Fixed opening cluster.
- The mutant's exact stats once mutant tuning is reworked.
- The wording of the owner's note. (His name is settled: Earl Pruitt.)
- How long the witch is on screen and how clearly she's seen.

#### Storm shelter (every run; fixed opening cluster)

Fleshed out with Aaron, Oct 16. Items marked *(proposed)* are suggestions not yet agreed; confirm them before building (rule 10).

**Built (Session 16; Aaron's calls).** Earl dug it himself, so it's **small and a bit shabby**. **12 citizens** hold the hatch through the day, Earl among them as a zombie (Session 13's call); while the sigil's in the ground more climb out of it, and once it's dug up they stop, and the family work out that **the sigils are raising the dead**. **Nothing indicates the children died:** the room is empty of them, Ellen says maybe they got away, and on the tape the kids run into the trees while she goes after Earl. The diary is read in a **paper close-up** (Earl's note at the gas station too). The room below is part of the main map (a platform under the hatch, no loading). See STATUS (Session 16) and OPEN_QUESTIONS #213-221.

**As it plays now (after Aaron's play-tests, Sessions 16-19):**
- **Reached after the gas station:** Pruitt land's gate opens once the witch sighting and Earl's note are done (not on Night 1). Ellen sends Tom home for the shovel first.
- **Arrival:** the sweep starts 32 m up the path, down across the horde to the hatch, while the world runs on unseen (the dead keep moving; nothing notices Tom); Wyatt's line. The horde (12 and Earl) is put there 70 m out, so the quad can plough in.
- **The sigil** sits about 5.5 m from the hatch; while it's in the ground the dead climb out of it (one every 6 s, up to 12); dug, the rising stops and Wyatt and Ellen work out that the sigils raise the dead.
- **Earl:** put down, his keys glint where he fell; Ellen knows him by his red cap. The brass tag is the safe's combination.
- **The hatch:** dug clear with the shovel, hauled open; climb down. **The room** is only the story now: the diary (in close-up, taken home) and the tapes. No loot, no usable radio or photos (Session 16, Aaron). Junie asks if Earl's kids are down there; Ellen: "Nobody's here. Maybe they got away."
- **The tapes** are offered on D-pad down the moment they're taken (Session 17); handed in, they go on the monitors.
- **On the ride back,** Wyatt calls Tom in for **a stop at home** (Session 18, `story/HomeStop.js`): inside the fence, Ellen and a hint point to the fence box or the ledger.

**Purpose.** Part of the fixed opening cluster, doing three jobs:

1. **The Night 1 sigil and the sigil tutorial.** The witch plants her first sigil here. The player learns what a sigil is, that digging it up quiets the night, and that sigils are why people die.
2. **The gas station safe's combination**, on the owner's body in the clearing (part two of the hunting rifle chain; see Roadside gas station).
3. **The owner's diary and trail-cam tapes**, the lore.

The clearing above is a fight; the room below is the game's **first proper interior** and a deliberately sad, quiet beat. It teaches the interior rhythm (go down, the outside world muffles, come back up changed) before the bigger interiors: the cave and the alien ship.

**The emotional core: symmetry with Tom.** The gas station owner was a lifelong Bigfoot believer, and he was **right**. He became a prepper because he knew the woods held more than people admitted, and he fled here with his family. They died a few feet short of safety. It mirrors Tom: both men saw the woods for what they are and tried to protect their families. One had a fence, a tower, training and a radio network; the other had a steel hatch and a stocked room. The difference was mostly luck, and that should scare the player a little.

- **No survivors.** The isolation is load-bearing. If anyone had made it, the player would think "where there's one, there's more", the world would fill with an off-screen population, and saving it would start to look like someone else's job. The emptiness keeps the weight on Tom.
- **It recasts the gas station.** On the first visit the "Home of Bigfoot" store reads as tacky. After the shelter, the player realises the owner wasn't a huckster: the souvenirs were half a living and half a man telling the truth the only way people would listen. Nobody says this out loud.

**Layout** *(proposed)*

- A small, sheltered clearing a short walk off the home cluster's paths, ringed by close trees.
- **The hatch:** a steel storm-shelter hatch half-buried in the ground near the centre, padlock open, half-covered in leaf litter.
- **The sigil:** in the earth right beside the hatch, where the witch crouched over it.
- **The owner's body:** face down at the hatch, one hand reaching for the handle.
- **The room below:** down a short ladder; one concrete room about 4 m × 3 m. Bunks, shelves of tins and water, a small table with the diary, a corkboard of trail-cam photos, a TV and VCR on a shelf with a box of labelled tapes, the family's things.

**Beat by beat**

1. **Arrival.** Wyatt (radio): whoever dug this hid it well (it's marked on the map from the Night 1 clip, so the line is about the owner, not about finding it). The establishing camera reveals a horde standing on the hatch.
2. **The fight.** The horde is the **first sigil's own spawn**. The witch planted a sigil here before the family arrived, and the zombies it raised caught them in the open. Clearing the horde, digging up the sigil and opening the hatch are one connected fight.
3. **Digging up the sigil.** The sigil tutorial: hold interact with the shovel; taking damage interrupts it. The glow dies, and the night (if it's night) goes noticeably quieter.
4. **The owner.** His body lies at the hatch: he never made it down. On him: the **gas station safe's combination** stamped on a brass tag on his keyring (Session 11).
5. **Opening the hatch.** Dig the hatch clear with the shovel and haul it open.
6. **The room below (the quiet).** Sealed exactly as the family left it, stocked with care for a survival that never came. The player reads a life that was ready to wait this out:
   - Family belongings: four bunks made up, the kids' things (a colouring book, a stuffed toy, a board game on the table), Marcy's handwriting on the shelf labels.
   - Bigfoot evidence: a plaster cast, maps of the north ridge with sightings marked, newspaper clippings of the local crank who saw Bigfoot.
   - **Trail-cam photos pinned to the wall:** mostly empty forest, one or two with a smear of motion that is unmistakably the witch.
   - Supplies: first aid kits, ammo, batteries, a radio.
7. **The diary.** On the table. The owner's, written before the end (see below).
8. **The tapes.** The owner's trail-cam footage. *(As built: offered on D-pad down as soon as they're taken.)*
9. **Back up.** Climbing out past the bodies that prove the family never got the chance.
10. **At home: the tapes.** Handed in at the comms room, they go on the monitors (see below).

**The world only sees her through lenses.** The camcorder at the campsite, the sighting at the gas station, the family's trail cams, and now a dead man's photos and tapes: everyone glimpses her in fragments, never clearly. That's her mystique.

**The diary**

The owner's diary, written **before** the end. It's a reflective object, so it stops where reflection stops: a man wouldn't journal while dragging his kids to safety. It doesn't narrate the final day; the tapes do. A handful of dated entries across years, so the gaps tell their own story. He is **Earl Pruitt** (named in Session 11, Aaron: dealer's choice); his wife is **Marcy**; the two kids are unnamed.

1. *(years back)* "Saw it again today, up the north ridge. Taller than any man, and it just watched me, calm as you like, then walked off into the trees without a sound. Sheriff laughed me out of the office. Marcy believes me though. That's enough."
2. *(later)* "Opened the store. Everyone thinks it's a gag, the signs, the casts, the photos. Let them. Keeps the lights on, and it keeps me out here, where I can watch. Put trail cams up along the old logging trails this spring. If he's out there, I'll get him on film, and then they'll all stop laughing."
3. "Cameras for a year and not one clear frame of him. But I'm getting something else. Something fast. Camera four, three nights running now, a shape going through the trees quicker than anything should move. Low to the ground, wrong somehow. It isn't him. He's gentle. This thing isn't."
4. *(the last written entry)* "The lights started a few weeks back, out past the government land. Then the animals went quiet. Camera four's got that fast shape every night now, closer to the road each time. Checked the shelter today, restocked it, oiled the hatch. Stocked that place years ago, half as a joke. Hope to God I never need it."

Then a **blank page**. The blank page is the horror. *(Session 19, Aaron's playtest: the blank page read as an extra, empty page: taken out; the diary just stops. OPEN_QUESTIONS #305.)*

**As built** (`data/papers.json` `earlDiary`, five entries): **June 14, 1987** (entry 1); **April 2, 1989** (entry 2); **Aug 21, 1996** (added in Session 16: seven years of watching, he's stopped wanting to prove anything; the big fella comes down to the creek at dusk and sits across it from him); **Oct 9, 2002** (replaces entry 3: thirteen years of trail cams and the big fella caught maybe twice, both a blur, "suits us both fine", but this year something else); **Sept 30, 2003** (entry 4). It fits Bigfoot predating the portal by at least 15 years (see Ideas for later).

**The trail-cam tapes**

The footage, not the diary, delivers the family's final day. The player recovers it in the shelter and carries it home: a find in the field that pays off at base.

**As built** (`clip.pruittTape`, camera four, trail-cam green): the witch already low over the ground beside the hatch; **Earl and his two kids** hurry in and pull up short (Marcy isn't with them: Earl's note asks her to come to the shelter); she turns, far too fast; **the kids run one way into the trees, Earl the other, and she goes after him**; the clearing empties to the hatch and the sigil's glow. Then Wyatt, Ellen, Junie (maybe the kids got away), Wyatt again (the glow is the thing Tom dug up). Nothing says the children died (Aaron).

**What the footage shows** as first designed (camera four, night-vision green, timestamped late at night, 2003):

1. The clearing with the hatch, empty.
2. Movement at the treeline: the family hurry in (the father, Marcy, two kids), heading for the hatch.
3. The witch is **already there**, crouched over the ground on top of the hatch, doing something to the earth: the first sigil going in.
4. They pull up short. A still beat; nobody moves.
5. She turns toward them, far too fast. The camera catches only the start of it before the family scatter out of frame.
6. The clearing empties. The last several seconds are just the hatch, alone, and the fresh sigil's disturbed earth glowing faintly. The camera keeps rolling on an empty clearing.

The kill is never shown: setup and aftermath only. And it ties the mechanic in hard: the sigil on the tape is the exact one Tom has just dug up.

**The cutscene at home.**

- **Wyatt reacts first.** He's the practical one, so he loads the tape and gets it playing, and reacts gut-level, a kid seeing the thing on screen.
- **Ellen explains.** A civilian who independently documented her entity corroborates what she's pieced together from the classified side, so her theories feel real rather than paranoid.
- **Junie** *(optional)* catches a small detail the others missed.
- The two surveillance networks meet across the gap of his death: his cameras caught her; the family's cameras catch her.

**Enemies**

- **The horde on the hatch**, the first sigil's spawn. As built: 12 level-1 citizens and Earl himself (a zombie: Session 13's call), held there through the day; more rise from the sigil until it's dug up. Marcy and the kids are not among them (no zombified family, so the sad beat stays sad rather than grotesque).
- **The room below:** none. It's a quiet room.

**Loot**

| Search point | Holds | Guaranteed or rolled |
| --- | --- | --- |
| The owner's body, at the hatch | The gas station safe's combination | Guaranteed |
| The table below | The owner's diary (lore item) | Guaranteed |
| The VCR shelf below | The trail-cam tapes (lore item; plays as a cutscene at home) | Guaranteed |
| Shelves below | First aid kits, ammo, batteries, a radio | Storm shelter loot table (*proposed:* at least one first aid kit and one battery guaranteed) |
| The wall below | Trail-cam photos | Set dressing |

**Day vs night.** The witch plants this sigil on Night 1, and the family can urge Tom to dig it up in the dark. *(proposed)* By night the horde is on the hatch and the sigil glows; by day the horde lingers on the hatch anyway, since they're the sigil's spawn and the sigil is still there. **An encounter exception** (Session 11): normally zombies rise only at night and most sink at dawn; the shelter's own horde doesn't sink, and holds the hatch until the sigil is dug up.

**Revisits** *(proposed)*

- Once looted, the room stays as it is: a tomb, quiet, nothing restocks.
- The witch may replant here on a later night, like any clearing, but it isn't a sigil ground.

**Skip intro.** Repeat runs start at Dawn 1, with the Night 1 sigil still planted here, so the shelter plays as normal.

**Lore and dialogue hooks**

- Wyatt's arrival line (the owner hid it well).
- The combination found: a family line connecting it back to the safe *(proposed)*.
- The diary and the tapes, handed in at the comms room: the cutscene above, and Ellen's lore lines.
- The Night 1 trail-cam clip and the owner's tape show the same night from two cameras (see the open questions).

**Edge cases** *(proposed)*

- The player opens the hatch without digging up the sigil: allowed. The sigil keeps spawning, and the family nudge Tom to finish the job.
- The player takes damage while digging: digging is interrupted, as everywhere.
- The player leaves without the tapes: they stay on the shelf until collected.

**Performance cost.** Low: a small clearing, 6–10 sprite zombies, a one-room interior (no loading, *proposed*), a cutscene played at home.

**Open questions for the storm shelter**

- **Two cameras, one night.** The Hales' Night 1 trail-cam clip (tutorial lines 17–19, camera six) shows the witch planting this sigil. The owner's camera four shows the same night with his family. **Settled (Aaron, Oct 17): the Pruitts die on Night 1, while Tom is at the station.** The Hales' camera sits further off and only catches her after the Pruitts have scattered out of its frame, so on Night 1 the Hales see only a witch planting something. Earl's tape later reveals what they never saw: people were there, and it happened while they watched.
- Settled (Session 11): the combination is on a brass tag on his keyring; the owner is Earl Pruitt.
- Settled (Session 16): the room below is part of the main map (a hatch and a ladder; a platform Tom is kept inside), not the interior system.

#### Crashed plane (every run; story spine, beat 1; fixed)

*Designed with Aaron, Nov 8; not built. Built so far: its clearing is placed on every run, the outpost's dogfight brings the plane down exactly there, and smoke stands over it afterwards. **Fixed:** the same place every run, just past the checkpoint: the first stop after the outpost.*

**The scene.** A military patrol plane torn through the treetops, wings sheared off, gun pods scorched. The pilot is dead; there are no survivors. A **lone grey alien** is studying the plane to work out what technology shot its ship down. One gun pod is pried open, its parts laid out on the wing like a dissection: the outpost's resin specimen turned around. The grey has picked up the pilot's pistol. **This is where the running gag starts:** the greys working out that Earth guns beat their ray guns.

**The standoff** (a cutscene into a fight):

1. The camera starts on the alien, absorbed in its work. It turns and sees Tom, then slowly lifts the pistol.
2. Control comes back just before it fires: **a quick-draw moment**. About half a second's window (config): one well-aimed shot drops it, so a quick player feels like a gunslinger.
3. If Tom doesn't fire first, the alien shoots. Its first shot misses (it's clumsy with an Earth gun). Then it scrambles behind the wing for cover and **a shootout** begins.

**What it drops** (a tutorial for the whole alien tier):

| Drop | Teaches |
| --- | --- |
| The pilot's pistol | The sidearm slot |
| Alien shotgun shells | Choosing ammo by holding B (see Weapons: ammo types) |
| An alien med kit | It goes into the healing pool (see Health) |
| A small alien power cell | It upgrades the fence (see The ranger station: power) and previews the big core in the alien ship |

**Lore:** the pilot's log: chasing a craft of strange lights over the ridge and trading fire. The plane and the alien ship shot each other down; the ship limped south and became the crashed UFO. The dogfight happens live (Oct 16): Tom watches it through the hunting rifle scope from the outpost's watchtower, so the crash is fresh when he arrives.

*Replaces the earlier design's loot (energy armour, flares, a first aid kit, a battery): flares now come only after this encounter.*

#### The Mothman at the crash site (story spine, beat 2)

*Designed with Aaron, Nov 8; not built.*

- **The flare.** After the shootout, Wyatt suggests firing one of the pilot's signal flares, in case anyone is out there looking for the plane. This is the flare that answers the Mothman's long-counted flare attention, and what answers isn't a rescue. It's fired in a cutscene.
- **The order:** a flyover, a second flyover, then a full attack. It goes aggressive fast and hits hard.
- **Two endings:**
  - Do enough damage and it flies off early: something for good players to aim for. It can't die outside the cave anyway.
  - Otherwise Tom drops to a **scripted health floor of 10%**, falls and blacks out. A brief first-person shot: lying in the leaves, red eyes over him, then it lifts away. Why it leaves is never explained (maybe it thinks it has won).
- **The floor stops permadeath ending a run on a set piece.**
- **On waking**, the alien med kit is the obvious way to heal: healing taught by necessity rather than told.
- Open: whether Junie is still taken if Tom drives it off early (the beat below assumes he's knocked out).

#### Junie is taken (story spine, beat 3)

*Designed with Aaron, Nov 8; not built.*

- Tom wakes a few hours later; **time cuts forward to dawn**. The family have been trying to raise him all night.
- **What happened:** while he was out, the Caller took over the radio and told the family Tom was in trouble. They left the compound to find him and heard Tom's voice in the trees calling for help. They got separated, and **Junie didn't make it back**.
- It gives Tom the personal goal he's lacked since the outpost: **get Junie back**, as well as kill the witch.
- The family learn the hard way never to leave the compound at night again. **The Caller now has Junie's voice to use.**
- **"No trouble ever comes from a family member" still holds:** the danger came from outside; the family were deceived.

#### Overrun military outpost (every run; the gateway south)

Fleshed out with Aaron, Oct 16. Items marked *(proposed)* are suggestions not yet agreed; confirm them before building (rule 10).

**As it plays now (built in Session 17, M9.4; reworked after Aaron's play-tests in Sessions 17-19; OPEN_QUESTIONS #225-256, #263-281, #304-320):** `encounters/Outpost.js`, `data/outpost.json`, `render/OutpostProps.js`, `ai/Beetles.js`.

- **The order, as Aaron set it in Session 18 (after playing it):** the arrival sweep (C-7, the Mothman's torn container, lies by the road in, beside the first helmet) → C-7's own sweep as Tom walks up to it (not from the quad, not mid-fight) → the first helmet; Wyatt asks if the machine gun nest's ammo fits Earl's rifle (**the hunting rifle's 10 rounds are in the gun pit's ammo box**, not up the tower) → the waves (2, 4, 6 on the approach after Session 17's tuning; bigger by night) with the radio in the lulls, then **the barricade's peak** (12 in three bursts out of the compound; more by night) → the compound in any order: the papers (the field report, signed CPT R. MERCER; the manifest on its clipboard), C-4 hauled open on the body in resin, the armoury's charge (its lockers against the comms hut's back wall), the crates (one breaks by itself; opening a second sets off the rest, up to 4, a beat apart), C-9 busted open (the brood's container) → **last**, Wyatt asks Tom up the watchtower to look through the scope: **the dogfight** (ready once the barricade's down; only from the tower). Each beat waits for 15 quiet seconds after the last.
- **The gun pit's machine gun** (Aaron's idea, Session 17): dead until Tom fits a battery, then 25 rounds at the nearest of the dead, every 0.6 s; it overheats (an amber light, smoke, Wyatt) and blows up (its blast hurts Tom too).
- **Working floodlights** (Session 19): the barricade's three run off **a generator at the foot of the watchtower** (fit a battery; Wyatt points it out once the fight's on); one at each gate and one at C-7 burn dusk to dawn.
- **Objectives with several map points** (Session 19): before the barricade falls, one step lists the fight, the generator, the machine gun and the gun pit's rounds, each dropping off when done; then "explore the compound" with a star on everything not yet seen to; then the checkpoint.
- **The dead can't climb the watchtower**; neither can the beetles (they mill below).
- **A retreat** never resends a wave; the witch arriving pauses the outpost's beats (escape her first).
- **Crossing:** the barricade's peak down opens the checkpoint (`outpostCleared`); south of the line, `crossedCordon` and the frontier. The plane and the craft come down where the map puts the crashed plane and the crashed UFO; smoke stands over both sites (nothing else is built there yet).

**The first build (Session 17).** Agreed with Aaron at the start: Ellen's call comes the moment the safe opens (with "come home if it goes bad"); waves of 3, 5, 8, then 14 at the barricade, tuned in play; the dead can't climb the watchtower; the plane and the craft come down where the map puts the crashed plane and the crashed UFO; bigger waves by night; a retreat resets to the last wave cleared. How the proposals below were built, and the calls made: STATUS.md (Session 17), OPEN_QUESTIONS #225-241. In short: the outpost's clearing sits on the cordon, so the barricade runs across it and the compound lies between it and the cordon (the checkpoint is the compound's south gate); the "jeep" across the barricade is an army truck for now; the crashed plane is on every run.

**Purpose.** The climax of the authored opening and the threshold between the home cluster and the randomised frontier (see Map: Fixed opening cluster). It's the moment Tom learns the cordon failed and he's on his own, so it has to *feel* like crossing a line. It's also the early game's first big fight.

**What it really was: a transfer point.** Not just a checkpoint on a defensive line. The military were moving captured entities through here, and containment failed in transit. That's why the dead are thickest at the barricade: the soldiers died trying to hold the things that got loose.

**Why Tom is here.** Ellen sends him to report that the witch has escaped containment (her sigils are turning up outside the quarantine zone). He arrives expecting soldiers and finds the dead.

**The gate: the hunting rifle.** The player can't reach the outpost without the hunting rifle, so the whole opening becomes the assembly of the loadout needed to cross the threshold. The tutorial isn't just teaching; it's equipping.

- The outpost path (step 4 of the soft funnel) opens only once the player has **claimed the hunting rifle** from the gas station safe, which needs the storm shelter's combination. So the storm shelter is required before the outpost, whenever the player does it.
- The rifle is claimed **empty**; its rounds are at the outpost, in the gun pit (as built; first designed in the watchtower), which the player reaches before the barricade (see the order below).
- Ellen's call to adventure comes when the rifle is in hand *(proposed)*. If the player has the gas station done but not the shelter, the family nudge them back to the shelter for the combination.

**Layout** *(proposed)*

- **The approach:** a road or wide trail running south from the home cluster into the cordon, a few hundred metres of forest with abandoned military vehicles, dropped gear and fallen soldiers along it. Signage warns civilians off.
- **The watchtower:** stands on the near side of the barricade, covering it, where the snipers could fire over the checkpoint. Placing it before the barricade is what lets the player get the rounds before the peak. *(As built: the rounds are in the gun pit beside it; the tower is the dogfight's vantage point. A generator at its foot powers the barricade's floodlights.)*
- **The barricade:** the checkpoint in the cordon: sandbag walls, a breached section of steel fence (the same model as the station's, reused as grim set dressing, with bodies against it), a jeep across the road, dead floodlights. The only way through.
- **The compound:** beyond the barricade. Tents, a comms hut, the armoury, and a row of **armoured shipping containers** on flatbed trucks. A south gate out of the compound leads into the frontier.

**Beat by beat**

1. **The walk out.** Down the approach toward the checkpoint, the rifle on Tom's back, empty.
2. **The first helmet.** A single army zombie in helmet and fatigues: the player's first armoured zombie. Its helmet blocks headshots, so it eats extra bullets. The first sign things have gone wrong.
3. **Waves.** The approach comes in **waves** rather than a steady stream: a quiet stretch, a cluster, quieter, a bigger cluster, so Tom keeps thinking he's through it and isn't. Each wave is more soldiers than the last, and the player works out from sheer accumulation that the base is completely overrun. No cutscene announces it. One straggler is a casualty; a dozen is an overrun.
4. **The radio in the lulls.** Between waves, Ellen and Wyatt talk: realising the soldiers are the dead, what Ellen knows about containment, what "quarantine zone" really meant. They set up the story while the player catches their breath.
5. **The watchtower.** The player climbs it for the hunting rifle rounds, at the snipers' last stand: spent casings, a dropped (damaged) rifle, sandbags. The climb is exposed, so zombies below can swarm the ladder *(proposed)*. *(As built: the rounds are in the gun pit since Session 18, and the dead can't climb the tower; it's the dogfight's vantage point and a sniping perch.)*
6. **The scope (cutscene).** The first time the player raises the hunting rifle's scope at the top of the tower, it triggers a cutscene: **a plane and a UFO in the sky, in a live dogfight, ending with both coming down** in the forest beyond the cordon. It introduces the aliens, signposts both the crashed plane and the crashed UFO as real places in the player's future, and shows the world is actively getting worse while Tom's in it. It also teaches the scope as binoculars. *(proposed)* The camera follows the scope view; the radio erupts (Wyatt: did you see that?).
7. **The barricade (the peak).** The final, biggest wave, at the chokepoint where the soldiers made their last stand and died thickest. Now the player has a loaded hunting rifle that punches through lines of zombies, just in time for the densest crowd. **Crossing the barricade is what opens the south.**
8. **The compound.** Quieter, a crime scene of the failed transfer, read off the container doors:
   - **Sealed containers** with beetles scratching inside.
   - **One holding an alien frozen in resin**, still plain grey.
   - **Empties**, doors blown or torn **outward**.
   - **One destroyed container**, torn apart from inside, far bigger damage than anything else here. A short cutscene hints at the size and horror of what was held in it (claw gouges high up the walls, a shed husk, scorch, restraints snapped) without ever naming it. **It held the Mothman**, the one major entity the military caught. The player learns that only in the Bigfoot cave, when the memory snaps into place.
9. **The beetle fight.** Caged and crated beetles the player can release, deliberately or by shooting a crate (gunfire or a blast breaks a crate open). A contained fight inside the compound: the player's **first live beetles**, teaching the armoured shell and the soft spot on the face.
10. **Looting.** The armoury locker (one explosive charge), the comms hut (the field report), tents and bodies.
11. **Through.** The compound's south gate opens onto the frontier. The game lets go of the player's hand.

**What's deliberately absent.** The witch and the Caller are not here and are not referenced. The witch was never contained; nothing here suggests the military ever held her, which keeps her deliberately unexplained.

**Enemies**

- **The approach:** army zombies in waves, mostly helmeted. *(proposed)* 3–4 waves of 3–8, building, then the barricade wave of 12–20 (config; the old "zombie nest" count moves here).
- **The compound:** beetles from the crates; how many depends on how many crates the player breaks *(proposed: 4–6 caged; at least one breaks open on its own as the player passes, so the fight always happens)*.
- **Helmets** (army variant; Aaron, Oct 16): the helmet blocks the headshot bonus. It comes off with enough damage, or a powerful enough round (the hunting rifle) punches straight through it; once the helmet is gone, headshots land normally. Army zombies drop rifle ammo, so the gauntlet both drains and refills the player's bullets: a tense push of spending to advance and scavenging as they go.

**Loot**

| Search point | Holds | Guaranteed or rolled |
| --- | --- | --- |
| The gun pit's ammo box (as built; designed: the watchtower's sniper nest) | Hunting rifle rounds (10) | Guaranteed |
| The armoury locker | One explosive charge | Guaranteed |
| The comms hut | The field report (lore document) | Guaranteed |
| The manifest's clipboard (as built) | The shipping manifest (lore document; C-7's line redacted) | Guaranteed |
| An army truck (designed: a jeep) | A battery | Guaranteed |
| Army zombies | Helmets (+20 ballistic), rifle ammo | Per variant drops |
| Tents, bodies, crates | Rifle ammo, scrap, first aid | Outpost loot table (rolled) |

**Day vs night.** *(proposed)* The approach is dangerous even by day: the dead soldiers are already here, whatever the hour. By night the waves are larger and the scope cutscene still plays (the dogfight's tracer fire and the UFO's lights read even better in the dark).

**Revisits** *(proposed)*

- Once crossed, the barricade stays open: the way south is never closed again.
- The waves, the scope cutscene and the Mothman-container cutscene happen once. Later visits have only stragglers and any beetles left in their crates.
- The watchtower stays a useful vantage point for scouting the frontier.

**Lore and dialogue hooks**

- Ellen's call to adventure (sending Tom to report) and her lines in the lulls.
- The field report (a lore document), handed in at the comms room.
- A shipping manifest on a clipboard by the containers lists contents by code, with one line redacted (built). It ties to classified document 4 (the specimen inventory, which already mentions transfer orders to the outpost).
- The resin-frozen alien and the beetles show that the government knew about the creatures long before Tom did.

**Edge cases** *(proposed)*

- The player retreats mid-wave: the waves reset to the last one cleared, and stragglers may follow toward the home cluster.
- The player skips the tower and goes straight for the barricade: the barricade wave is still beatable with rifle and shotgun ammo, but much harder, and the radio suggests the tower. The scope cutscene then plays as Tom crosses the barricade (Session 11), so he always sees the dogfight before he can reach either crash site.
- The player breaks no crates: at least one beetle breaks out on its own, so the beetle tutorial always happens.

**Performance cost.** Medium to high: the largest fight so far (up to about 20 active sprite zombies at the barricade, near the active-enemy cap), 3D beetles, two cutscenes, and the long approach. Waves keep the number of active enemies at any moment well under the cap except at the peak.

**Open questions for the outpost**

- The exact wave sizes and how hard the barricade peak should be.
- What exactly the player sees of the Mothman's container, and for how long.
- How the scope cutscene frames the dogfight and where the two crash sites appear relative to the outpost.

#### Bigfoot cave and the Mothman fight (every run; story spine, beat 7; moved north)

*Designed with Aaron, Nov 8; not built. Replaces the earlier design (a middle-band cave with the Mothman as its only boss fight).*

**The family's plan.** With Junie back, the family make a plan around the capsule's nature spirit, and realise: what if it's the Bigfoot Earl was tracking? Earl's life of being laughed at turns out to be the key; his diary and the Home of Bigfoot store are vindicated.

- **Finding the cave:** Earl's maps of the north ridge, with his sightings marked, are already in the storm shelter (its Bigfoot evidence). The family use them to work out where Bigfoot lives.
- **Why Bigfoot hasn't helped:** the Mothman has him pinned in his cave.

**The cave's location** (a map change). The road past the gas station runs north as well as south; north it ends at a **ROAD CLOSED** barrier. **Just south of that barrier is Bigfoot's cave**, near Earl's store: that's why Earl saw Bigfoot so often and opened the shop there. The entrance is **hidden behind brush** until the story calls for it; Tom clears it with the dozer. It's a walk-back payoff: the answer was by the gas station all along.

**Getting the dozer.** The time capsule talks of the severed forest and the cleared strip. Tom follows the military's **cordon strip** to find the military's dozer, the machine that cut it, parked where the clearing crew stopped (open: which end of the strip). It has a **grappling hook and winch**.

**Stage 1: the bug zapper at the station** (a night fight, a set spot):

1. Tom brings the dozer home. Prep: the fence charged to full (1000, thanks to the plane's alien cell).
2. At night, flares are fired in a cutscene to call the Mothman into the station's cleared ground.
3. **A family battle:** Wyatt gives sniper cover from the tower with the rifle. *(Proposed: Ellen runs the floodlights to blind it on its dives; Junie, just back, calls out where it's coming from.)*
4. Tom hooks the Mothman with the dozer's grappling hook. On the winch it thrashes and flies around but can't escape, and Tom shoots it.
5. After enough damage, a cutscene: it falls onto the electric fence and gets **zapped like a bug**. The fence's charge is drained to zero. It doesn't die.
6. Wounded, it breaks free and flies off toward the gas station. Ellen connects its flight path with Earl's maps: it's hiding in Bigfoot's cave.
7. **The cost:** home is defenceless with the fence at zero, so Tom has to recharge or finish the job fast.

**Stage 2: the cave.** Tom bulldozes through the brush to the entrance. Walking in loads a small **seeded** interior (tunnels and chambers; dark, so the flashlight matters). The tunnels are full of the **Mothman's eggs, with beetles hatching all around**: a nest closing in. Deeper in, through the Mothman's lair (**giant moths** again, first met in the mineshaft), in the final chamber, Tom fights the wounded Mothman and kills it. **Bigfoot is found wrapped in a silk cocoon** (moths spin cocoons, not webs), as if kept for later; Tom cuts him free. The final chamber's details are still to be designed.

- **Aesthetic (kept):** a lived-in home with Bigfoot's handmade jewellery, beadwork, woven items, carved tools and totems in his own style, showing he's a person with a culture, a tool-user, connected to the people who were on this land longest.

**The reward.**

- **Once the Mothman is dead and Bigfoot is free, the Caller is out of the game for good.**
- **The Blessing:** Bigfoot gives Tom his sigil, which **Tom buries himself back at the ranger station** (hold interact at the base of a tree inside the compound): +20 security, permanent, never drains, can't be removed; weak zombies avoid or slow near the station; its own line on the forecast. **It boosts the comms**, so the family can reach Tom however far south he goes: the land's protection clears the interference, and the real voices coming back is a big emotional reward.
- **Nature armour** from Bigfoot (kept from the earlier design; +40, one-off).

#### After Bigfoot: the missing quad and the mega night (story spine, beat 8)

*Designed with Aaron, Nov 8; not built.* With Bigfoot free, the witch answers with her biggest attack yet, and the station's need for the alien ship's big core becomes urgent.

**The quad goes missing.**

- Earl's quad quietly disappears from where Tom parked it when he takes the dozer: **the greys take it**.
- From there the story chains beats that use the dozer (home for the fight, then the brush at the cave), so most players won't notice the quad is gone.
- For players who do go back: clues at the empty spot (a scorched ring in the grass, strange tracks), and its orange map icon is gone.
- After Bigfoot, the story sends Tom to fetch the quad, and he finds it missing. He doesn't chase it: with the stakes this high, the quad isn't his priority.

**The mega night** (the witch's answer).

- On the way home from the empty spot, the radio erupts. With Bigfoot free, the Caller gone and the land pushing back, the witch throws everything at the station.
- **About 150 zombies** attack the base: the big horde night Aaron has wanted all along.
- **The new zombie types debut** (the Hollow, the Screamer, the Hanged; see Enemies: Zombies), then join the normal mix. The difficulty rises from here.
- **Ellen's ask:** after the night, Ellen says they won't survive another like it. They need another alien power core, a big one. She sends Tom to find the downed ship.
- **The quad's return:** Tom finds it rebuilt as the alien quad inside the ship, a bonus while he's after the core, not his reason for going.
- Open: how 150 zombies fit the performance budget (the active-enemy cap is about 25; the marches and sim tiers will need a plan).

### Middle band

#### The Caller (story spine, beats 3 to 7)

*Designed with Aaron, Nov 8; not built. **Replaces** the earlier design (a portal creature with a too-tall, too-thin silhouette, 0–2 night events a run, radioing home to check whether a call is real).*

- Based on the Appalachian superstition never to answer when your name is called from the trees.
- **It isn't from the portal.** It belongs to the forest's own old story. It comes **where the forest is severed**, and it's kept at bay by the nature spirit's (Bigfoot's) good magic.
- **It came before:** when the town cut a long strip of trees for the railway, severing the forest. People went into the trees and never came back (the time capsule's 1903 accounts).
- **It's back now** because the military's clear-cut strip for the cordon severed the forest again.
- **It has no physical form, only a voice.** You can't shoot it and can never be sure where it is. At most, fog that moves when it shouldn't. **No silhouette.**
- **It hunts by imitation**, using the family's voices (and Tom's, to lure the family out: see Junie is taken).
- The scar and the fence stay story background. They need no mechanic of their own; the idea of a dozer reconnecting the forest was dropped.
- **It ends with the Mothman:** once Bigfoot is freed, the Caller is gone for good.

**Comms in the south.** Once Tom is far enough south, Ellen says interference means their comms can't reach him. From then on, **any voice on the radio down south is the Caller**, taunting Tom in the family's voices. The player knows it's fake, so hearing Junie beg and having to ignore it is dread rather than a guessing game. The stretch is properly lonely. **The Blessing ends it:** once it's buried, the family can reach Tom however far south he goes. *(This replaces radioing home to check whether a call is real.)*

- Open: the Caller's taunt lines; whether the Caller is ever seen at all (leaning no).

#### Time capsule and the old church (every run; story spine, beat 4)

*Designed with Aaron, Nov 8; not built.*

- Tom heads south looking for Junie and finds **the old church** with the time capsule buried there. A weathered plaque; dig it up with the shovel.
- **The plaque** (wording to polish): "Should the voice in the trees ever call again, open this. We have set down what we learned." The town buried a warning on purpose; "open in 100 years" (1903, so due in 2003, the year of the game) was cover.
- **Inside:** the 1903 town's account. The railway severed the forest, the Caller came, and their people were taken to the place beyond. They never got them back.
- **How they stopped it:** they reconnected the separated land to the great nature spirit (they have their own name for him). **Where he is, the Caller isn't.**
- It gives Tom the method and the next goal. The 1903 town never got their people back; Tom will be the first.
- **Still true from the earlier design:** the forest was already a thin place, which may be why the government built here; Ellen links it to the classified files (document 1's "thin site").

#### Stairs in the woods: the place beyond (story spine, beat 5)

*Designed with Aaron, Nov 8; not built. **A spike is (Session 22, M10.3: the debug menu's Spikes; "Build plan: the M10.3 spikes").*** **Replaces** the stairs' earlier design (2–3 a run, each a short first-person vision).*

- Based on the modern ranger legend of free-standing staircases deep in the forest that rangers don't talk about. A lone staircase in an off-path clearing, attached to nothing.
- **Climbing it takes Tom into an extra-foggy, alternate version of the forest:** the place beyond.
- **Generated procedurally** (not a set map). Every clearing has **four paths**, north, south, east and west:
  - one is the path he came in by;
  - **two have Junie's voice calling from them;**
  - **one is silent.**
- **Take the silent path three times in a row** to find Junie and bring her out.
- Taking a calling path **loops him back to the start**, three right choices away again. Nothing kills him there; it costs time and nerve.
- It's the Appalachian rule turned into the puzzle: **never follow the voice calling your name.** After a game of the Caller using Junie's voice against him, walking toward the silence is the hard and right choice.
- **Junie comes home. Settled: she survives.**
- Open: what the place beyond looks like; whether other staircases still appear on a run.

### South band

#### Crashed UFO and the mothership (every run; story spine, beat 9)

*Designed with Aaron, Nov 8; not built. Built so far: its clearing is placed on every run, the dogfight's craft limps south and comes down there, and smoke stands over it; the grey alien's model and cowboy-drift kit. **Replaces** the earlier design (a hand-built ship interior on the ground, enterable from night 5, its shield locking the exit until the core is taken).*

- **The crashed ship is only the door:** Tom heads further south and finds it in its clearing. Its **beam takes him up to a mothership** high in the atmosphere, never seen from the ground. The open sky stays believable on clear days; you only reach it through the crashed ship's beam.
- **Inside**, Tom takes **the big power core** and finds **Earl's quad rebuilt as the alien quad** in the hangar.
- **The way home:** back down the beam, the same way he came, with the core and the quad, to the crash site.
- *Considered and dropped:* riding the quad off the hangar and re-entering from space. Too over the top for the game's grounded horror tone.
- **Look and enemies (kept):** a complete change of art style (clean metal, purple and green light, alien geometry), with the cowboy-drift greys, more Americana the deeper Tom goes. Loot: the core, alien shields, med kits and shells. One visit.
- **The Day 1 red light is the UFO** (a change): the small red light Tom sees far to the south from the tower on Day 1 is the UFO itself, hovering there before the dogfight. It's the same craft the patrol plane later chases and shoots down. Nothing in the sky needs adding afterwards. (Today Ellen calls it "a training exercise, they told everyone"; that line can stay as her guess.)
- Open: the mothership's interior and beats (the cowboy greys, the core room, the hangar).

#### The Car Armory, Sheriff and the ute (every run; story spine, beat 10; moved south)

*Designed with Aaron, Nov 8; not built. **Replaces** the earlier north-frontier design (a truck with a portal opening onto a government base full of Men in Black); its loot and the restocking explosives crate are kept.*

**The Car Armory** is now a late, south-band story beat, not a north-frontier stop. It's the government's supply point near its main teleporter: another military-style outpost, this time **mixing alien and human technology**.

- The government's teleporter is a **crude copy of the alien tech** Tom has just used on the mothership, so he recognises it. The armoured truck with a portal in the back fits this.
- An echo of the outpost: the first moved monsters; this one supplies the portal programme.
- **Knock-on:** the turret now arrives late. Accepted, since the mid-game has plenty in it now.
- **Loot (kept):** large one-time stocks of every ammo type, first aid kits, scrap, body armour; **the game's one turret**; **an explosives crate that restocks** (the only revisitable restock); classified documents.

**Who's there.**

- **Mostly dead:** the base is overrun by **Men in Black zombies** (zombies got through the portal and took it). This keeps the forest empty of people.
- **A few paranoid survivors** are barricaded deep inside and shoot anything that moves. To them Tom is a witness, not a hero: their job was the cover-up, and his clearing up the forest threatens it. They give the base a **stealth section** and a human face for the cover-up.

**Sheriff, the friendly alien.**

- Held in the base: a grey who is friendly. Where his crew took on the outlaw side of the Old West (black hat, territorial, hostile), he took the lawman side: white hat, a tin star, community, kinship, standing up for what's right. **He calls himself Sheriff and acts like one.**
- **His story:** he broke from his own kind and started helping the Men in Black, but they caged and studied him (like the resin specimen at the outpost). He's learned the humans running this are no better than the aliens he left. Tom is something different.
- **Tom frees him.**

**The escape: the ute.** Freeing Sheriff sets off the alarms. The base and its zombies pour after them. Tom drives the ute out of the motor pool while **Sheriff mans the turret in the tray: a big turret chase** with a ton of enemies. This answers where the ute comes from. Sheriff is injured in the escape and can't ride in the ute again; afterwards Tom mans the tray's gun himself (as built: Y climbs into the tray).

**Afterwards:** Sheriff moves into the station's new **garage** (see The ranger station: the garage).

- Open: the base's layout and stealth beats, the survivors, Sheriff's lines and look, the upgrade list and costs. (Naming: Earl's diary has a human sheriff who "laughed me out of the office"; check the two don't clash.)

#### The endgame: the killdozer, Ground Zero and the portal (every run; story spine, beat 11)

*Designed with Aaron, Nov 8; not built. Built so far: the cold open's CCTV cutscene of the portal and the Men in Black.*

**Ground Zero (kept).** Where the portal programme went wrong. A wide crater with a shattered metal ring at its centre, **still holding a shimmering, humming field: the portal is stuck open**. A cracked control bunker, wrecked trucks, cables, toppled floodlights. Reality anomalies (gravity hiccups, sound dropping out, time skips that cost daylight, flickers of other dimensions). A few Men in Black. The programme's final documents (6–8).

**The portal and the witch are linked.**

- The next big story point after Sheriff: **go to the portal at Ground Zero and shut it down.**
- The lore already fits: the shutdown documents say the field seems held open from the other side, and the last log line is a woman walking out of it.
- **Tom must go through the portal to break what's holding it open**, which is tied to the witch. *(Proposed: her hut or her heart is the anchor on the other side.)* This is the first part of bringing her down; she is the final boss.
- *(Proposed)* The portal is powered by several alien cores and heavily defended.
- Breaking the anchor puts out the **witchfire ring round her hut** (see The witch: destroying the hut).

**The killdozer.**

*Spike (Session 22, M10.3): three parts bolt on today from the debug menu (a spiked ram, armour plating, a head saw), each a look and a few multipliers; see "Build plan: the M10.3 spikes".*

- When it's clear Tom has to go through the portal, Sheriff says he'll need a really powerful vehicle and offers to **upgrade the dozer into a killdozer**.
- **The optional encounters give its parts.** Each optional encounter yields its own upgrade material, so the encounters the seed spawns decide the killdozer's final abilities (one run might have a flamethrower and armour plating, another a ram and a turret). **Designed so far (Nov 8):** the flamethrower (moonshiners' holler), armour (railway cutting), the head saw (sawmill), a ram (mineshaft); Milo's open (see Optional encounters).
- *(Proposed)* Sheriff guarantees a **base killdozer** that can always finish the portal; the encounter parts are bonuses on top, so no seed is too weak.
- **The other side is seeded too.** The seed decides what happens beyond the portal: which enemies Tom meets and in what order. So both the endgame's challenge and the build that meets it differ every run. *(Proposed: the seed loosely pairs threats with parts, so a run full of swarms tends to roll the flamethrower.)*

**Inside the portal: the realm of stories.**

- **The dungeon:** procedurally generated like the place beyond, but not a forest: a broken other-dimension look *(proposed: red sky, floating rock, witchfire)*. Where the place beyond was a quiet test of nerve, this is **ridiculous combat**: each room a big arena Tom ploughs through in the killdozer. Whatever spare budget the game has left (draw calls, enemies) goes here. It ends in a room where Tom **breaks the anchor** holding the portal open.
- **What the dimension is:** a realm shaped by human stories. It fits the idea that legends were glimpses of the other side: the Mothman, the Martians and the rest take the shapes people imagined. **Keep the witch ambiguous:** older than our stories, so she stays unexplained.
- **The family's imagination** (scripted moments): when the carnage overwhelms Tom, the family imagine things to help him, and those things appear in the realm. They reach him over the radio (the Blessing boosted the comms). It brings the family, who can't fight, into the final push, and echoes the Caller using Junie's voice against Tom, now turned to his side.
  - **The rule:** they can only imagine things they've seen be real, things Tom brought home or told them about. So the help is a callback reel of the run (e.g. Wyatt imagines the outpost's machine gun nest; Ellen imagines the electric fence crackling to hold a wave back).
  - **Limits:** no infinite power. Each one lasts a short while (belief is fragile under pressure).
  - What Tom actually found in his run decides what they can imagine, so it stays seeded too.
- **Bigfoot answers Junie.** Bigfoot is real, so Junie doesn't imagine him: **she calls him, and he answers.** Beast mode (Aaron: like Aslan, "not a tame lion"; Earl's diary called him gentle, and gentle isn't tame): a roar that knocks the whole horde flat, then he tears through them, maybe ripping up a tree to swing. The peaceful giant shows what he's worth. A goosebumps moment.
- Open: the witch's scripted beats, the list of optional encounters and their parts, the final battle after the portal.

#### Witch's hut (fixed; story spine, beat 12)

**Built** (M7; its look Session 13). *Designed, Nov 8, not built: an impassable witchfire ring round it until the portal's anchor is broken.* As built: a taken settler's log cabin, leaning, witchfire leaking through boarded windows, a porch whose rocking chair rocks by itself when Tom's near, totems and a fire pit; blown apart and burning after the charges. Her traps line the approach. See The witch: destroying the hut and the final battle.

### Optional encounters (Aaron, Nov 8)

*Designed with Aaron in a voice call, Nov 8 ([Witch Hunt — Milo's barn (optional encounter)](https://claude.ai/artifact/VtxTRYZ716JQcK63NEmtJq)); none built.* The optional encounters are **seeded**: the seed deals out which appear and where, around the fixed story spine. **None of them guarantee anything**, so some runs are strong and some are harder, but none should feel weak. Each gives its own **killdozer part** (see the endgame), and some give a weapon or tool.

**Rules agreed along the way:**

- **The pool, strongest first:** the moonshiners' holler, the railway cutting, the sawmill, the mineshaft, Milo's barn, the Flatwoods landing, the National Guard convoy, the Men in Black listening post, the Headless Horseman bridge. Nothing is cut yet; the list will change. The last four are names only so far.
- **Killdozer parts** are worked out per encounter as they're designed.
- **No flamethrower for Tom.** It's a killdozer part only (Aaron finds flamethrowers tedious in shooters).
- **No fuel anywhere in the game.** Nothing else uses it, so the chainsaw doesn't either.
- **No anti-logging message.** The sawmill is an honest working place; the Caller's story is about two specific cuts (the 1903 railway and the cordon strip), not logging.
- **Dynamite is not a hut charge** (see The witch: explosives).

| Encounter | Rank | Weapon or tool | Killdozer part |
| --- | --- | --- | --- |
| Moonshiners' holler | 1 | The wire cutters (tool); *proposed:* the auto shotgun | The flamethrower (the still's copper coil) |
| Railway cutting | 2 | The railroad spike maul (melee); dynamite | Armour (the cowcatcher and boiler plate) |
| Sawmill | 3 | The chainsaw (melee); the SMG (on the dead Men in Black) | The head saw on the blade |
| Abandoned mineshaft | 4 | Dynamite | A ram (the rock drill head) |
| Milo's barn | 5 | None | Open (placeholder: his spinning target board; the saw went to the sawmill) |
| Flatwoods landing, National Guard convoy, Men in Black listening post, Headless Horseman bridge | 6–9 | Not designed | Not designed |

#### Moonshiners' holler (optional; rank 1)

A quiet trap puzzle, a break from the busier north. Serious in tone.

- **The holler:** a hidden still down a dark, narrow hollow, entered on foot. The family trapped it against revenue agents: they took the lights over the government land for the law coming for the still.
- **Readable traps:** fishing line glinting in the torch beam (a shotgun bolted to a stump), tin cans on wire (an alarm that rings in the dead), a bent sapling held by a peg (a spring snare), leaves piled too neatly (a bear trap).
- **Disarm or use them:** hold X to disarm, or trigger one on purpose on the dead chasing Tom. The turned family can be led into their own traps.
- **The wire cutters:** found here, a new tool on the tool belt.
- **The family's trap map:** found halfway in, read in close-up. It's out of date: a couple of traps aren't on it, so Tom still has to read the ground.
- **The turned moonshiners** wait at the still.
- **The still, the last puzzle:** still running, nobody tending it, its gauge in the red. Shut it down with the valves in the right order, or it blows and the part goes with it.
- **Gun:** *proposed*, the auto shotgun (a paranoid family's stockpile). Not yet confirmed.
- **Killdozer part:** the still's copper coil and fuel, made into **the flamethrower**.

#### The railway cutting: the 1903 line (optional; rank 2)

- **The line is part of the map on every run** (see Map: Structure); the encounter is seeded: where the cutting sits along the line changes with the seed. Other encounters spawn around the line.
- **The cutting:** the last train of 1903, a rusted locomotive and carriages swallowed by the forest, abandoned the night the town's people were taken. Quiet, eerie, full of old belongings.
- **The radio:** left out for now, to handle deliberately with the Caller's part of the story.
- **Weapon:** the **railroad spike maul**, a heavy sledge for the melee slot: slower than the shovel, hits much harder.
- **Dynamite:** an old powder store from blasting the cutting holds sweating dynamite, the game's first handheld throwables.
- **No gun.**
- **Killdozer part:** the locomotive's **cowcatcher and boiler plate**: armour.

#### The sawmill (optional; rank 3)

- **The story:** the government hired the mill's loggers to clear ground for the portal programme (Ground Zero, and maybe the cordon strip). They saw too much, so the Men in Black silenced them as witnesses. Tom finds a crime scene: dead loggers, and Men in Black bodies where the loggers fought back. **The SMG** can be found on the dead agents (Aaron, Nov 8: wherever there are dead Men in Black); the lore of what happened here is still to write.
- **A logger's diary:** at first giddy that the government agreed to every number, triple rates, no haggling. Then no paperwork, no payroll office, men told not to talk to their families. The last entry: of course they agreed to any price. Dead men don't get paid.
- **Weapon: the chainsaw** (melee slot; Evil Dead 2 is a reference). No fuel. Balanced by **noise** (it pulls every zombie nearby), **slowing Tom while it revs**, **overheating** if held too long, and a **sharpness gauge**: as the chain dulls it cuts slower, and Tom sharpens it at a **workbench at the station**, there from the start, for a little scrap.
- **Killdozer part:** the mill's **head saw** on the front blade, shredding whatever it pushes.

#### Abandoned mineshaft (optional; rank 4)

*Replaces the earlier design (a short tunnel with zombie miners, beetles and one charge).* The Mothman's origin, now a big set piece.

- **On arrival:** the mine's side office and equipment on the surface.
- **The cage lift** down is dead until Tom fits a battery. Then a creaking ride, ridiculously deep.
- **The turret cart:** a mine cart with an old mounted gun, like the ute's turret. It rattles down the rails through the tunnels while Tom shoots zombie miners, beetles and **giant moths**.
- **Giant moths, a new enemy:** first met here, and met again in the Mothman's lair in the Bigfoot cave before Bigfoot is freed.
- **The bottom:** the seam where the Mothman came through, the **giant torn cocoon** he hatched from, and the miners' explosives, packed but never fired, with a plunger.
- **The ending:** Tom presses the plunger (or hooks a battery to it), and a short fuse gives him time to get back in the cart. The cart grinds back up and out; a cutscene shows the fireball roaring up the tunnel behind him. The blast seals the seam and the cavern but not his tunnel, and Tom escapes unharmed.
- **Lore (kept):** the foreman's logbook (the seam that glowed and hummed, the tall red-eyed thing that came out of it).
- **Loot:** dynamite (replacing the charge it used to give).
- **Killdozer part:** the **rock drill head**, a ram.

#### Milo's barn (optional; rank 5)

*Replaces the earlier "Old barn (Milo the Clown)" design.*

**The idea.** Milo is the knife thrower from Aaron's story **The Lone Clown**, hosted on the same website as the game. In Witch Hunt he's **alive, in his barn, and permanently in full clown mode**: long arms, a green wig, the painted grin, chaotic dancing, bounding, bubbly and chuckling. He never drops character, so to most players he reads as an otherworldly entity, maybe something from the portal. **Anyone who has read the story knows the truth: he isn't from the portal. He's the guy from the story**, out in the forest doing his own thing, rehearsing his act while the apocalypse happens around him.

- A comedy break from the game's serious tone; ranked strongest of the optional pool when it was designed (now fifth).
- The one living person in the forest besides the family and the Car Armory's survivors.
- **Kept ambiguous on purpose:** human, or something else? Some things he does are impossible, and the reveal only explains part of it.

**The approach.**

- **The barn sits ringed by the dead:** bodies everywhere around it, as if he's been holding off a siege by himself.
- When Tom arrives, Milo is **killing zombies with thrown knives**: bounding, dancing, chuckling. **He never attacks Tom.**
- **The car gates (cutscene).** Two abandoned cars are parked nose to nose across the lane. Milo grabs both near the bonnets **with one hand** and swings them open like gates, bows, beckons Tom through, then slides them shut behind him. Polite, welcoming and completely impossible. A callback to the story, where he pushes Claire's car with one hand.

**The act: hold still.** Inside, Milo invites Tom onto the platform in front of his board for three knives.

- **Hold still for all three throws** and the act succeeds: Tom earns the **killdozer part**.
- **The third knife** passes just over Tom's head, like the story's last knife.
- After the third, Milo breaks character for one line in his normal, warm voice (*proposed:* "Three for three. You didn't flinch."), then goes straight back to the clown.
- **Shoot at him at any point** and the shot fails the moment Tom pulls the trigger: it misses, or **Milo deflects the bullet with a knife** (otherworldly, and funny). He gives the **"I was in character!"** speech, the story's line, and **throws Tom out of the barn. No reward.**
- Milo can't be hurt.

**The reveal: come back in the morning.** If Tom held still and comes back **the next morning**, Milo is outside the barn as **just a man**: flannel shirt, jeans, face scrubbed clean, no wig. He hands Tom a tin mug: **"Instant. Sorry."** He's a man with a donkey, in character the rest of the time, and that's why all of it happens. The car gates stay unexplained. It pays off "make the walk back matter" (see Ideas for later).

**Comedy beats (all agreed).**

- **The donkey stares at Tom** through the whole act, and later turns up staring from the treeline near the station. Never explained. (In the story the donkey never looks away and never forgives.)
- **Milo tidies the dead:** stacks the bodies in neat rows and sweeps the straw between kills.
- **A hand-painted sign:** "SHOW TONIGHT. ALL WELCOME. NO FLINCHING."
- **The turkey gives Tom an Aunt June look.** Ellen, watching on camera: "Why is that turkey judging you?"
- **The family's reactions over the radio:** Wyatt thinks it's the coolest thing ever; Ellen is quietly horrified.

**The barn (from the story).** A donkey, a Shetland pony, a python in a glass tank under a heat lamp, an enormous turkey, and a wall full of knife holes in the outline of a person. Clean straw, full troughs: he loves these animals.

- **Open:** his killdozer part; the exact wording of his lines (the clown voice and the one warm line); the year (the story has a 2009 Civic and mentions 2019, and the game is set in 2003; *proposed:* Witch Hunt happens years before the story, so the donkey could be the same one); whether the family can imagine Milo in the realm of stories if Tom met him; where the barn sits (any band).

### Interiors (shared system)

*Built, Session 21 (M10.2), with the storm shelter's room on it. The rest are designed, not built.*

**As built** (`world/Interiors.js`, `ui/InteriorHud.js`; `config.interiors`):
- **Entering loads the interior:** its space is built and placed in a pocket **1200 m under its entrance**, beyond every draw distance, so none of the forest is drawn while Tom's inside (the shelter's room: about 28 draw calls, against about 100 outside). Leaving unloads it. Tom is still "at" the entrance on the map (the minimap, the fog of war, which clearing he's in).
- **The main map keeps simulating in the abstract tier:** every zombie not in the interior with him drops to it (spaces compared in the tier pass); nothing outside sees or hears him; what he hears from outside comes through muffled (30%).
- **Its own light:** no sun or moon; its ambient by the hour (the shelter: daylight down the hatch by day, dim at night: the torch matters), its own fog, no ground mist; the torch glares off its floor, ceiling and walls, not the trees overhead.
- **The clock keeps running and shows on the HUD** (top left): where he is, the day, the time and how long until dusk or dawn.
- **Leaving returns him to the entrance.** A save made inside (the dawn autosave, Save and quit) puts him outside it.
- An interior is a definition (its entrance, its space's builder, its floor, where he arrives and leaves, its light): the cave, the mothership, the Car Armory's base, the place beyond and the realm of stories plug in the same way.

- One interior-map system: entering loads the interior, the main map keeps simulating in the abstract tier, the clock keeps running (visible on the HUD), and leaving returns the player to the entrance.
- **Bigfoot cave:** generated from the run seed out of tunnel and chamber pieces on a grid.
- **Car Armory's base and the mothership:** hand-built, the same every run (scripted beats: the stealth section, Sheriff's cell, the core room, the hangar, document placement, patrol routes).
- **The place beyond (the stairs) and the realm of stories (the portal)** *(Nov 8)*: procedural, generated from the run seed; the place beyond as foggy forest clearings with four paths each, the realm as combat arenas for the killdozer.
- **Mineshaft and storm shelter:** small hand-built spaces.

## Story and lore

### Backstory

- **The mishap:** a well-funded government programme built portals into other dimensions. It went wrong at Ground Zero, the portal is stuck open, and entities have spilled into our world.
- **Americana made real:** the creatures on the other side are the creatures of American folklore: the Witch of the Woods, the Mothman, the Martians. Human legends were distant glimpses of their kind. **The other side is a realm shaped by human stories** (Nov 8): its creatures take the shapes people imagined; the witch is older than our stories and stays unexplained.
- **The Caller is the second exception (Aaron, Nov 8):** it isn't from the portal either. It belongs to the forest's own old story, comes where the forest is severed (the 1903 railway, now the military's cordon strip), and is kept at bay by Bigfoot's good magic (see Encounters: the Caller).
- **Bigfoot is the exception (Aaron, Oct 16):** he did not come through the portal. He has been in these woods at least since the gas station owner's first sighting in the late 1980s, and in truth far longer than any of them: a true nature spirit native to this land, long before the programme (see Ideas for later).
- **Why this forest:** it was already a thin place (the time capsule, the stairs), which is why the government built here.
- **The 1903 town** (Nov 8): when the railway severed the forest, the Caller came and their people were taken to the place beyond. They stopped it by reconnecting the land to the great nature spirit, and buried a warning in the time capsule.
- **The cold open** shows only Ground Zero and Men in Black. Everything else is a surprise.

### The witch's story

- A powerful magical entity that came through the portal, in folk-horror Woods Witch form: sticks and bone, hand-prints, ritual marks, witchfire, a hidden hut. Eerie and rooted in the forest, never sci-fi.
- **Deliberately unexplained.** No name, origin or motive is ever given. The lore offers hints, never the final answer. The mystery is part of her menace.
- **Why she must be stopped:** she is raising the dead, and the outbreak spreads like a virus through the forest and beyond. It won't stop while she lives. (Gameplay is unchanged: zombies come from her sigils; there's no infection mechanic.)
- **Her sigils are stolen:** corrupted versions of the land's own protective warding marks.

### Native American influence (handled with care)

- The villain is the outsider witch, never an Indigenous figure. The protective, rooted force that helps the player is centred on **Bigfoot as the forest's guardian** and the oldest rightful presence here. The Blessing reads as old protective land magic.
- **Invent, don't copy:** never name a real nation or reproduce real sacred symbols. Design an original, reverent visual language. Nothing Indigenous-coded is ever an enemy, a trophy or loot from a body.
- **The three-sided story:** the family are newcomers posted to the station; the witch is a true outsider; the protective land magic is the oldest presence.

### The family

The Hale family. **Tom** (the player, a silent park ranger), **Dr. Ellen Hale**, **Wyatt** (about 14) and **June "Junie" Hale** (about 9).

- **Ellen, the scientist.** She worked on the edge of the portal programme, reviewing transmissions the research picked up from the other side, and what they heard was routinely not good. She starts with a rough idea of what might be out there without ever having seen it, and explains the science. Classified documents feed her most.
- **Wyatt, the one who steps up.** Older, more capable; in the vein of adventure-movie kids who rise to the moment. Brave and practical; backs his dad up and holds the station down. His lines lean to the base and the fight.
- **Junie, the little helper.** Younger, sticks close to her brother; he protects her, she backs him up. She notices small things: her lines surface observations the player may have missed (crows at a sigil ground, the scarecrow in a different furrow, a radio call that sounded wrong). Quietly useful, never a hint button.
- **The family arc:** a family holding together under pressure. **No trouble ever comes from a family member**; the danger is always outside.
- **Junie is taken and brought home** (Nov 8): the Caller lures the family out with Tom's voice while he's knocked out at the crashed plane, and Junie doesn't come back; Tom brings her out of the place beyond. Settled: she survives. In the realm of stories she calls Bigfoot, and he answers.
- **The family in the endgame** (Nov 8): Wyatt on the tower in the bug-zapper fight; in the realm of stories, the family imagine help from things they've seen be real (see Encounters: the endgame).
- **Tone:** serious. They're frightened for their lives. Very little comedy in their lines; the game's humour (Milo, the cowboy aliens) lives in the world.
- They shelter in the comms room. By day the player can talk to each of them (hold interact).

### The radio

The family run the station's radio and trail-camera network, so they stay part of the game while Tom is out.

- Calls play as subtitles with a radio crackle; the player keeps full control.
- **Comms in the south** (Nov 8): far enough south, interference cuts the family off and any voice on the radio is the Caller, until the Blessing is buried (see Encounters: the Caller).
- **They radio about:** the dusk forecast, the base alarm, milestones (the fifth sigil, a document decoded, a light to the south), lore and character moments.
- **CCTV patch-through:** when a camera catches something, they patch the feed to Tom. Most mid-run cutscenes are framed this way.
- **Witch sightings are limited on purpose:** trail cameras sit at fixed spots (config, 5–6 in the north and middle). They report her only if she passes one, after a delay, and the map marks the camera, not her. A lead, never a tracker.
- Calls are rate-limited (config): calls of one kind at least `kindGap` apart, any two at least `minGap` apart, urgent ones cut in. A one-off call that has to wait queues for a while; a repeatable one is dropped (M8).
- **Trail cameras as built (M8):** six seeded posts at clearing edges in the north and middle, numbered north to south, on both maps. She's reported 25-60 s after passing one while she's out; the map marks that camera (red, blinking) for four minutes, and the clip goes on the comms room's monitors. The family's sighting lines are still to be written (a notice stands in). M9.1 (Session 14): camera six is fixed at the storm shelter (#153), the same every run, and the five seeded cameras are all in the frontier.

### Dialogue system

- One data file of lines (id, speaker, text, conditions, priority) shared by family talk, radio calls, creatures and cutscene captions.
- **Conditions:** night number, milestones (prizes, first sigil dug, witch wounded, hut found, encounters visited, documents handed in), current state (base damaged, zombie level 4+, low batteries).
- Talking picks an unheard line whose conditions are met, newest milestone first; otherwise an idle line. Heard lines are saved.
- **New-line marker:** a small marker floats over a family member with something new to say.
- **What lines do:** piece things together in step with the player; drop gentle hints; explain oddities (e.g. Wyatt on why aliens carry shotgun shells); build character.
- **As built (M8, Session 12):** `src/data/dialogue.json`. A line has an id, speaker, channel (`radio`, `face`, or `caption`), text with `{names}` a system fills in, `when` (night range, phase, `all` and `none` flags), priority, `on` (an event that plays it), `next` (the line that follows it straight away), `repeatable`, the radio's `kind` and `urgent`, and `script` (a scripted sequence's lines play from their triggers only while it's live: Day 1's until M9.2 wires them). Milestone flags come from events (`config.story.milestones`) and lore hand-ins (`lore.<id>`). A `face` line heard while Tom isn't in the cabin comes over the radio. Talking to the family: hold interact while looking at one of them **in the comms room**. Nobody has idle lines yet ("has nothing new to say" shows instead).
- **Added in the opening's sessions (15-19):** about 158 lines in all (most of the opening's, many still marked `draft`); `cued` lines that only a system plays (never picked by talking); `Dialogue.playLater()` so one idea is said at a time; the family only offer a talk when they've something new; **breadcrumbs**: stuck on an objective a while, the family's `hint.<step>` line, once; on-screen control hints in their own slot as each control is first needed. Cutscenes speak as they play, except the dogfight, whose lines come after it.

### Dialogue presentation (no voice acting)

- All dialogue is subtitled, never voiced.
- **Talking bob:** the speaker bobs slightly (or a two-frame mouth movement for 3D characters) while their line plays.
- **Subtitles:** pixel font, speaker name above, on a dark strip at the bottom centre. Advance on a button or after a readable delay.
- **Blips:** a retro blip per letter or word, a different pitch per speaker.

### Lore sources

- Family dialogue (face to face and radio).
- **Classified documents** from the government base (5) and Ground Zero (3): 8 in total, listed below.
- Found items: the camcorder (campsite), Earl's note (gas station), the gas station owner's diary and trail-cam tapes (storm shelter), the pilot's log (crashed plane), the foreman's logbook (mineshaft), the field report and the shipping manifest (outpost), the time capsule.
- Each item is handed in at the comms room and unlocks family lines.
- **Papers in close-up** (Session 16, `ui/PaperNote.js`, `data/papers.json`): a note, a ruled diary, a typed report or a manifest read over a darkened view (the world and the clock wait), pages turned on the D-pad, taken with A on the last page. Handed in, they're listed under THE PAPERS on the ledger's Monitors page to read again.
- **Tapes and feeds** (Session 16, `story/WatchQueue.js`): the campers' camcorder, camera six's feed and Earl's tapes wait under the hint slot ("D-pad down: play the camcorder") and play when Tom presses it.
- **As built (M8):** `src/data/lore.json` lists each item by name and where it's found (the texts are written with Aaron in each encounter's session, which also places the pickup). Items are handed in on the ledger's **Monitors** page. Each sets the flag `lore.<id>`, and one with a clip puts it on the monitors. The monitors keep every clip seen (trail cam sightings, and cutscenes marked `rewatch`) to watch again.

### The classified documents

Eight documents tell the programme's story in order. Each unlocks lines from Ellen. Outlines only; the text is still to be written. *(Designed, not built: their sources, the government base and Ground Zero, aren't built. Since Nov 8 the government base is the Car Armory's, in the south band.)* None of them names or explains the witch.

| # | Found at | Document | What it reveals |
| --- | --- | --- | --- |
| 1 | Government base | Funding memo | How much money went in, and why this forest: old accounts of a "thin site" (ties to the time capsule) |
| 2 | Government base | Breakthrough report | The first stable portal aperture; the listening array comes online |
| 3 | Government base | Transmission log | What the listening research heard: voices, singing, mimicry. Annotated by Ellen's old team; she recognises her own initials. *(Nov 8: the mimicry can't be the Caller, which isn't from the other side; keep it to the other side's own voices)* |
| 4 | Government base | Specimen inventory | Beetles captured, a grey "visitor" sealed in resin, transfer orders to the military outpost; *(Nov 8, proposed)* a cooperative grey held for study: Sheriff |
| 5 | Government base | Containment orders | The Men in Black's cover-up instructions: secure the site, no civilian evacuation |
| 6 | Ground Zero | Incident log | The night of the full-aperture test, when the ring overloaded |
| 7 | Ground Zero | Shutdown attempts | Every attempt to close the portal failed; the field seems to be held open from the other side |
| 8 | Ground Zero | Final entry | The last log line: a woman seen walking out of the field. Nothing more |

### Dialogue plan

| Group | Trigger | Mainly | Rough count |
| --- | --- | --- | --- |
| Day 1 tutorial | Scripted steps | Ellen, Wyatt, Junie | 23 (written, below) |
| The opening cluster | Gas station (cars, the mutant, the witch confirmed), storm shelter (arrival, the combination, the tapes cutscene), Ellen's call to adventure, the outpost (the lulls between waves, the dogfight) | All | \~25 |
| Dusk forecast | Each dusk, by margin band | Ellen | \~8 |
| Alarm and base trouble | Under 50%, doors failing, low batteries, turret dry | Wyatt | \~8 |
| Dawn reports | Each dawn | Ellen, Wyatt | \~6 |
| Encounter discoveries | First visit to each encounter | Varies | \~20 |
| Lore items | Each found item handed in | Ellen | \~10 |
| Classified documents | Each document | Ellen | One each |
| Prizes | Blessing, turret, power core | All | \~9 |
| The witch's progress | First sigil, levels 2–5, first horde, first mutant, fifth sigil, wounded, sighted, hut found | Mixed | \~14 |
| Characters | By night number | Each | \~18 |
| The Caller (Nov 8) | The lure that takes Junie, the taunts in the south (in the family's voices), Junie home | The Caller, all | \~15 |
| The mid and end game (Nov 8) | The plane, the Mothman, the capsule's plaque and text, the place beyond, the family's plan, the bug zapper, the mega night, the mothership, Sheriff, the killdozer, the realm of stories | All, Sheriff | \~40 |
| Final battle and ending | Hut blown, mid-fight, victory dawn | All | \~8 |
| Idle | Nothing new to say | Each | \~2 each |

Roughly 155–175 lines in total (the opening cluster added about 25, Session 11), plus the written texts: the owner's diary (drafted above), the owner's note, the field report and the 8 classified documents.

**As built (Nov 7):** about 158 lines exist, nearly all for the opening (Day 1, Night 1, the campsite, gas station, shelter, home stop, the outpost, escaping the witch, breadcrumbs) and the ending; Earl's note, his diary, the field report and the manifest are written. Still to write: the dusk forecasts and dawn reports beyond placeholders, the frontier's encounters (the Nov 8 spine), prizes, characters by night, idle lines, the Caller's taunts, the plaque and capsule text, Sheriff, the 8 classified documents.

### Day 1 tutorial lines

| # | Trigger | Speaker | Line |
| --- | --- | --- | --- |
| 1 | Opening, Tom wakes | Ellen | Tom. Wake up. Something's happened at the facility. I tried my old lab line, nothing. Every channel's static except the emergency band. (Session 16, Aaron: hints she worked there) |
| 2 | Opening, end | Ellen | I need eyes on the woods. Get up the tower and tell me what you see. |
| 3 | Top of the tower | Wyatt (radio) | Dad, there's a car down at the campground. Those campers checked in two days ago. They never checked out. |
| 4 | After line 3 | Junie (radio) | Their fire's out. I saw the smoke over the trees last night, from my window. It's gone now. |
| 5 | Campsite sweep | Wyatt (radio) | Their car's still there, Dad. Check the tents. Maybe somebody made it. *(Session 15b, Aaron: the cars wait for the tape, so the tents and survivors, not the car and guns)* |
| 6 | Camcorder picked up | Ellen (radio) | Play it, Tom. Whatever they saw, I need to know. |
| 7 | After the clip | Ellen (radio) | That wasn't an animal. I've heard things like that before, on the recordings. Please be careful. |
| 8 | Shotgun picked up, wave starts | Wyatt (radio) | Dad, behind you! In the trees! |
| 9 | Wave cleared | Wyatt (radio) | They didn't stop when you hit them. They just kept coming until they couldn't. |
| 10 | After line 9 | Ellen (radio) | The dead aren't supposed to get up, Tom. Our fence is electrified to keep the bears out. Bring me their car battery and I'll supercharge it. *(Session 15b, Aaron's wording)* |
| 11 | The torn fence patched by hand at the fence *(Session 15b, Aaron: it came on walking in, right at the fence box)* | Wyatt (radio) | Nice work, Dad. You can patch the fence from the ledger too. It's on the desk in the comms room. |
| 12 | Fence repaired | Wyatt | That battery goes in the fence box by the gate. It'll put charge back in the wire. |
| 13 | Battery fitted; marker appears | Junie | Are they going to come here? |
| 14 | After line 13 | Ellen | They'll come. But the fence is live again, and we'll be ready for them. *(Session 15b, Aaron: they're coming, so she can't say they won't)* |
| 15 | Dusk 1 forecast | Ellen | This is how we stay alive. Left side is what we've got: fence, doors, charge. Right side is what's coming. Keep the left side bigger. |
| 16 | Night 1, the first wave near the fence | Wyatt (radio) | Movement on the {where} fence. Only a few. The wire's holding. *(Session 15b: {where} is the side they come from)* |
| 16a | After line 16 *(Session 15b, draft)* | Wyatt (radio) | Meet them at the fence with the shotgun, Dad. Up close. The wire holds them still for you. |
| 16b | After 16a *(Session 15b, draft; Aaron: the rifle on the tower is Night 1's beat, it can't be taken on Day 1)* | Ellen (radio) | Or get up the tower and take the rifle, Tom. You can pick them off from up there. |
| 16c | The second wave *(Session 15b, draft)* | Wyatt (radio) | More of them, Dad. Coming at the {where} fence. |
| 16d | The third wave *(Session 15b, draft)* | Ellen (radio) | Three more, from the {where}. That looks like the last of them. |
| 16e | All nine down, before the clip *(Session 15b, draft)* | Wyatt (radio) | That's all of them. The fence held, Dad. |
| 16f | A few seconds before the clip *(Session 15b, draft)* | Ellen (radio) | Tom, one of the trail cams just tripped. It's live. Hold on, I'm putting it through. |
| 17 | Trail-cam clip starts | Ellen (radio) | Tom, camera six. Look at this. |
| 18 | During the clip | Ellen (radio) | She's burying something. The transmissions talked about marks like that, wherever the dead started rising. |
| 19 | Clip ends | Junie (radio) | The ground's still glowing where she was. Like it's warm. |
| 19a | After the clip *(Session 15b, draft; the map button shows on screen with it)* | Wyatt (radio) | She buried something out on Pruitt land, Dad. It's on your map. Have a look. |
| 20 | After 19a *(Session 15b: Ellen's now; Aaron: stay away from her place, the gas station first; my draft)* | Ellen (radio) | Then we stay well away from it. At first light, go to the gas station, just south of the campground. See if the Pruitts are all right. |
| 20a | After 20, then the night fades to dawn *(Session 15b, draft)* | Wyatt (radio) | And if their phone's still working, we can call for help. |
| 21 | Dawn 1, sigil not dug up | Ellen | We made it through. Whatever she buried can wait. Go to the gas station, Tom. See if the Pruitts are all right. *(Session 15b; my draft)* |
| 22 | Dawn 1, sigil dug up | Ellen | You got it. The night went quiet after you dug it up. That has to mean something. |
| 23 | Dawn 1, either way | Junie | She was singing. On the camera. Did you hear it? |

## Cutscenes

Three styles, all rendered live from the real game world from one data-driven timeline format (camera, actors, timing, captions, triggers). No pre-rendered video.

| Style | Use | Look |
| --- | --- | --- |
| CCTV | Things happening elsewhere, or seen through a system | Fixed camera, heavy film grain, tint, scanlines, noise, lens bend, \~12 fps, camera name, timestamp, blinking REC |
| First-person | Things happening to the player in the moment | The player's own camera taken over briefly (look, shake), then handed back |
| Establishing sweep | The default on arriving at an encounter | The camera circles the clearing, then zooms in on the point of interest; often paired with a radio line |

- **Camera styles tell you where you are:** ranger trail-cam (night-vision green), government security (crisp, blue, classified watermark), battered military feed (static, dropped frames), warped alien feed (glyphs, glitching), camcorder (shaky handheld).
- All cutscenes are skippable and have subtitles. Clips seen in the comms room can be rewatched on its monitors.
- **As built (M8, Session 12):** `src/data/cutscenes.json`, one timeline format: camera keys relative to anchors (the map is seeded: home, the hut, the witch, the player, a trail camera, a clearing by encounter, the nearest clearing), eased or cut, orbits for the sweep; placeholder actors (figures, the portal ring, glows, boxes, eyes); timed events (lines, captions, moves, poses, flares, glitches, fades, sounds, a cut to another camera with its own look and hour). The looks are a pass in PostFX (`config.postFX.looks`): CCTV, trail cam (night vision), camcorder, military, government, the scope. The on-screen display shows the camera's name, the time (OCT 2003), a blinking REC and a CLASSIFIED watermark. **A cutscene pauses the clock** (Aaron, Session 12). Clips from elsewhere also hold the world still; first-person ones (`"world": "run"`) let it carry on with your controls locked. The HUD hides, A / Enter skips, and the grade and look are handed back afterwards. CCTV runs at about 10-12 fps. At night the camera's lamp lights the actors only (a real light would recompile every shader). The final battle's intro and the ending and defeat are cutscenes now.
- **Every cutscene is in the debug menu** (Aaron, Session 11): a Cutscenes category lists every one (the placeholders too) and plays it on the spot, from anywhere, so each can be watched, tweaked and watched again until it's really good. M8 builds the category; every session that adds a cutscene adds it there in the same step.

- **Since M8 (Sessions 15-19):** 69 cutscenes. Cutscenes speak as they play (Aaron, Session 17 round 5), except the dogfight (`linesAfter`). Sweeps can run the world on **unseen** (`"world": "run", "unseen": true`: the dead keep moving, nothing notices Tom). A first-person reveal can **jolt** (`"jolt": true`). Actors can fly timed paths (the dogfight's plane and craft), cast tracers, rays, smoke trails and blasts; cameras can track actors; a cutscene can have its own near and far planes (the scope). Style pass 2 refined the looks: the camcorder's focus hunting, blown highlights, handheld wobble, amber date stamp (OCT.13.2003) and tape counter; the trail cams' data strip; the scope's mil-dot reticle and breathing sway; the sweeps' grade. The letterbox bars show on every non-CCTV cutscene.

**Planned clips:** the Ground Zero cold open; the campers' camcorder; the Night 1 trail-cam clip of the witch planting; an establishing clip for each encounter (see the design checklist); the witch's fifth sigil going in (a warning); the dogfight and both crashes through the hunting rifle scope (military outpost; this replaces the earlier "UFO passing over the treeline" foreshadowing clip); the Mothman's torn-open container (military outpost; a hint, never named); government footage of the portal programme (unlocked by classified documents); the hut exploding (first-person); the victory montage. **Added Nov 8:** the crashed plane's standoff (into the quick draw); the signal flare and the Mothman's flyovers; Tom blacking out (red eyes over him); the station's lure flares and the Mothman zapped on the fence; the beam up to the mothership; Bigfoot cut from the cocoon and the Blessing; the escape from the Car Armory; Bigfoot answering Junie in the realm of stories.

## Opening and first run

The first 20 minutes teach through the radio and the world, not pop-ups. Only controller button prompts appear on screen.

### Main menu

- The pixel-font title over a live, slow CCTV feed of the forest at night.
- **New Run**, **Continue** (if a save exists), **Modifiers**, **Settings**, **Quit**.
- **Demo** *(Aaron, Session 22; built)*: see "Demo mode" below.

### Demo mode (a marketing tool: "if it runs in demo mode, it'll run on your device")

*Aaron, Session 22: a browser game meets every kind of device and browser, so the main menu offers a short, honest test. **Built** (`demo/DemoMode.js`, `demo/DemoPanel.js`, `demo/verdict.js`; `config.demo`).*

- **Demo** is always on the main menu. It starts in the ranger station's yard by day (the station is the same on every seed) with **no story, no witch, no radio and no saving**: a save store that keeps nothing is swapped in, so a saved run is still there to Continue afterwards, and the demo doesn't unlock Skip intro. Day 2, past Day 1's scripted beats; the clock held.
- **Early-game weapons and basic zombies only** (no spoilers): the shovel, the service rifle and the shotgun; zombies of levels 1-5, no mutants, no Mothman, no aliens.
- **Menu / Esc opens the demo panel** (it holds the world, like the pause menu): **Run the device test**; **Zombies to send** (10 to 150) and **Send them** (they rise on a ring outside the fence and come for Tom); **Zombie level**; **Clear the zombies**; **Time of day** (Day, Dusk, Night: set straight, without the phase events, so nothing scripted runs); **Fence power**; **Infinite ammo**; **Bring the quad bike** / **the dozer** (to just outside the gate); **Graphics** (Low, Medium, High); **Quit the demo** (back to the main menu).
- **The device test:** night, 100 zombies, 6 s for them to close in, then the frame rate averaged over 15 s. The verdict: **Runs great** (40 fps or more; 28 with Low's 30 fps cap), **Playable** (24 or more), **Struggling**. Struggling drops the graphics a step. The preset it settles on (or the one picked on the panel) is **kept for real runs on that device** (`meta.quality`).
- The top-left corner always shows the frame rate and the zombie count. A death puts Tom back on his feet in the yard.
- **Not yet:** touch controls (Aaron, Session 22: **at the very end of the project**; until then the demo, like the game, needs a controller or keyboard and mouse, and says so on a touch-only device); a share card for the verdict.
- **Tablet (Aaron, round 34):** 150 zombies at night, 57 fps, "Runs great".

### Opening cutscene (under a minute, skippable)

1. **Cold open:** grainy government CCTV at Ground Zero. Men in Black around the portal ring; it flares; the feed glitches and dies.
2. **First person:** Tom wakes in the station in the early morning (runs start at 07:00, Day 1; M3). Ellen at the radio, emergency broadcasts crackling (lines 1–2).

### Day 1 (guided, can't fail)

1. **Lookout tower:** climb it; the first patch of map is revealed. Before Wyatt's line, the view lingers: fog over the treetops, the cliff at Tom's back, and far to the south a shape or light he can't make out, never explained and not reached for hours. It plants the whole push south in one glance. Then Wyatt spots the campers' car, and a thin wisp of smoke above the canopy marks the campsite for Junie's line.
2. **Campsite:** the witch's signs, the camcorder clip, the shotgun and the first zombie wave, the campers' car battery.
3. **Home:** repair the fence at the ledger, fit the battery, meet the family face to face.

### Dusk 1

Ellen explains the first forecast.

### Night 1 (the first defence; the first sigil)

- **The first defence** (Aaron, Session 15b; replaces "only a few strays"): once the fence is patched, the battery's in and Junie's had her word (13-14, indoors), the day fades straight to night (no dusk to wait out); the forecast and Ellen's line 15 come up as the picture returns. At night 9 zombies come at the compound in waves of 3, each from a new side (up the campsite path, then the south, then the east), the next once the last is down. The family suggest the two ways to fight: the tower with the rifle, or the shotgun at the fence. It shows the charged fence doing its job and gives the guns some practice. No health floor: Night 1 is real.
- The night's one sigil is far enough off that it raises nothing that reaches home before dawn.
- **The first sigil is scripted** (Session 11): the real witch comes out on Night 1 on a fixed route and plants at the storm shelter, the one exception to "night 1 is safe, planting from night 2" (`config.witch.firstNight`). The owner's family die there that night (see Storm shelter). From Night 2 her normal rules take over (inside the cluster until the cordon is crossed).
- The family patch through the trail-cam clip of the witch planting her first sigil at the storm shelter; it's marked on the map. Camera six is fixed at the shelter (built, Session 14), so the clip is always possible.
- **The clip comes once the 9 are down** (Session 15b), after Ellen's warning that a trail cam's live. Then the family talk it over: it's the Pruitts' shelter; line 20, someone needs to check on them at first light; and Ellen: start at their gas station, for supplies and a phone or radio to reach the outside. Then the night fades to dawn (no waiting it out), so the sigil isn't dug up on Night 1.

### Dawn 1

Autosave. Ellen sends Tom to the gas station to check on the Pruitts (Session 15b: not to the sigil). On Day 2 the path to the gas station opens (the guaranteed second outing). After it, Pruitt land opens: the storm shelter (Earl's keys). The safe opens with them, and Ellen's call to adventure sends Tom to the military checkpoint, which he finds overrun; fighting through it opens the frontier (see Map: Fixed opening cluster).

### Repeat runs

After the first run, **Skip intro** starts at Dawn 1 with the tutorial done (fence repaired, battery fitted, shotgun in hand).

### As built (M9.2, Session 15)

`story/FirstDay.js`, agreed with Aaron (my recommendations; OPEN_QUESTIONS #185-197):
- **The menu:** the title over a looping grey CCTV feed from the station gate; New Run, Continue, Skip intro (once the opening's been seen on the device), Modifiers and Settings greyed out until M16 and Session 49; no Quit (a browser tab).
- **The opening:** the cold open, then Tom wakes in the comms room facing Ellen (from black), lines 1-2.
- **The tower:** the first climb on Day 1; the light far south is a small red light blinking at the edge of sight; the smoke over the campsite; lines 3-4.
- **Day 1 can't fail** (a 20% health floor, the day only) and **its clock holds at 17:00** until nightfall: Session 15b, once the battery's fitted, the torn fence patched and Junie's had her word (or 60 s), the day fades to dusk (`day1.nightfall`). Draft nudge lines (`day1.nudge.*`) if Tom seems stuck.
- **Night 1** (Session 15b): straight in from the day (no dusk); 9 zombies in waves of 3 from the south-west (the campsite path), the south and the east (line 16, the family's tower and shotgun lines, a line per wave); once they're down the witch's first sigil goes in at the storm shelter; camera six's clip (17-19); the sigil marked on the map and the spur open; the family's talk (19a, 20, 20a: three lines, the Pruitts, the gas station); then a fade to dawn. The night holds short of dawn until she's planted. Its dead stay at the shelter. The real witch stays home: the clip shows her.
- **Dawn 1:** lines 21 / 22 and 23; the gas station trail opens.
- **Also built since:** Tom wakes empty-handed (the shovel by the door, the rifle on the tower, the comms room's first aid box); the gate chained until the tower; control hints as each control is first needed; objectives on the map; the bloody wreck on the trail; Night 1's waves overlapping (15 s apart); no digging on Night 1; Pruitt land shut until the gas station.
- **Skip intro:** a fresh map at Dawn 1, the tutorial done, the campsite looted, the camcorder handed in, the Night 1 sigil planted.

## Modifiers and achievements

*Designed, not built (M16). The menu shows Modifiers greyed out.*

**Modifiers** are Halo skulls–style options toggled before a new run. Locked until earned; they can be combined.

| Modifier | Effect | Unlocked by |
| --- | --- | --- |
| Blood Moon | Every night is a red-sky blood night; enemies have 1.5× health | Witch Hunter |
| Static | No minimap; the fog of war never clears from the map | Red Sky at Night |
| Cowboy Up | Every alien is a full gunslinger | Not a Scratch |
| Empty Holsters | Ammo drops halved | Dead Eye |
| Coven | Three witches at once | Ambush |
| Divorced Dad | No family and no compound: pure exploration and witch hunting, with no base to defend | Custody Lost |

**Coven rules:** the three witches share the five-sigil cap, live in the same hut, all come out when it's blown, and the run is won only when all three are dead.

**Divorced Dad rules** (Aaron's idea, M6; not built yet, to be designed with the other modifiers in M16): the family and the compound are gone, so the station can't fall and the dusk forecast, alarm and night marches have nothing to defend. Open questions for later: where the run starts and where Tom sleeps; where batteries, scrap and the turret go (no fence to power or repair); whether marching groups head for the player instead, or just wander; and how it combines with Coven and Blood Moon.

| Achievement | Condition | Unlocks |
| --- | --- | --- |
| Witch Hunter | Finish the game for the first time | Blood Moon |
| Red Sky at Night | Finish with Blood Moon on | Static |
| Not a Scratch | Clear the alien ship without taking damage | Cowboy Up |
| Dead Eye | Headshot 10 zombies in a row without a miss | Empty Holsters |
| Ambush | Kill the witch in a pathway fight | Coven |
| The Light Was On | Defeat the Mothman without taking damage (Nov 8: which fight, or all three, is open; driving it off at the plane is a candidate) | — |
| Ranger Danger | Clear the government base of every Man in Black without ever being seen (Nov 8: rework for the Car Armory's barricaded survivors) | — |
| Custody Lost | Lose the station (the family) several times across runs (count to be set; e.g. 3) | Divorced Dad |

## HUD

Console style (mockup: the "Witch Hunt HUD" design canvas). Nothing in boxed panels; elements float over the scene inside TV-safe margins (about 5% from each edge).

| Position | Element |
| --- | --- |
| Top left | Night number and clock; zombie level as five pips (one per active sigil) |
| Top centre | Station-under-attack banner with a direction arrow (only during an alarm) |
| Top right | Round minimap with fog of war and a north marker |
| Centre | Small crosshair; interaction prompts below it (controller glyph with a hold-progress ring) |
| Bottom left | Health (10 segments), three slim colour-coded armour bars, stealth eye icon when hidden |
| Bottom centre | Subtitles: speaker name above, line on a dark strip |
| Bottom right | Weapon icon and name with an RB glyph, ammo count and type (a purple shell for alien; Nov 8), chips for flares (Y), charges and the healing pool ("Healing: 90"; Nov 8); a small D-pad showing map, flashlight, watch and heal |

- Prompts always show the controller glyph (A green, B red, X blue, Y yellow), or the key when keyboard is in use.
- The pause screen shows the three-prize checklist, documents found and the full map.

**As built (a placeholder until Session 49):** bottom left, health (10 segments), three armour bars, the HIDDEN eye; bottom right, the weapon's name, ammo, the reload bar, kits, scrap, batteries, flares and charges in text; centre, the crosshair, the hit marker and interaction prompts with a hold bar (the button named in text); the round minimap top right with the objective star; the station-under-attack banner and the witch's boss bar when they apply; a pickup feed; **three message slots** (toasts, control hints under them, and the red alert slot: ESCAPE THE WITCH); subtitles at the bottom centre; the dusk forecast panel. **Not built:** the clock and zombie-level pips, the pixel font, glyphs, the D-pad legend, the pause screen. **While riding an experimental vehicle** its own HUD takes over (the ute's gear plate or the gun's heat ring, the alien quad's neon reticle, cells and boost, the dozer's blade, trail and winch), and the crosshair and gun panel hide.

## Art style and rendering

**Atmospheric 3D with retro touches.** A real 3D forest rendered at normal resolution (scaled automatically to hold the frame rate), aiming for an Xbox 360-era horror look. No chunky-pixel upscale. Retro flavour lives only where it fits: the pixel-font HUD and subtitles, the Doom-style zombie sprites, and heavily grained CCTV and camcorder footage. An optional retro pixel filter is available in the Quality settings.

### Visual ambition: Xbox 360-era atmosphere

The goal is graphics as close to Xbox 360 level as a browser on a mid-range tablet allows, with a hint of indie. Reference point: Alan Wake (a 360-era game of dark forests, fog and flashlights).

**Rule: spend effort where it's cheap and looks great; hide what's expensive in fog, darkness and shadow.** Night is our friend: it lets the draw distance shrink and the flashlight do the heavy lifting.

Cheap techniques to do well:

- **Night sky:** gradient dome, dense starfield with twinkle, a moon with a soft halo, thin clouds drifting across it from a scrolling noise texture, moonlight tinting the whole scene.
- **Fog and mist:** height fog plus distance fog; low ground-mist layers drifting between trees; fake light shafts (soft billboards) where moonlight or the flashlight cuts through. **Fog nights** (Session 10): about one night in three (never night 1), seeing about 38 m, with the draw distance pulled in to match. Look only for now (OPEN_QUESTIONS #137).
- **The heat scope** (Session 10b): through the semi-auto rifle's scope the world turns cold grey and the living glow white-hot. Anything new that lives (encounter creatures, the family) needs a heat hook.
- **Trees:** instanced camera-facing billboard sprites (alpha-cut, six Appalachian kinds in one atlas: hemlock, two spruces, white pine, bare oak, dead snag), wind sway in the vertex shader. Decided with Aaron in M1: every canopy is a billboard, near and far; since Session 10 the trees near the player get a solid 3D trunk under the sprite.
- **Ground:** blended tiled textures (dirt, grass, moss, mud, leaf litter) with a detail texture up close, normal maps, scattered rocks, roots and fallen logs. (Session 10 built the blend; normal maps, roots and fallen logs are for a later style pass.)
- **The flashlight:** a spotlight with a cookie texture (that imperfect torch pattern) and the one real-time shadow in the game. One shadow-casting light is affordable and is the single biggest atmosphere win.
- **Post-processing:** filmic tone mapping, bloom on lights and witchfire, colour grading, vignette, subtle film grain.
- **Particles:** fireflies, embers, dust motes in the flashlight beam, breath on cold nights.

Expensive things to hide: long draw distances (fog), crowds (darkness, so fewer need full detail), complex models (seen only in the flashlight beam or at a distance).

All of this is tiered by the Quality setting so the tablet gets a version that holds the frame target.

### Rendering pipeline

1. Render the scene with **dynamic resolution**: the render scale drops automatically when the frame rate dips, then upscales smoothly.
2. Post-processing: filmic tone mapping, bloom, colour grading, vignette and subtle film grain (heavy grain, scanlines and noise for CCTV and camcorder footage).
3. Draw the HUD at native resolution in a pixel font.
4. Optional retro pixel filter (Quality setting): low-res render with nearest-neighbour upscale, for players who want that look.

### Assets

- **Art is generated in code** (agreed with Aaron, Session 10): textures, sprites and models are drawn or built at load, with no texture files to download. A consistent, moody colour palette across all assets, kept dark so the torch doesn't glare.
- **References** (Session 10): Appalachia, US forest rangers, a 1980s made-in-the-USA chainsaw manual, American folklore; Left 4 Dead, Silent Hill, Evil Dead 2.
- **The glare rule** (Aaron, from M1 on): props are dull and dark, because pale ones glare white under the torch. Since Session 19 it's enforced: nothing brighter than sRGB luma 0.45 unless a place lists it to keep bright, checked in the tests for every place's palette.
- **The props kit** (Session 19, `render/propKit.js`): a place's static props are baked into one vertex-coloured mesh, weathered as they're baked (grime up from the ground or floor, mottling, darker undersides, rust on the metal), so a dressed place costs a few draw calls. What changes (doors, lids, the hatch, lamps) stays in groups of its own. Every new place is built this way.

| Thing | Render as |
| --- | --- |
| Zombies | Billboard sprites with 8 facing angles in one atlas, drawn in code (Aaron, Session 13: keep the sprites). Grey-painted with a mask: each zombie is coloured in as it's drawn (a palette swap), all in one draw call |
| The family, the Men in Black, the grey alien | Low-poly 3D from the figure kit (`render/figureKit.js`): ellipsoids, tapered limbs and tubes, vertex-painted, skinned to a skeleton, one draw call each |
| Mutants, beetles, the Mothman, aliens, Bigfoot, the witch | Low-poly 3D, animated |
| Trees | Billboard sprites, instanced, camera-facing (near and far), with solid 3D trunks near the player |
| Bushes, grass, ferns | Instanced sprites |
| Station, tower, defences, turret, hut, traps, vehicles | Low-poly 3D. Vehicles: four models built in code from extruded profiles, instanced per type, each one worn differently in the shader (Session 13); Earl's quad and the experimental vehicles are their own models |
| The opening cluster's places | One baked, weathered mesh each from the props kit (Session 19), with the moving parts on their own |
| Pickups and sigils | Small 3D or sprite with a glow |

Everything shares the same fog and moonlight colour so the mix reads as one style.

### Sky and lighting

- Gradient sky dome driven by time of day; `Points` starfield; moon sprite.
- One directional light (sun/moon) plus ambient. The only real-time shadows come from the flashlight (see Visual ambition).
- A small pool of point lights for the flashlight, muzzle flash, flares and witchfire.
- **No lights added or removed while playing:** adding one recompiles every shader (a hitch). Lights are made at load and sit at intensity 0 when off (the quad's headlamp, the outpost's floodlight pool of three handed to the nearest lit lamps); the experimental vehicles make theirs the first time each is brought from the debug menu.
- Distance fog: blue-grey by day, deep blue-black at night; red during blood night.

## Audio direction

Mostly synthesised with the Web Audio API (oscillators, filtered noise, a few short samples) to keep downloads small. Positional sound for anything in the world.

| Place or moment | Palette |
| --- | --- |
| Forest by day | Wind, sparse birdsong, creaking trunks. Almost peaceful |
| Forest by night | Low droning pads, distant howls and knocks, snapping branches. Ominous, never melodic |
| Ranger station | Radio hum and crackle, generator, fence buzz |
| Mineshaft and cave | Drips, long echoes, beetle clicks |
| Government base | Fluorescent hum, ventilation, cold synth stings when agents are alerted |
| Alien ship | Bleeps and bloops, theremin-like warbles, twangy Western notes deeper in |
| Ground Zero | A detuned hum from the open portal; total dropouts during anomalies |
| Final battle | Pounding percussion under choir-like pads, crackling witchfire |

- **Stingers:** the witch's whispers and singing nearby, a low tone when a sigil is planted, Mothman wingbeats, the Caller's slightly wrong radio, turret fire, the bonnet and battery pull, digging.
- **Music:** adaptive layers that rise with danger and fall back to ambience.
- **As built:** every sound is a placeholder synthesised on the fly (`audio/Sfx.js`): guns, hits, the dead, the witch, the station, cars, alarms, the radio crackle and dialogue blips, explosions, engines with their own voices (Earl's quad, the ute's diesel, the alien drive, the dozer). No ambience, music or samples yet: the audio pass (Session 50).

## Performance and simulation LOD

Every performance decision is made for the target device: the Galaxy Tab S10 FE in Android Chrome. Its screen is 2304×1440, so rendering at full native resolution is wasteful; start the dynamic resolution at about 0.6–0.7 render scale (roughly 1080p-class) and let it adjust. Aim for a steady 60 fps; a stable 30 fps with quality lowered is the acceptable floor. Mobile GPUs throttle when hot, so performance is checked over a 20-minute session, not a quick look.

| Tier | Distance | Simulation |
| --- | --- | --- |
| Active | Within \~60 m | Full render, collision, pathfinding, combat |
| Nearby | \~60–150 m | Cheap render, simple steering, updated every few frames |
| Abstract | Beyond \~150 m | No mesh; position on a graph edge plus progress; updated \~1×/sec |

- The station and the witch follow the same tiers. Abstract fights at the station use the margin table.
- `InstancedMesh` for trees, bushes, grass and identical sprites; one texture atlas per sprite enemy type.
- The map is split into chunks; only chunks within fog distance are drawn (fog end = draw distance).
- Object pools for enemies, projectiles, particles and lights. No allocation in the main loop.
- **The M10.3 spikes (Session 22):** see "Build plan: the M10.3 spikes" for each one's measured go / change-the-design answer.
- **Budgets as they stand (Session 19, Aaron):** 155 draw calls to start with (he has never seen the tablet's frame rate dip); the opening's worst spot is the trail behind the gas station at about 157. The outpost's barricade peak by night (20 army dead, 5 beetles) sits around 110-145 with under 1 ms of simulation (headless). The experimental vehicles run 80-130 (the ute's live mirror adds a pass every third frame).
- **Budgets** (debug overlay, the original targets): draw calls under \~100; active enemies capped (e.g. 25); at most \~4 point lights at once; dynamic resolution drops the render scale automatically to hold the frame target; frame time split into simulation and render. A \*\*Quality setting\*\* (render scale, draw distance, flashlight shadow, post effects, mist and particle density, 30 or 60 fps cap, plus the optional retro pixel filter) is the safety valve, with defaults chosen for the tablet.

## Technical architecture

### Stack

- Plain JavaScript ES modules, three.js (latest stable), Vite.
- No physics engine: capsule-vs-world collision and raycasts.
- Seeded RNG everywhere randomness matters (map, loot, spawns), so a seed reproduces a run.
- Web Audio API, Gamepad API, IndexedDB (or localStorage) for saves and settings.
- Vitest for unit tests of pure logic. Hosting: a GitHub repo with GitHub Pages; a GitHub Action builds and deploys on every push to main (Vite \`base\` set to the repo path). Static only: no server, everything runs and saves in the browser.

### File structure

```
/src
  main.js                entry: creates Game
  config.js              ALL tuning numbers
  core/                  Game (loop, phases), Clock, EventBus, Rng, Input (gamepad + kb/m), Display, SaveStore and saveData, runStats
  render/                Renderer (dynamic resolution, pre-render hooks), Sky, Forest, NearTrunks, Atmosphere and the mist, PostFX (tone mapping, bloom, grade, grain, heat scope, the cutscene camera looks and treatments), the props kit, each place's props (Campsite, GasStation, StormShelter, Outpost, Gate, Road, Cordon), the renderers and models for zombies, mutants, the witch, the family (figure kit), the grey alien, beetles, the Men in Black, vehicles, the hut, the station, traps, flares and pickups; the experimental vehicles' models (ute, alien quad, dozer)
  world/                 World, MapGenerator, mapGeometry, mapGraph, Terrain, GroundField, Forest layout, FogOfWar, fog nights, road, cordon, Gates, Vehicles and vehicle placement, Hut, Pickups, clearingFrame, collision, SpatialGrid; Quad (Earl's), Ute, AlienQuad, Dozer and LandClearing (Interiors to come)
  player/                Player, Weapons, ViewModel, Inventory, Armour, Health, Stamina, Flashlight, Digging, HoldAction
  combat/                Combat (the hub), WeaponState, hit-scan, aim assist, loot, Explosives, Flares, Plasma (the alien quad's)
  ai/                    EnemyManager (pools, sim tiers), Zombie, ZombieBrain, ZombieDirector, Sigils and the planter, detection, marches, revisits, Beetles, the Witch with her routes, hexes and traps (Alien, MenInBlack, Mothman to come)
  base/                  Station, StationState, stationLayout, fencePlan, Turret, siege routing, danger, NightWatch (forecast and alarm), nightResolver
  encounters/            Campsite, GasStation, StormShelter, Outpost, FinalBattle (one module per encounter)
  story/                 Dialogue (picker, radio gate), FamilyTalk, TrailCams, Cutscenes (timeline, flight paths), Lore, StoryProgress and the flags, Objectives, WatchQueue, FirstDay, HomeStop, WitchEscape
  meta/                  MetaStore (what the device remembers); Achievements, Modifiers to come (M16)
  audio/                 Sfx now (placeholders); AudioEngine, Ambience, Stingers, Blips in the audio pass
  ui/                    Hud, Minimap, MapScreen, MapUi, mapImage, Ledger, ScopeOverlay, PaperNote, NoReturnNotice, RunEndScreen, StartScreen, Toast, Subtitles, VehicleHud (Menus to come)
  data/                  encounters, clearingTypes, sigilGrounds, loot, vehicles, ending, dialogue, cutscenes, lore, papers, progress, openingCluster, campsite, gasStation, stormShelter, outpost (.json)
  debug/                 DebugMenu (in categories), DebugOverlay, ModelViewer (and its catalogue)
/tests                   unit tests for pure logic and simulated play (726)
/docs/DESIGN.md          this doc
STATUS.md, HANDOVER.md, OPEN_QUESTIONS.md, PLAYTEST.md, MORNING.md   the build's running notes
```

### Conventions

- Each system has `init()`, `update(dt)` and `dispose()`; systems talk through the event bus (`sigil:planted`, `base:alarm`, `phase:dusk`).
- All numbers in `config.js`; all content (lines, cutscenes, encounters, loot) in `/data`.
- Small modules (aim for under \~400 lines). Complete files when editing, never partial diffs.
- Saves carry a version number; an incompatible save is discarded cleanly, never crashes the game.

## Build plan

This plan decides whether the project succeeds. It is ordered by **risk first**: prove the things most likely to fail (performance, controller feel, the core loop) before building content.

### Rules for the coding agent

1. **One milestone per session.** Finish it, meet its "done when", then stop.
2. **Keep `STATUS.md` up to date** at the end of every session: what was built, what works, what's stubbed, known bugs, what's next. Every new session starts by reading this doc and `STATUS.md`.
3. **Always runnable.** `npm run dev` works at the end of every session. Never leave the game broken.
4. **Placeholder art** (coloured boxes, simple sprites) until the art milestone. Never block on art.
5. **Config and data first:** no magic numbers in code, no content hard-coded in systems.
6. **Tests for pure logic** (Vitest): RNG and map generation invariants, the night resolver, turret maths, armour damage order, healing queue, dialogue condition picker, save round-trip. `npm test` passes before a milestone is called done.
7. **Don't build ahead.** Stub later systems behind simple interfaces.
8. **Ambiguity:** choose the simplest option, make it config, note it in `OPEN_QUESTIONS.md`.
9. **Complete files, small modules, no new dependencies without a reason** written in `STATUS.md`.
10. **Workshop content before building it.** Before building any encounter, enemy, boss, interior, cutscene or other piece of content, write a short practical build plan (how it will be made, what it will look like, how it plays, what it costs in performance) and workshop the design and execution with Aaron. Build only once he has agreed. This applies to content, not core systems.
11. **Each milestone ends with a short play-test script** for Aaron: what to try on the controller and what "good" looks like.
12. **Play-test generously** (Aaron, Session 11: "I don't think we can really overdo playtesting"). Each milestone part ends with Aaron's play-test and its fixes before the next part starts, push each step to `main` so he can try it, and a QA session follows each content milestone (M9-M15).

### Debug tools (built in M0, extended every milestone)

- Overlay: fps, frame time (simulation vs render), draw calls, active enemy count, seed, clock.
- Debug menu: set seed, skip time and phases, reveal map, god mode, give items, spawn any enemy, place or remove sigils, set zombie level, teleport to any clearing or encounter, trigger any cutscene (its own Cutscenes category, Aaron, Session 11) or dialogue line, force the witch's state, toggle LOD tier colours, and (from Session 13) a model viewer to look at any character model in any pose.
- **As built (Nov 7):** all of the above, in categories: Time & night, Cutscenes, Models, Teleport & map, Witch, Hut & explosives, Sigils & zombies, Player (a jetpack, refill flares, give guns), Station & vehicles, **Experimental vehicles** (the ute, the alien quad, the dozer), Story, radio & trail cams, Story flags & gates (toggle any flag), First day & campsite, Military outpost, Dialogue: Day 1 lines, Run & save, Display & performance. Fast-forward runs the whole world faster. The overlay is off on a new game (View + Menu or F3 shows it).

### Milestones

**Where they stand (Nov 8, 2026):** M0-M8 done; the gate passed on the witch's side (pacing and the dusk choice wait for full runs); **M9 done** (9.1-9.4, the opening cluster, play-tested over many rounds); part of M17 done (style passes 1 and 2, Sessions 10, 10b, 13, 19); experimental vehicles built outside the plan (debug only). **Next: M10, Session 20.**

**The plan from M10 on (agreed with Aaron, Nov 8).** It follows the story spine (see Encounters):

- **In story order, each beat built finished and play-tested** (as the opening was), **after early spikes** on the riskiest tech: about 150 zombies on the mega night, the procedural four-path forest (the place beyond and the realm of stories), a flying enemy, and parts bolted onto the dozer. A spike that fails changes the design before content depends on it.
- **A longer run is accepted** (4+ hours), so **save and quit moves forward to M10**; the run's length is set once full runs are played (M18).
- **The five designed optional encounters are built with the stretch they belong to:** the railway cutting and Milo's barn with M11, the mineshaft with M12 (its giant moths before the cave's), the sawmill with M13, the moonshiners' holler with M14. Their killdozer parts are collected as they're built; the killdozer itself comes in M15.
- **The endgame (M15) waits on Aaron's design** of the final battle and the realm of stories; Session 43 folds it in and re-plans M15's sessions.
- **Renumbered (Nov 8):** M10 and M11 are replaced by M10-M15; the old M12 (meta), M13 (art and audio) and M14 (balance) are now **M16, M17 and M18**. Older notes in this doc and in STATUS.md that say "M12-M14" mean those.

| # | Milestone | Includes | Done when |
| --- | --- | --- | --- |
| M0 | Project skeleton | Vite + three.js (base path set for GitHub Pages), GitHub Actions deploy, fullscreen and landscape lock, game loop, config, event bus, seeded RNG, input (gamepad + kb/m), debug overlay and menu, `STATUS.md`, Vitest | The live GitHub Pages link opens on the Samsung tablet, goes fullscreen, detects the Xbox controller and shows fps |
| M1 | Look and feel | Renderer with dynamic resolution and post-processing, sky and day/night, the flashlight with its shadow, one clearing with instanced forest, fog, first-person movement, sprint, crouch, flashlight | Walking around at night with the torch feels good on the tablet and holds the frame target for 20 minutes |
| M2 | Combat feel | Shovel, service rifle, shotgun; one zombie sprite type; hits, death, aim assist, aim slowdown, health and armour bars, first aid kits | Fighting five zombies at night is fun on the controller |
| M3 | The map | Seeded generation of 22 clearings in bands, cliff, pathways, chunked forest, colliders, fog of war, minimap and map screen, encounter placeholders from data | A whole map generates the same from a seed; walking end to end holds the frame target on the tablet |
| M4 | Sigils and zombies | Sigils, night spawning, five-sigil cap, levels 1–5, variants, speed variance, hordes, mutants, loot, digging, sigil grounds, detection model, targeting | Raising the level by debug visibly changes the night |
| M5 | The station | Compound layout, fence and batteries, doors, comms room, ledger, security rating, turret, real-time base defence, vehicles and battery pulling | A night defending the station is tense and readable |
| M6 | Simulation LOD and nights | Active / nearby / abstract tiers, simulated nights while away, dusk forecast, alarm, dawn autosave | The full map stays alive at the frame target on the tablet; leaving home at night resolves fairly |
| M7 | **The witch: playable loop** | Witch states, planting at sigil grounds, interruption, fight or flee, wounds, traps, hut, explosives (debug-given), final battle, blood night, ending and defeat screens | **Vertical slice:** a complete run from Day 1 to killing her (or dying) with placeholder content |
| — | **Gate: play-test the slice** | Aaron plays two or three full runs | The core loop is fun before any content is added. Fix the loop first if it isn't |
| M8 | Story systems | Dialogue data and picker, subtitles, talking bob, blips, new-line marker, radio and rate limiting, trail cameras (witch sightings as leads), the cutscene timeline and its three styles, the CCTV, camcorder and trail-cam looks, lore item hand-ins and rewatching on the monitors, **the Cutscenes debug category**. Takes over today's placeholders (the no-return call, NightWatch's radio calls, the ending and defeat cards, the final battle's intro). Wires up only the lines already written (Day 1, the ending); new lines are written with each encounter (Aaron, Session 11) | A radio call, a CCTV patch-through and a face-to-face line all work from data alone; every cutscene plays from the debug menu |
| M9 | **The opening cluster** (Aaron's Oct 16 design), in four parts | **9.1 The cluster on the map:** the fixed sub-graph placed first, the road, the cordon (blocks Tom only; torn gaps for the dead), the gates on each path, story progress flags (saved), the witch planting only inside the cluster until the crossing, the flare gun and its lure. **9.2 First day:** main menu, opening cutscene, the Day 1 tower, the campsite (camcorder, shotgun wave, first battery), the scripted Night 1 sigil, Dawn 1, Skip intro, the shotgun out of the starting kit. **9.3 Shelter and gas station:** the storm shelter (the horde that holds the hatch, the room below, the combination, diary, tapes cutscene at home), the gas station (store and back office, the authored mutant, the witch sighting, the safe), the rifle chain. **9.4 The outpost:** approach waves, helmets, the watchtower and its rounds, the scope as binoculars, the dogfight cutscene, the barricade peak, the containers and the Mothman's container, beetles, Ellen's call to adventure; crossing opens the frontier | A new player gets from waking up to the frontier without help, on every seed. (Each part: 9.1 the same cluster on every seed and the gates open in order; 9.2 through Day 1 and Night 1 without help; 9.3 the hunting rifle claimable on every seed; 9.4 the frontier opens) |
| M10 | **Foundations for the new story** (Nov 8 plan), in three parts | **10.1 Systems** *(built, Session 20)*: the healing pool (D-pad right, the HUD total); the loadout (two long guns, a sidearm, a melee slot, the flare gun), the comms room's gun rack and the tool belt; ammo types (tap B to reload, hold B to choose); inspect cards for special items (watch, read or keep); one power unit (a battery = 100, the fence's capacity 300, cells shared with the alien quad); flares out of the opening; a scripted health floor for set pieces; **the pause menu and save and quit** (moved forward from M16: runs are now long). **10.2 The map** *(built, Session 21)*: the fixed story spine (story places placed first, the same every run, like the cluster), the 1903 railway line, the road north and its ROAD CLOSED barrier, the cave's brush; optional encounters dealt by the seed; the interior system. **10.3 Spikes** (rough, debug only, measured on the tablet): about 150 zombies at the station; the procedural four-path forest (the place beyond, later the realm of stories); a flying enemy (the Mothman's flyovers and dives); a part bolted onto the dozer | The opening still plays through on every seed with the new systems; a save mid-run quits and continues; each spike has a measured go / change-the-design answer, written into this doc |
| M11 | **Plane to Junie** (story beats 1–5) | The crashed plane (the grey's AI, the quick draw, its drops); the Mothman's model and the crash-site fight (the 10% floor, the blackout); Junie taken (the time cut, the family's account); the Caller as a voice (lures, taunts, comms lost in the south); the old church and the time capsule; the stairs and the place beyond. **Optional:** the railway cutting (the spike maul, dynamite, the armour part), Milo's barn (Milo, the act, the morning reveal) | Junie is brought home on every seed, and the south's radio is only the Caller |
| M12 | **Bigfoot** (beats 6–7) | The family's plan and Earl's maps; the military's dozer on the cordon strip (the grappling hook and winch); the bug-zapper night at the station (the lure flares, the family battle, the fence drained); the Bigfoot cave (seeded interior, the eggs, giant moths, the Mothman killed); Bigfoot's model, the cocoon, the Blessing (buried at home; comms back); the Caller gone. **Optional:** the mineshaft (the cage lift, the turret cart, giant moths first, the plunger escape, the ram part) | The Blessing works at home, the family's voices reach the south, and the Caller never speaks again |
| M13 | **The mega night and the mothership** (beats 8–9) | The quad going missing (the scorched ring, the icon gone); the mega night (about 150 zombies; the Hollow, the Screamer, the Hanged; the difficulty rise); Ellen's ask; the crashed UFO's beam; the mothership (hand-built interior, the cowboy-drift aliens' AI, the core room, the hangar); the big core at the fence; the alien quad in the story. **Optional:** the sawmill (the chainsaw, the station's workbench, the head saw part) | The station survives the mega night when it's ready for it, and Tom comes home with the core and the alien quad |
| M14 | **The Car Armory and Sheriff** (beat 10) | The Car Armory in the south (Men in Black zombies; the barricaded survivors and Men in Black AI; the stealth section; classified documents 1–5); Sheriff freed; the ute turret chase; the turret and the restocking charges; the garage, Sheriff at home, his upgrades (guns, ammo, vehicles); the ute's gun locker *(proposed)*. **Optional:** the moonshiners' holler (the traps, the wire cutters, the still, the flamethrower part) | All three unique prizes come from the world; Sheriff's upgrades work; all five designed optional encounters give their parts |
| M15 | **The endgame** (beats 11–12). **Waiting on Aaron's design** of the final battle and the realm of stories | As designed so far: the killdozer (Sheriff's base build plus the encounters' parts); Ground Zero (anomalies, documents 6–8); the portal and the realm of stories (seeded arenas, the family's imagined help, Bigfoot answering Junie); breaking the anchor; the witchfire ring round the hut; the witch's scripted beats through the story; the final battle | A full run goes from Day 1 to the witch's death on the story spine, on every seed |
| M16 | Meta and persistence | Achievements, modifiers (Coven included), run summary (save and quit moved to M10) | Achievements and modifiers survive permadeath and a browser restart |
| M17 | Art and audio | Final sprites and models, the full lighting, fog and post-processing pass, grain and camera-style shaders, the audio pass, the final HUD | Matches the art and audio direction |
| M18 | Balance and polish | Tune every number, the remaining dialogue lines, performance pass, bug bash | A full run lands in its target length (Aaron, Nov 8: a longer run is accepted, 4+ hours; to set once full runs are played) and feels fair |

### The M10.3 spikes (Session 22): results

Rough, debug only (the debug menu's **Spikes (M10.3)** category), each measured headless (swiftshader in the cloud, about 5 fps, so frame times there mean little; draw calls and simulation time carry over) and **to be measured on the tablet by Aaron** (Demo mode's corner readout and the debug overlay). Each answer is **go** unless the tablet says otherwise.

| Spike | What was built | Measured (headless) | Answer |
| --- | --- | --- | --- |
| **About 150 zombies at the station** | Nothing new needed: Demo mode sends up to 150 at the fence (`DemoMode.send()`); the tiers do the rest | Draw calls 95 with none, 96 with 150 (every zombie sprite is one instanced draw); 25 active (the cap), the rest nearby; simulation 1.9 ms at 50, about 2.5-2.7 ms at 100-150 (pool 160 of 480). Aaron (Session 22): "max zombies heaps of times" without a dip; 40-50 fps on the tablet as a rule. **Tablet (Aaron, round 34): 57 fps with 150 at night in Demo mode** | **Go (confirmed on the tablet).** The mega night (M13) can send about 150 at home. To watch: the fence and turret with 150 at once, and the mega night's new kinds (the Hollow, the Screamer, the Hanged) on top |
| **The procedural four-path forest** (the place beyond; later the realm of stories) | `encounters/PlaceBeyond.js` on the interior system, rules in `world/placeBeyond.js` (tested): a square pocket under the stairs' clearing, a clearing and four paths, the trees re-dealt in place for each clearing; trunks block; a fog dome round Tom; Junie's call (placeholder sound and caption) down the two calling paths; three silent in a row find her, a calling path loops to the start | 4 draw calls for the whole space (two instanced meshes, the floor, the dome), about 27 in all with the HUD (against about 95 outside); about 270-290 trees a clearing; a new clearing costs no new draws (instance matrices). **Tablet (Aaron, Session 23): about 57 fps, dips to 40 only when something hectic happens** | **Go (confirmed on the tablet).** Interiors carry a procedural space cheaply; the realm of stories can take the same shape with arenas. The way back from the first clearing leads out (Aaron: good, #377); Junie's caption stays for accessibility though he imagined it by ear (#379). Open: the look (#378), her recorded lines |
| **A flying enemy** (the Mothman's flyovers and dives) | `ai/Flyer.js`, steering in `ai/flyerPath.js` (tested): from far off, circling, two passes overhead, dives that strike if they reach him, then it leaves; one of the weapons' extra targets (shot where it flies); can't die out here (below 35% it flies off) | Four meshes, no lights (the eyes unfogged); its steering is a few lines a frame; the hitscan finds it in the air (tested). **Tablet (Aaron, Session 23): about 57 fps, dips to 40 only when something hectic happens** | **Go (confirmed on the tablet).** A flyer needs no new systems: steering, an extra target, its own script. No aim assist on it (Aaron: "it's fun", #384). Open: its numbers, what it does between dives and the screech's blur and slow (not built, #385) |
| **A part bolted onto the dozer** (the killdozer's) | `world/dozerParts.js` (tested), `render/dozerParts.js`: a spiked ram (pushes harder), armour plating round the cab (nothing climbs on), a head saw out front (shreds before the blade; big trees go in a moment; it spins while ridden); blade parts ride the blade arm (they lift and dig with it). The plating is waist high so the driver sees over it (round 34, Aaron: the first version blocked the view) | One merged mesh a part (the saw two): +1-2 draw calls each; the effects are multipliers on `config.dozer.crush` and the tree strain, stacking. **Tablet (Aaron, Session 23): about 57 fps with all three on, dips to 40 only when something hectic happens; he can see over the plating (round 35)** | **Go (confirmed on the tablet).** Parts are data (a look and multipliers), so each optional encounter's part can be a config entry and a small builder. Open: the parts' looks and numbers (#386), parts that need their own system (the flamethrower, the turret) |

### Performance gates

Check on the Samsung tablet, against the budgets, at the end of **M1, M3, M6, M9 (the outpost), M10 (the spikes: 150 zombies, the procedural forest), M12 (the cave), M13 (the mega night and the mothership), M14, M15 and M18**. If a gate fails, fix performance before starting the next milestone.

### Main risks and how we handle them

| Risk | Mitigation |
| --- | --- |
| A big living map is too slow in a browser | Dynamic resolution and LOD tiers early (M1, M6); every gate measured on the real tablet; the Quality setting as a fallback |
| Controller aim feels bad | Combat feel is its own milestone (M2), before content |
| The core loop isn't fun | The vertical slice and play-test gate after M7, before any content |
| Scope creep | Content is data-driven and comes after the gate; new ideas go to `OPEN_QUESTIONS.md`, not into the current milestone |
| Saves breaking between versions | Versioned saves; incompatible saves discarded cleanly |
| The agent loses context between sessions | This doc plus `STATUS.md`, read at the start of every session |

## Team roles and session plan

The game is built by a series of Claude Code sessions, each playing one game-development role. Each session is a fresh conversation that picks up from the files in the repo, not from chat history. Each is scoped to a manageable amount of work, well under \~400k tokens of context, so quality stays high.

### Roles

| Role | Owns |
| --- | --- |
| Lead Engineer | Architecture, core systems, input, saves, simulation LOD, performance, deployment |
| Graphics Engineer / Technical Artist | Renderer, sky, fog, lighting, flashlight, forest, post-processing, shaders, visual polish |
| Gameplay Programmer | Player feel, weapons, combat, the station and its defences, interactions |
| AI Programmer | Zombies, the witch, beetles, the Mothman, aliens, Men in Black, detection, spawning |
| Level & Encounter Designer | Encounters, interiors, sigil grounds, map content |
| Narrative Designer | Dialogue system, radio, cutscenes, lore items, writing lines (with Aaron) |
| UI / UX Programmer | HUD, menus, ledger, forecast, map screen, modifiers and achievements screens |
| Audio Designer | Sound engine, ambience, stingers, adaptive music, dialogue blips |
| QA & Balance | Play-testing, bug fixing, tuning config numbers, performance checks on the tablet |

### Session order

Building and styling alternate, so the game looks better as it grows instead of all at the end.

| # | Role | Work | Milestone |
| --- | --- | --- | --- |
| 1 | Lead Engineer | Project skeleton, GitHub Pages deploy, input, debug tools | M0 |
| 2 | Graphics Engineer | Renderer, dynamic resolution, sky, fog, forest, flashlight shadow, movement scene | M1 |
| 3 | Gameplay Programmer | Combat feel: shovel, rifle, shotgun, one zombie, health, armour, healing | M2 |
| 4 | Lead Engineer | Map generation, chunks, colliders, fog of war, minimap | M3 |
| 5 | AI Programmer | Sigils, zombie levels, variants, hordes, mutants, detection, targeting | M4 |
| 6 | Gameplay Programmer | The ranger station, fence, turret, ledger, vehicles and batteries | M5 |
| 7 | Lead Engineer | Simulation LOD, simulated nights, forecast, alarm, autosave | M6 |
| 8 | AI Programmer | The witch, hut, explosives, final battle, ending: the vertical slice | M7 |
| 9 | QA & Balance | Test the slice on the tablet, fix bugs, tune; prepare Aaron's play-test | Gate |
| 10 | Graphics Engineer | Style pass 1: make the slice look good (ground, trees, mist, post-processing). 10b: the guns, a sniper rifle and four more guns | Part of M17 |
| 11 | Lead Engineer (design review, with the Narrative and Level & Encounter Designer hats) | Folded in Aaron's story and encounter design (the opening cluster); reviewed DESIGN.md against what's built; redid the milestones and this plan. No feature code | — |
| 12 | Narrative Designer | Story systems: dialogue and picker, subtitles, radio, trail cameras, the cutscene system and its looks, lore hand-ins, the Cutscenes debug category; wire up the existing lines. **Done** (12a and 12b in one session; the looks are a first pass for Aaron to react to) | M8 |
| 13 | Graphics Engineer / Technical Artist | Characters and the deferred art, play-test driven. **Done:** a debug model viewer; the zombies' variety (a palette swap), army camo and helmet loss, Men in Black zombies, Earl Pruitt; the mutant, the witch, the family, the grey alien and the cowboy drift, the giant beetle, the armed Men in Black; the cars (four types and their wear), the station's interior, the witch's hut. Frontier creatures still to model: Bigfoot and the Mothman (before M10) | Part of M17 |
| 14 | Lead Engineer | The cluster on the map: fixed sub-graph, road, cordon, gates, progress flags, the witch's cluster rule, the flare gun. **Done** (and the storm shelter's fixed camera, #153; the gates' and checkpoint's triggers are stand-ins for Sessions 15-17's beats) | M9.1 |
| 15 | Level & Encounter Designer (+ Narrative) | First day: main menu, opening, Day 1 and the campsite, the scripted Night 1, Dawn 1, Skip intro; its lines written with Aaron. **Built** | M9.2 |
| 15b | Level & Encounter Designer (+ Narrative) | Aaron's play-test of the first day and its tweaks | M9.2 |
| 16 | Level & Encounter Designer + AI Programmer | The storm shelter and the gas station, the rifle chain; their lines. **Built** (and two playthroughs of the opening: objectives, D-pad down to watch, papers in close-up) | M9.3 |
| 17 | Level & Encounter Designer + AI Programmer | The military outpost, helmets, beetles, the dogfight; its lines; the performance gate. **Built** (and three rounds of Aaron's playthrough notes: escaping the witch early on, no dialogue in cutscenes, breadcrumbs, everything readable again from the ledger, the gun pit's machine gun). The tablet's frame rate at the outpost is Session 18's | M9.4 |
| 18 | QA & Balance | Full runs through the opening on the tablet: pacing, ammo and loot, the dusk choice, bugs. **Rounds 1-5 built** (round 5: his second notes, the outpost reordered, the scanner's battery; rounds 1-3: Aaron's early-game notes: papers taken with A, the pumps blow, a 2 s dig, a stop at home, barricades outside the fence; the outpost's beats spaced out, C-7 by the road in, the beetles' burst; an ammo audit and a sure 6 rounds in the gun pit). **Done** (rounds 25-27 still to be play-tested at the start of Session 19) | QA |
| 19 | Graphics Engineer | Style pass 2: the opening cluster's places (campsite, gas station, storm shelter, outpost, the cordon and the road) and their camera looks. **Done** (one pass, unattended): a shared props kit (one vertex-coloured mesh per place, weathered as it's baked: grime, mottling, rust; the glare rule's ceiling enforced and tested); every place dressed; C-7 seated on its slope; the barricades at home, the cordon, the road and the gates; the camera looks (the camcorder's focus hunting and date stamp, the trail cams' data strip, the scope's mil-dot reticle and sway, the sweeps' grade, the reveals' jolt). Draw calls down (the worst spot 203 to 157) | Part of M17 |
| — | (side pass, Aaron's request) | **Experimental vehicles, debug menu only:** the ute with a turret, the alien quad, the forestry dozer (it fells trees and cuts trails into the map). **Done** and play-tested by Aaron ("really good"); not in the story yet | — |
| 20 | Lead Engineer + Gameplay Programmer | The new systems: the healing pool, loadout, gun rack and tool belt, ammo types, inspect cards, power units, flares out of the opening, the health floor; the pause menu and save and quit. **Built (Nov 8)**; Aaron's play-test is PLAYTEST round 31 | M10.1 |
| 21 | Lead Engineer | The map: the fixed story spine, the railway line, the road north and ROAD CLOSED, the seed dealing optional encounters; the interior system *(built)* | M10.2 |
| 22 | Lead Engineer + AI Programmer | The spikes: 150 zombies, the procedural four-path forest, a flying enemy, a dozer part; the performance gate. **Built** (each a go, headless; the tablet's numbers still to come), and **Demo mode** on the main menu (Aaron's idea); the flicker frame fixed | M10.3 |
| 23 | QA & Balance | Play-test the opening with the new systems; save and quit on the tablet. **Done** (headless on seeds 1234, 7, 4242, Day 1 to past the cordon, Save and quit at five points; two bugs fixed: the dawn save's missing flags, the safe's rifle racked by itself, now a choice; the rack shows its guns). **M10 closed**, Aaron's round 36 to confirm on the tablet | QA |
| 24 | Graphics Engineer / Technical Artist | Models for the next stretch: the Mothman, giant moths, Bigfoot, Milo (and his animals), the crashed plane's set | Part of M17 |
| 25 | Level & Encounter Designer + AI Programmer | The crashed plane (the grey's AI, the quick draw) and the Mothman at the crash site | M11 (part 1) |
| 26 | Level & Encounter Designer + Narrative Designer | Junie taken, the Caller, comms in the south, the old church and the time capsule; their lines | M11 (part 2) |
| 27 | Level & Encounter Designer | The stairs and the place beyond; Junie home | M11 (part 3) |
| 28 | Level & Encounter Designer + AI Programmer | Optional: the railway cutting (spike maul, dynamite) and Milo's barn | M11 (part 4) |
| 29 | QA & Balance | Play-test beats 1–5 and the two optionals | QA |
| 30 | Level & Encounter Designer + AI Programmer | The dozer on the cordon strip and the bug-zapper night | M12 (part 1) |
| 31 | Level & Encounter Designer + AI Programmer | Optional: the mineshaft (the turret cart, giant moths) | M12 (part 2) |
| 32 | Level & Encounter Designer + AI Programmer | The Bigfoot cave, the Mothman killed, Bigfoot, the Blessing | M12 (part 3) |
| 33 | QA & Balance | Play-test to the Blessing; the performance gate | QA |
| 34 | Graphics Engineer | Style pass 3: the frontier so far (the plane, the church, the place beyond, the cave and its interior, the optionals) | Part of M17 |
| 35 | Level & Encounter Designer + AI Programmer | The missing quad, the mega night and the new zombie types | M13 (part 1) |
| 36 | Level & Encounter Designer + AI Programmer | The crashed UFO, the mothership, the aliens, the core and the alien quad | M13 (part 2) |
| 37 | Level & Encounter Designer + Gameplay Programmer | Optional: the sawmill (the chainsaw, the workbench) | M13 (part 3) |
| 38 | QA & Balance | Play-test to the mothership; the mega night on the tablet | QA |
| 39 | Level & Encounter Designer + AI Programmer | The Car Armory, Men in Black, the stealth section, Sheriff, the ute chase | M14 (part 1) |
| 40 | Gameplay Programmer | The garage, Sheriff's upgrades, the turret and the restocking charges | M14 (part 2) |
| 41 | Level & Encounter Designer | Optional: the moonshiners' holler (the traps, the wire cutters, the still) | M14 (part 3) |
| 42 | QA & Balance | Play-test to Sheriff; the performance gate | QA |
| 43 | Lead Engineer (design review) | Fold in Aaron's endgame design and re-plan M15's sessions. No feature code | — |
| 44–46 | Level & Encounter Designer + AI Programmer | The endgame, as planned in Session 43: the killdozer, Ground Zero, the realm of stories, the hut and the final battle | M15 |
| 47 | QA & Balance | Full runs, Day 1 to the witch; the performance gate | QA |
| 48 | Graphics Engineer | Style pass 4: the south, the interiors, the realm of stories | Part of M17 |
| 49 | UI / UX Programmer | Final HUD, menus, settings (Quality levers, retro filter), achievements, modifiers, run summary | M16 |
| 50 | Audio Designer | Audio engine, ambience, stingers, music, blips | Part of M17 |
| 51 | Narrative Designer | Write the remaining dialogue and document text with Aaron | Part of M18 |
| 52 | Graphics Engineer | Final style pass across the whole game | M17 |
| 53 | QA & Balance | Full-run balance, performance pass on the tablet, bug bash | M18 |

Sessions are a guide, not a contract: split any session that grows too big into parts ("12a", "12b"), and add QA or style sessions whenever they're needed.

### Handover protocol

Every session follows the same routine so the next one can pick up cleanly.

**At the start of a session:**

1. Read `docs/DESIGN.md`, `STATUS.md` and `HANDOVER.md`.
2. Confirm in one short message: your role, the session number, what you're about to build, and anything in `HANDOVER.md` you need Aaron to clarify.
3. For content work, propose the build plan and workshop it with Aaron first (rule 10).

**During the session:**

- Stay inside your role and session scope. Note anything outside it in `HANDOVER.md` for the right role instead of doing it.
- Commit working code regularly with clear messages.
- If the session is getting long, stop at the next clean point and hand over early rather than pushing on. A partly finished session that hands over cleanly is better than a finished one that's muddled.

**At the end of a session:**

1. `npm run build` and `npm test` pass; the game runs; changes are pushed so GitHub Pages updates.
2. Update `STATUS.md`: what exists, what works, what's stubbed, known bugs.
3. Rewrite `HANDOVER.md` for the next session:
   - Session number and role just finished, and what was done.
   - What's left unfinished, if anything.
   - The next session's number, role and goal (from the session order).
   - Files and systems the next role should look at first.
   - Gotchas, decisions made, and open questions for Aaron.
4. Give Aaron the play-test script.
5. End with the handover signal, exactly in this form:

> **✅ HANDOVER READY**: Session 5 (AI Programmer) complete. Next: Session 6, Gameplay Programmer: the ranger station.

If the work isn't finished, end with **⏸ HANDOVER (PARTIAL)** instead, saying what's left; the next session continues it under the same role.

### Session kickoff prompt (paste into each new Claude Code session)

```
You are the [ROLE] on Witch Hunt, Session [N].
Read docs/DESIGN.md (especially "Build plan" and "Team roles and session plan"), STATUS.md and HANDOVER.md.
Then confirm your role, this session's goal and any questions before starting.
Follow the handover protocol, and end with the HANDOVER READY signal.
```

## Ideas for later

Ideas that came up while designing and don't belong to one section yet. Workshop with Aaron before building.

- **The Caller's first whisper.** *(Nov 8: still fits, as long as it comes after the cordon strip was cut and before Junie is taken; the Caller is now a voice only, from the forest's own story.)* On the walk *back* from an encounter (never Day 1), the radio crackles for half a second with something that isn't the family, a wrong voice or a wrong texture, then snaps back to normal. Nobody acknowledges it and nothing explains it. It's an early, deniable seed for the Caller, placed in the comedown when the player thinks the action is over and the loop is resetting. Players who meet the Caller later may realise it was there all along.
- **Setting year: 2003 (decided with Aaron, Oct 17).** Late enough for phones and computers, but before everything went fully digital and connected. Patchy cell coverage in deep Appalachian forest is believable, so the radio, trail cams, camcorder (miniDV) and VCR tapes all earn their place, and the analog CCTV and grain aesthetic is honest rather than affectation. It touches the campsite camcorder, the storm shelter's VCR and tapes, the station's radio and CCTV, and the overall art and audio feel. **Settled:** the time capsule was buried in **1903** (it had said the 1920s), so it falls due in 2003, the year of the game: the town's capsule is opened on schedule, by the wrong person, for the wrong reason.
- **Bigfoot as a true nature spirit (Aaron, Oct 16).** Bigfoot is not a portal creature. He has been in these woods at least since the gas station owner's first sighting in the late 1980s, and in truth far longer than any of them, long before the government opened the portal, so he belongs here in a way nothing else in the game does. It sharpens the three-sided story: the family are newcomers, the witch is a true outsider who came through the tear, and Bigfoot is the oldest rightful presence. The portal let the hostile things in; it didn't make Bigfoot, who is older than the wound. It also recasts the owner's long-ago sighting as a glimpse of the land's own guardian, the gentlest presence in the story. Consistent with the Native American influence section and the Bigfoot cave (he's the forest's guardian; the Blessing is old protective land magic); the backstory's "Americana made real" list has been updated so he's no longer counted among the portal creatures.
- **The battery gate.** A sealed gate with no power, where fitting a battery opens it onto a horde: a real choice to open it or not. Cut from the military outpost because you could shoot through chain-link, which kills both the drama and the ammo economy. It needs a spot where the horde is truly sealed off and can't be shot through (solid doors, a bunker, a container yard).
- **Exploding cars: built (Aaron, Session 14).** Rounds that stop on a car, flares and blasts damage it: it smokes at 40%, catches fire at 80% and burns down the rest itself, and explodes at 300 damage (the charges' blast, a little smaller), hurting zombies, the witch and the player nearby and leaving a burnt-out, empty wreck. Close-parked cars go up in a chain (`config.vehicles.damage`).
- **Make the walk back matter (a candidate design pillar).** The game is a push north to south, but every push creates a return trip. Seed keys, combinations, tools and knowledge in the south (and across encounters generally) that unlock new value at places already visited in the north, so return journeys are rewarding re-reads of the map rather than dead travel. The first instance is the hunting rifle chain: the gas station safe, the storm shelter combination and the outpost's watchtower ammo. *Nov 8:* Milo's morning reveal and the Bigfoot cave by the gas station both pay it off.
- **Quad bike upgrades (Aaron, Session 16; Nov 8: Sheriff fits them at the garage).** Upgrades for Earl's quad, bought with scrap and maybe materials found during play: a **spiked battering ram** on the front (ramming the dead harder), and perhaps an **alien ray gun** that can be fired while driving (the one exception to "no shooting from the saddle"). More ideas to come. **The alien quad** (built, debug only) tries out the ray gun idea: plasma bolts, a charged orb and a boost.
- **The experimental vehicles as unlocks (Aaron, Nov 6).** The ute with a turret, the alien quad and the forestry dozer are built and playable from the debug menu, not yet in the story. **Answered Nov 8:** all three are in the story (the military's dozer on the cordon strip, the greys rebuilding Earl's quad, the ute from the Car Armory's motor pool; see Player: vehicles Tom drives) (OPEN_QUESTIONS #321, #332). The dozer's trail cutting is the first thing that changes the world's map for the rest of a run.

## Open questions

- The full text of the 8 classified documents (outlines are done).
- The rest of the dialogue lines (Day 1 is written; about 130–150 to go).
- **The Nov 8 story spine** (see Encounters) leaves these open:
  - **Run length:** settled Nov 8: a longer run (4+ hours) is accepted; the exact target is set once full runs are played (M18).
  - **The endgame's design** (the final battle and the realm of stories): Aaron is designing it; M15 waits on it.
  - **The optional encounters** (Nov 8): Milo's killdozer part; whether the moonshiners give the auto shotgun; which encounter gives the heat-scope semi-auto (the SMG is settled: wherever there are dead Men in Black, the sawmill included); the lore of what happened at the sawmill between the loggers and the agents (to write later); the rest of the pool (the Flatwoods landing, the convoy, the listening post, the Horseman bridge); how many appear per run; Milo's lines; Milo's year (the story has a 2009 Civic and mentions 2019; proposed: Witch Hunt happens years before it); whether the family can imagine Milo in the realm of stories; the railway cutting's radio.
  - The mid-game layout: which places are fixed and where (only the crashed plane is fixed so far); which end of the cordon strip the dozer is parked at.
  - The witch's scripted beats along the story; how the hut's witchfire ring sits with killing her early in pathway fights.
  - The mothership's interior and beats; the Car Armory's layout, stealth beats and survivors; Sheriff's lines and look; the upgrade list and costs.
  - The Bigfoot cave's final chamber; whether driving the Mothman off at the plane still means Junie is taken.
  - The Caller's taunt lines, the plaque and capsule text, and the radio lines for these beats.
  - Whether the Caller is ever seen at all (leaning no); what the place beyond and the realm of stories look like; whether other staircases still appear.
  - What the station needs the big core's power for, beyond surviving (proposed: the comms room's big radio reaching the outside world).
  - How the mega night's 150 zombies fit the performance budget; the new zombie types in detail.
- Which encounters give the SMG, the heat-scope semi-auto and the auto shotgun (OPEN_QUESTIONS #143). *Nov 8:* the SMG can be found wherever there are dead Men in Black (the sawmill's agents, the Car Armory); the auto shotgun is proposed for the moonshiners' holler; Aaron is looking for a spot for the heat-scope rifle. The hunting rifle is settled (the gas station's safe).
- More achievements that don't unlock modifiers.
- Exact numbers for everything marked config: settled in play-testing (M18).
- Candidate entities for later, not in scope: Jersey Devil, Dogman. (*Nov 8:* the Flatwoods Monster and the Headless Horseman are now named optional encounters: the Flatwoods landing and the Horseman bridge.)
