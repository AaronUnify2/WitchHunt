# Witch Hunt — Game Dev Doc

Oct 9, 2026 · @Aaron

## How to use this doc

This is the single source of truth for building **Witch Hunt**. It is written for a coding agent (Claude Code) and for Aaron, the designer.

- Every decision here is final unless it is listed in **Open questions** at the end.
- Every number is a **placeholder** that belongs in `config.js`, not in code.
- Build in the order given in **Build plan**. Do not build ahead.
- Where the doc is silent, pick the simplest option, make it a config value, and log it in `OPEN_QUESTIONS.md` in the repo.

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

## Core loop

The game runs on a repeating day/night cycle. Each night the witch plants more sigils, so pressure rises until the player kills her or is overrun.

1. **Day (explore).** Few enemies. Travel the pathways, loot, dig up sigils, follow the witch's trail, visit encounters.
2. **Dusk (decide).** The forecast shows the station's security against tonight's danger. Spend scrap on repairs and defences.
3. **Night (defend or hunt).** Sigils raise zombies. The witch roams and plants. Hold the station, or go out and interrupt her.
4. **Dawn (recover).** Enemies thin out. Damage carries over. Autosave. Repeat.

**Early-game shape:** for the first few nights the player can't safely leave, so it's explore by day, defend by night. Once security beats danger by a safe margin, night hunting opens up: the shift from survival to pursuit.

### Time

- Day/night length is config. Starting point: 8 min day, 6 min night, 1 min each for dusk and dawn (about 16 min per cycle).
- The clock is always on the HUD.

### Run length and saving

- A run should feel like a long board game session, like a game of Monopoly: roughly 1.5–2.5 hours across about 6–10 nights. Tune the witch so a skilled player can corner her around night 6–8.
- **Permadeath:** one life per run, a new map seed each run.
- **Saving:** autosave at each dawn; save and quit from the pause menu. One save slot per run, deleted when the run ends (win, death or overrun).
- **The save stores:** seed, clock and night number, player stats and inventory, armour bars, revealed map, station state (defences, damage, fence charge, turret ammo and mode), sigils, enemies, witch state and wounds, looted containers and vehicles, prizes secured, documents found, dialogue lines heard, Mothman attention, Men in Black state.
- **Persistent across runs** (stored with settings, never deleted): achievements, unlocked modifiers, Skip intro.

## Player

The player is **Ranger Tom Hale**, a park ranger and a silent protagonist. First-person.

### Controls

| Xbox controller | Keyboard / mouse | Action |
| --- | --- | --- |
| Left stick | WASD | Move |
| Right stick | Mouse | Look |
| L3 | Shift | Sprint (uses stamina) |
| R3 | C | Toggle crouch |
| A | Space | Jump |
| RT | Left click | Attack / fire |
| LT | Right click | Aim down sights |
| X (hold) | E (hold) | Interact: dig, search, build, repair, fit battery, plant charge |
| B | R | Reload |
| RB / LB | 1–4 / scroll | Next / previous weapon (decided with Aaron in M2; LB instead of Y from M5) |
| Y | F | Fire flare (Y from M5; was LB) |
| D-pad up | M | Full map |
| D-pad left | L | Toggle flashlight |
| D-pad right | H | Use a first aid kit (decided with Aaron in M2) |
| D-pad down | V | Radio home (e.g. to check a suspicious call) |
| View | Tab | Inventory |
| Menu | Esc | Pause, save and quit |

- Light aim assist (slowdown near targets), adjustable stick sensitivity and dead zones (config).
- **Headshots** do extra damage (config multiplier; Aaron in M2: ×2 at least, open to ×3–4; M2 uses ×3).
- Detonating planted charges: a remote, selected like a weapon (RB / LB) and fired with RT.

### Movement, flashlight and stealth

- **Sprint** uses stamina. **Aiming and firing slow the player** (config, e.g. 0.6×), which matters against fast zombies.
- **Flashlight:** toggle, no battery to manage. Essential in the dark, but makes the player much easier to spot.
- **Crouch:** toggle. Slower (config, e.g. 0.5×), quieter, smaller silhouette.
- **One detection model for every enemy:** distance, line of sight, light level, flashlight on/off, crouching, and noise (sprinting, gunfire).
- **Crouched with the light off, the player is much harder to see:** zombies notice from much closer, Men in Black can be slipped past or quietly taken down, and the player can watch the witch plant without spooking her.
- **Trade-off:** dark and low is slow and hard to see by. Good for sneaking and ambushes, bad for running from a horde.

### Weapons

The player starts each run with the **shovel**, the **flare gun** (and a few flares) and the **ranger service rifle** with only a handful of rounds.

| Weapon | Role | Where it comes from | Damage (placeholder) |
| --- | --- | --- | --- |
| Shovel | Melee, digging, quiet takedowns | Start | 20 |
| Service rifle | Long range, good against the witch | Start | 25 per round |
| Shotgun | Close range, crowd control | Campsite (guaranteed, every run) | 8 pellets × 6 |
| Pistol | Reliable sidearm | The crashed plane (pilot's pistol) | 10 per round |
| Hunting rifle (scoped, bolt-action) | Kills with a headshot (Aaron); punches through a line of zombies. Its own rare rounds; the scope doubles as binoculars | The gas station's gun safe, opened with the owner's combination (storm shelter); its rare rounds are in the military outpost's watchtower | 50 per round (150 to the head) |
| Semi-auto rifle (heat scope) | The hunting rifle's rounds, 10 at a time; its scope shows the living white-hot | An encounter (Session 10b; which one is open) | 50 per round |
| SMG (MP5-style) | Full auto; fires pistol rounds | An encounter (Session 10b; which one is open) | 10 per round |
| Auto shotgun (AA-12-style) | Full auto, a 20-shell drum; fires shotgun shells | An encounter (Session 10b; which one is open) | 8 pellets × 6 |
| Flare gun | Light; lures zombies | Start | — |
| Explosive charge | Remote-detonated blast | Mineshaft, military outpost, Car Armory | Config |

- **Alien shotgun shells:** 150% of a normal shell's damage, with a purple muzzle flash. From aliens.
- Damage values live in one weapon table in config; the turret's ammo conversion reads from it.

### The shovel and digging

- Main melee weapon: short range, no ammo, silent.
- **Hold interact** on a buried sigil to dig it up over a few seconds. Taking damage interrupts digging.
- The same action digs open the storm shelter hatch, digs up the time capsule, and buries the Bigfoot's Blessing.

### Health, armour and healing

**Health:** 0–100. No natural regeneration. Death at 0 ends the run.

**Armour:** three separate bars, each 0–100 (up to 300 total). Armour is never an inventory item: pickups are consumed on the spot and added to their bar. Pickups stack within a type (two vests = 80 ballistic). Armour never regenerates.

| Armour | Colour | Comes from | Per pickup | Supply |
| --- | --- | --- | --- | --- |
| Ballistic | Grey-blue | Police zombies (vest), army zombies (helmet), Men in Black (body armour) | Vest +40, helmet +20, body armour +40 | Repeatable |
| Energy | Green-cyan | Aliens (alien shields) | +30 | Limited: the crashed plane's lone alien and the alien ship |
| Nature | Mossy green | Bigfoot's gift | +40 | One-off |

- **Damage order** (one config list): ballistic → energy → nature → health, so the commonest armour goes first.
- Energy and nature being limited is a starting position; revisit after play-testing.

**Healing:** first aid kits are kept in the inventory (stackable) and used from it or a quick-use button (D-pad right / H). No animation: the player keeps moving.

- Health climbs one point at a time at **10 per second**: a **first aid kit heals 30** (3 s), an **alien med kit heals 60** (6 s).
- A second kit used while one is working queues rather than stacks, so the 10/sec cap holds and nobody can spam-heal out of a burst of damage.
- Healing stops at 100; leftovers are lost.

### Resources and inventory

- **Scrap:** the catch-all for building, repairing and upgrading.
- **Batteries:** power the electric fence and turret. Taken from vehicles and some encounters. (Aaron, M5: no carry limit and no slowdown for carrying them, for now.)
- **Explosive charges:** carry at most two. Take carry slots.
- **Flares:** carry at most 3 (config). Few sources: start, loot tables, the crashed plane, the outpost.
- **Ammo** per weapon type, **first aid kits**, **lore items** (documents, logbooks, the camcorder, the time capsule).
- Limited carry slots, so trips home matter.

### Vehicles and batteries

- Abandoned cars and trucks sit along pathways, in clearings and at encounters.
- Searching the cabin and boot gives scrap and ammo.
- **Getting a battery is physical:** hold interact on the bonnet to lift it (animation and sound), then hold again to pull the battery. Never a menu loot.
- Each vehicle can be looted once per run.
- (Aaron, M5: four types to start, car, pickup truck, police car and army truck, with special one-off vehicles possible for later scenes; about 45 a map, about 60% with a battery. Pulling a battery is noisy, and some have an alarm that pulling the battery kills.)

## Map

A dense forest stored as a graph: **clearings** are nodes, **pathways** are edges.

### Structure

- **North to south.** The player always starts on the northern edge; the witch's hut is always deep in the south. The run is a push south.
- **Northern cliff.** A tall cliff runs along the north edge. Nothing comes from the north and the player can't go north.
- **22 clearings** (config): home, the witch's hut, one per encounter and one per sigil ground. The map is big on purpose: **1 km wide by 1.4 km north to south** (decided with Aaron in M3, to revisit after play-testing). Clearings and encounters are **data-driven**, so more can be added later without code changes.
- **Danger gradient.** Each clearing has a band (north, middle, south) and a 0–1 "southness" value that scales enemy strength, trap danger and how strange the encounters get.
- **Pathways** are walkable corridors through thick forest. Off-path forest is full of undergrowth that slows the player (and, less, zombies), so movement mostly follows the graph. Decided with Aaron in M3: it never blocks, so cutting through is a choice with a cost.
- **Ground:** gentle rolling hills, levelled in clearings (decided with Aaron in M3).

### Generation

- Seeded: place clearings with minimum spacing, connect with a spanning tree, add extra edges for loops.
- **Fixed rules:** the home cluster (the station on the northern cliff, the campsite, storm shelter, gas station and military outpost) is placed first, identical every run (see Fixed opening cluster); the hut deep in the south, many edges away; each encounter in its band.
- Randomised per run: positions, clearing types, loot, which non-guaranteed encounters appear, sigil ground positions, trail-camera positions. (Everything past the military outpost.)

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
- *(proposed)* The rest of the north band (barn, crashed plane, mineshaft, Car Armory and so on) now sits just past the outpost, in the frontier's northern edge.

**Soft-gated path order (the classic soft funnel).** The world stays continuous: paths open and close; nothing teleports.

| Step | When | What opens | On the forced corridor? |
| --- | --- | --- | --- |
| 1 | Day 1 | Only the path to the abandoned campsite | Yes |
| 2 | Night 1 onward | The way to the storm shelter, where the first sigil is planted, so the family's "go dig it up" works | *(open question; proposed: no, a short spur inside the cluster, reachable from Night 1 but never forced)* |
| 3 | Day 2, after the campsite | The path to the gas station: the player's guaranteed second outing | Yes |
| 4 | After the gas station, once the hunting rifle is claimed (safe + storm shelter combination), with Ellen's call to adventure | The path to the military outpost | Yes |
| 5 | Once the player has fought through the outpost | The checkpoint opens and the frontier takes over | Yes |

**The outpost is the genuine wall.** The M3 rule says off-path undergrowth only slows, never blocks. The home cluster is the deliberate, meaningful exception, and the block is the **military cordon** itself, not random terrain: the military sealed off the south, and the outpost's sandbag walls and checkpoint are the barrier. It's reinforced psychologically with signage, a checkpoint and the clear sense that Tom isn't supposed to go past. Tom's a ranger and this is nominally his forest, but the military have fenced off the south of it and won't say why. The player fights through the overrun checkpoint to open the south.

- *(proposed)* The cordon runs east to west across the map's full width (fence, razor wire and sandbags, cliff edge to cliff edge, or to dense impassable forest at the map's sides), with the outpost as its only gate, so the player can't walk around it.
- *(proposed)* The gates inside the cluster (campsite path → gas station path → outpost path) are lighter in-world blocks that clear through story beats: a locked ranger gate, a fallen tree Tom cuts, a code Wyatt radios.

**Call to adventure.** Ellen, who worked on the edge of the portal programme, knows what a quarantine zone means. When the witch's sigils turn up **outside** the military's containment zone, she realises containment has failed and sends Tom to the military checkpoint to report that the witch has escaped it. When Tom reaches the outpost, it's already overrun: the soldiers are dead, the containment has collapsed and nobody is coming. It's just Tom now. This is the big call to adventure and the point where the game lets go of the player's hand. It recasts the push south as Tom defying a failed cordon to find out what the military were hiding, which ties into Ground Zero and the portal backstory.

- *(proposed)* Ellen's realisation lands after the gas station (her line at that dusk or the next dawn), since by then Tom has seen the sigil and the witch herself on this side of the cordon. The outpost path opens with it.

**Plant wants here, pay them off out there.** The home cluster is where the game reliably seeds threads that pay off later. The authored zone hands the player their reasons to explore the unauthored zone.

- **The campsite** plants the witch on tape.
- **The gas station** plants the hunting rifle chain: the safe, and the owner's note pointing to the storm shelter.
- Future threads planted in the cluster should follow the same rule: the want is guaranteed every run; the payoff lives out in the frontier. (The hunting rifle chain is the exception: it completes inside the opening, so it always resolves.)

**The hunting rifle chain always completes (resolved Oct 16).** All three links are in the authored opening, so every seed has them: the gas station (the safe and the note) → the storm shelter (the combination on the owner's body at the hatch) → the outpost's watchtower (the rounds).

**Open question:** does the storm shelter sit on the forced corridor, or slightly apart as the Night 1 beat (the proposal above)? Since Oct 16 it is **required** either way: the outpost path needs the hunting rifle, which needs the shelter's combination. The question is only whether the game forces *when* it's done.

### Clearing types

Each clearing has a type that sets its look and its zombie variant mix (sigils planted there spawn that mix).

| Type | Feel | More common variant |
| --- | --- | --- |
| Bog | Low fog, soft ground | Citizens |
| Graveyard | Old stones, mounds | Citizens |
| Roadside | Abandoned cars, roadblock | Police |
| Checkpoint | Sandbags, wrecked jeeps | Army |
| Standing stones | Open, ritual feel | Even mix |

### The map screen and fog of war

- A round minimap on the HUD (it turns with the player, with a north marker) and a full-screen map (D-pad up), north up. Opening the full-screen map pauses the game, clock included (Aaron, M4).
- The map starts hidden. Areas are revealed only by visiting them (reveal radius), or from the station's lookout tower.
- Revealed areas show live enemy positions, including enemies in the abstract simulation tier. Unrevealed areas show nothing, even if the witch is there.
- Seen things are marked: home, sigils, vehicles, encounters, traps, trail cameras, the hut.
- Implementation: a low-res reveal texture over the map graph.

## The ranger station (home)

The player's home and base, set against the northern cliff. The family live here.

### Layout

- **Fence:** a chain-link electric fence runs in a semicircle from cliff to cliff. The cliff closes the north side, so the fence is the only way in.
- **Cleared ground** inside and outside the fence gives the turret and the player clear lines of fire.
- **Station cabin** in the centre, with the **fire lookout tower** beside it. Climbing the tower reveals the map within a large radius (config).
- **Comms room:** a fortified room inside the station with the radio, the CCTV monitors and the ledger. The family shelter here every night.
- **Three layers of defence:** fence → station front door → comms room door. Each has its own health and is repaired and upgraded with scrap.
- **Decided with Aaron in M5:** the fence is **12 segments plus a gate** due south that opens itself for the player. Runs start with the **east fence torn up, a little scrap and no charge**. Spare scrap goes on **barricades** (a second wall behind a segment), **spike traps** (outside a segment) and **floodlights** (four fixed poles), all at fixed slots.

### The ledger

A ledger book on the comms room desk is the one place to manage the whole station.

- Repair the fence and doors, buy and place defences, install the turret, fit batteries, load turret ammo, set the turret's fire mode, see the security breakdown.
- Paid for with scrap; deposits come straight from the inventory.
- Everything can also be done directly in the world (hold interact on the fence, the turret, the fence box).
- A full-screen book with pixel-font pages and tabs (Fence, Doors, Turret, Power, Upgrades), controller-driven. Doesn't pause the clock (config).

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
| Bigfoot's Blessing | +20, permanent |

### Electric fence and power

- Damages and slows enemies that touch it. Its security contribution scales with its stored charge.
- Fitting a battery at the fence box adds charge. Charge drains every night (a fixed amount plus a little per enemy hit), so batteries must keep coming in.
- The fence needs scrap to build and repair; batteries only power it. At zero charge it's just a weak barrier.
- The turret draws from the same charge.
- The **alien power core** adds a huge charge and drains far slower.

### The automated turret

One per run, from the Car Armory.

- **Power:** wired into the fence's charge. Unpowered = offline, whatever ammo it holds.
- **Aaron, M5:** its rounds carve through a crowd even more than the rifle's: make a spectacle of it. Until the Car Armory exists (M11) the debug menu gives it.
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

- **Danger** = sum over active sigils of (spawn strength × zombie level), weighted by closeness to the station.
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

## Enemies

### Roster

| Enemy | Where | Render | Behaviour |
| --- | --- | --- | --- |
| Zombie (citizen, police, army) | Forest, from sigils | Doom-style billboard sprite, 8 angles | The main enemy. Levels 1–5 |
| Mutant zombie | Forest, level 3+ | 3D | Giant, mutated, much more health. A mini-boss in the horde |
| Giant beetle | Mineshaft (a few), Bigfoot cave | 3D | Armoured shell; only the soft spot on its face takes full damage |
| The Mothman | Bigfoot cave (boss); the forest if flares are spammed | 3D | Flying dive attacks, disorienting screech, calls beetles |
| Men in Black | Government base, Ground Zero | Sprite or 3D (art pass) | Armed agents using cover; stealth-aware squads |
| Alien | Alien ship; one at the crashed plane | 3D | Hides behind cover, ambushes up close |
| The witch | Forest and hut | 3D | See The witch |

**Friendly:** Bigfoot (can't be harmed). Harmless: the animals in Milo's barn.

### Enemy targeting

Every few seconds each enemy picks a goal:

1. Player detected (see detection model) or closer than the station → go for the player.
2. Else station within its base radius → attack the defences.
3. Else → random walk along the pathway graph.

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

| Variant | Look | Drops |
| --- | --- | --- |
| Citizen | Everyday clothes | Mostly ammo, sometimes scrap, rarely first aid |
| Police | Uniform and bulletproof vest; tougher | Vest (+40 ballistic), pistol ammo |
| Army | Fatigues and helmet; tougher. The helmet blocks the headshot bonus, so they eat extra bullets. It comes off with enough damage, or a powerful enough round (the hunting rifle) punches straight through it; once the helmet is gone, headshots land normally (Aaron, Oct 16). First met on the military outpost approach | Helmet (+20 ballistic), rifle ammo (the main rifle ammo source) |
| Miner (mineshaft only) | Helmet and headlamp | Scrap, lamp batteries |

**Daytime:** most zombies thin out at dawn; a few stragglers wander the pathways by day.

### Men in Black

- Government agents guarding the base and covering up the disaster.
- **Detection states:** unaware until the player is in their sight in light, or makes loud noise (gunfire). Then the whole squad goes alert. Killing an unaware agent quietly (shovel) doesn't raise the alarm.
- Alert agents use cover and shoot from range.
- **Drops:** body armour (+40 ballistic), pistol ammo.
- First visit: fully staffed. Each return for explosives: a smaller squad.

### Aliens

- Martians. They hide behind crates and cover, wait until the player is close, then jump out.
- **Cowboy drift (running gag):** they've started adopting Americana. Near the ship's entrance they just carry shotguns; deeper in they add hats, bandanas and holsters; the deepest is a full saloon gunslinger. The costume doubles as a threat gauge.
- They use custom shotgun shells because Earth shotguns turned out to beat their ray guns.
- **Drops:** alien shields (+30 energy armour), alien med kits (heal 60), alien shotgun shells.

### Giant beetles

- The Mothman's brood. Armoured shell: body shots do little. A soft spot on the face takes full damage, so the player has to face them and aim.

### The Mothman

- A tall winged figure with glowing red eyes. Boss of the Bigfoot cave, fought in its deepest chamber.
- Flies around the chamber and swoops in for dive attacks; a screech briefly blurs the screen and slows the player; calls beetles from the tunnels; lands or clings to the walls between swoops (the window for heavy damage).
- **In the forest (flares):** every flare adds to a hidden attention meter that slowly drains. Spam flares and the Mothman arrives: wingbeats, red eyes in the treeline, dive attacks for a while, then it leaves. It can't be killed outside the cave; hurt enough, it flies off.
- **Origin:** it first came through at the abandoned mineshaft. *(proposed, reconciling Oct 16)* The military caught it there and were moving it through the military outpost, where it broke out of its container in transit; it then moved into Bigfoot's cave. The outpost hints at it but never names it.

### Flares

- **Lure:** zombies near a burning flare chase the flare instead of the player for its burn time (e.g. 20 s). Fire one away to drag a horde off, or toward a planted charge.
- **Cost:** too many flares draw the Mothman (above).
- **Capped:** carry limit 3 (config), few sources.
- **Flares never attract the witch.** A reliable lure plus explosives would make her too easy to trap.

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
- **Planting pace:** night 1 is safe, then 1–2 sigils a night (Aaron, M7).
- **Toughness:** about 3–4 good ambushes on the pathways to kill her outright, if she isn't given time to heal (Aaron, M7: "make her good and strong"; tune after play-tests).
- **Fight-or-flee score** = health % plus a bonus for being near her hut. High → attack; low → flee. She's far more dangerous near home.
- **Movement:** a Left 4 Dead–style agile runner (vaults logs, weaves, doubles back). Faster than the player on paths; slower while dropping traps. Simulated as a point on the graph when far away.
- **Planting interruption:** enough damage while planting (config) cancels the sigil; she then flees or attacks.

### Wounds and recovery

- Damage persists between nights. She recovers over 2–3 nights (config), mostly resting by day.
- While wounded she favours fleeing and plants fewer sigils. Sustained pressure keeps her weak.

### Traps

- Dropped while fleeing and placed around the hut approach. Denser closer to the hut, so they act as breadcrumbs.
- Snare (roots the player: mash A for about 2 seconds to break free, Aaron M7), hex totem (damage zone), alarm charm (calls nearby zombies).

### Two ways to fight her

1. **Pathway fights (optional, never forced).** Meet her by luck or by reading the map: sigil grounds, their tells, trail-camera sightings. Ambush her mid-ritual. She flees when hurt. She **can** die here, but realistically only after several encounters and a very good run.
2. **The final battle at the hut**, deliberately triggered by the player.

### Destroying the hut

- The hut is hidden deep in the south behind trap-lined approaches.
- **Only explosives** can destroy it: **two charges, planted at the hut and detonated together** by remote.
- The carry limit is two, so both are used on the hut and none can be brought into the final battle.
- Planting is dangerous: the approach is the most trapped area and she may come out to stop the player.
- Detonation is a **point of no return**.

### Explosives

- Sources: the mineshaft (one), the military outpost (one), and the Car Armory's crate, which restocks. The outpost is now every run (Oct 16), so every run has at least one early charge; a second depends on the mineshaft appearing. (This replaces the earlier "two, one or none" variety; revisit if one guaranteed charge makes the hut too easy to reach.)
- Also a general weapon: plant one as a trap on a path, or drop one while chased and detonate as enemies follow.
- Always manual detonation (no proximity trigger). The player is hurt if caught in the blast. Radius and damage are config.

### Final battle

- First-person cutscene: the hut explodes and the witch bursts out.
- **Blood night:** the game jumps to a special night: red sky, embers and ash, witchfire. **The clock freezes** for the whole fight. Detonating by day jumps straight to night (Aaron, M7).
- **The station is still attacked** (simulated), so a weak base can still be overrun mid-fight. Secure it first. The attacks run on in real time while the clock is frozen (Aaron, M7).
- **No escape:** the hut clearing is sealed (ring of thorns or witchfire). Her fight-or-flee logic is off; she attacks until one of them dies.
- **Attacks:** fast heavy swipes that punish standing still; summoning zombies; spamming snares and hex totems across the ground.
- Her current wounds carry in, so pathway fights beforehand make it easier.

### The ending

**Victory:**

1. First-person: the witch is consumed by her own witchfire and bursts apart in embers, sticks and bone. The red sky drains away.
2. CCTV montage: on trail cam after trail cam, the zombies collapse mid-stride.
3. Ground Zero's camera: the portal, open and humming all game, flickers and goes dark.
4. Dawn: the family come out of the comms room to meet Tom. Closing lines.
5. Run summary, then the main menu.

**Defeat:** the screen fades as the radio fills with static and the family calling Tom's name. No graphic scene. Run summary; the save is deleted.

## Encounters

Hand-built set pieces placed by the map generator. The campsite and gas station are the exception: they're part of the fixed opening cluster (see Map: Fixed opening cluster). Every encounter needs nine things: opening cutscene, aesthetic, enemies, loot, dungeon or not, lore, whether it appears every game, its band, and a novel interaction. All are designed below.

### Overview

| Encounter | Band | Appears | Placement |
| --- | --- | --- | --- |
| Abandoned campsite | North | Every run (fixed opening cluster) | Next to the ranger station; first gated path |
| Roadside gas station | North | Every run (fixed opening cluster; guaranteed witch sighting) | On a road edge; second gated path from home |
| Old barn (Milo the Clown) | North | Common | A farm clearing |
| Storm shelter | North | Every run (fixed opening cluster; Night 1 sigil) | Inside the home cluster |
| Crashed plane | North | Every run (Aaron, Oct 16: the outpost's scope cutscene shows it come down) | Just past the cordon, where the cutscene shows it crash |
| Abandoned mineshaft | North | Uncommon | Hillside edge |
| Overrun military outpost | North | Every run (fixed opening cluster; the gateway south) | The checkpoint in the military cordon, the only way out of the home cluster |
| Stairs in the woods | Middle | 2–3 per run | Off-path clearings |
| Time capsule | Middle | Uncommon | A ruined old church |
| The Caller (night event) | Middle | 0–2 per run | Over the radio |
| Bigfoot cave | Middle | Every run (unique prize) | Rocky clearing or path edge |
| Car Armory | Middle | Every run (unique prize) | A clearing of wrecked military vehicles |
| Ground Zero | South | Every run | A crater clearing |
| Crashed UFO | South | Every run (unique prize) | A south clearing; enterable from night 5 (config) |
| Witch's hut | South | Every run (fixed) | Deep south |

### Design checklist

| Encounter | Dungeon? | Opening cutscene | Aesthetic | Enemies | Loot | Lore | Novel interaction |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Witch's hut | No | Approach: establishing sweep. Final battle: first-person explosion | Blair Witch hut, trap-lined approach | The witch, summoned zombies, traps | None | Deliberately none | Two charges detonated together start the final battle |
| Crashed UFO | Yes | CCTV: warped alien feed | Wreck clearing; inside clean metal, purple-green light | Sneaky cowboy-drift aliens | Alien power core, alien shields, alien med kits, alien shells | Americana-obsessed Martians; shot down by the patrol plane in the dogfight Tom watches from the outpost tower | Tractor-beam entry; shield locks the exit until the core is taken |
| Ground Zero | No (small bunker) | CCTV: glitching government feed | Crater, shattered portal ring, cracked bunker | A few Men in Black | Scrap, batteries | Final classified documents; the portal is stuck open | Reality anomalies |
| Car Armory | Yes | CCTV: sleek government camera | Wrecked military vehicles; armoured truck with a purple portal; government base inside | Men in Black (smaller squads on revisits) | Turret, one-time ammo, first aid, scrap, body armour, restocking explosives | Classified documents | Portal in a truck; the one revisitable restock; stealth |
| Bigfoot cave | Yes (seeded) | CCTV: ranger trail-cam, night-vision green | Stones and trees; Bigfoot's handmade crafts | Beetles, the Mothman | Bigfoot's Blessing, nature armour | Bigfoot as land guardian; the Mothman's brood | Beetle weak spots; Bigfoot's gift |
| Stairs in the woods | No | Establishing sweep to the stairs | A lone staircase attached to nothing | None (zombies drawn after climbing) | None | Glimpses of the witch's dimension | Climb for a first-person vision |
| Time capsule | No | Establishing sweep to the plaque | Ruined old church, weathered plaque | None | None | 1920s records of a woman in the woods | Dig it up |
| The Caller | No | None (radio) | A too-thin silhouette at a clearing's edge | Silent zombie pack at the lure point | None | A mimic entity; Junie's aftermath | Fake radio calls; radio home to check |
| Military outpost (gateway south) | No | Tom arrives to report the witch; waves of dead soldiers on the approach reveal it's overrun | Approach road, watchtower, sandbag barricade with breached steel fence, compound of tents, comms hut and armoured shipping containers | Waves of helmeted army zombies peaking at the barricade; caged beetles in the compound | Rifle ammo, helmets, scrap, first aid, jeep battery, one charge; hunting rifle rounds in the watchtower | A failed transfer point: torn-open containers (one held the Mothman, never named), resin-frozen alien, field report | Needs the hunting rifle to reach; the scope cutscene shows the live dogfight; crossing the barricade opens the frontier; beetle crates break open when shot |
| Mineshaft | Short tunnel | CCTV patched through by Wyatt: the blast and the Mothman bursting out | Timber entrance, rails, abandoned gear | Zombie miners, a few beetles | Scrap, lamp batteries, one charge | The Mothman's origin | Collecting an explosive charge |
| Crashed plane | No | Establishing sweep settling on the lone alien examining the wreck | Military patrol plane torn through the trees | One plain-grey alien | Pistol, flares, first aid, battery; alien loot | The dogfight Tom watched from the outpost tower | First alien kill and first alien loot |
| Storm shelter | Small room | Wyatt says it's hard to find; the camera reveals a horde standing on the hatch | Half-buried steel hatch; concrete room | Horde on the hatch (the first sigil's spawn) | First aid, ammo, batteries, radio; the gas station safe's combination (on the owner's body at the hatch) | The gas station owner's diary, trail-cam photos and tapes: his family died a few feet short of the hatch | The first sigil (tutorial); clear the horde, dig the hatch open; carry the tapes home for a cutscene |
| Old barn | No | Slow sweep at night, heat-lamp glow from inside | Milo the Clown lettering, animals, knife-throwing pedestal | Zombies dropping from the loft | Scrap, tractor battery | Milo; mutilated cattle | Loft ambush; harmless animals |
| Gas station | No (single-room store) | Sweep across the pumps to the car bonnets and the "Home of Bigfoot" sign; first-person cutscene of the witch on the way out | Store, pumps, cars, "Home of Bigfoot" sign; dark aisles inside | Small citizen pack outside; the authored first mutant inside | Scrap, car batteries, first aid; the hunting rifle in a locked gun safe | "Home of Bigfoot" souvenirs and sighting photos (played straight); the owner's note | First mutant reveal by torchlight; guaranteed witch sighting; a safe that needs the storm shelter combination and outpost ammo |
| Campsite | No | Sweep to the campers' car; radio: check for guns | Tents, cold campfire, blood, stick figures, slashed tents | None on arrival; a wave when the shotgun is taken | Guaranteed shotgun, ammo, scrap, car battery | The campers were killed by the witch; a camcorder clip of her attacking them | Picking up the shotgun triggers a zombie wave; the game's first battery pull |

### Unique prizes

Three base upgrades exist exactly once per run, each from one encounter. A three-item checklist on the pause screen shows which are secured.

| Prize | Source | Effect |
| --- | --- | --- |
| Bigfoot's Blessing | Bigfoot cave | +20 security, permanent, never drains; weak zombies avoid or slow near the station |
| Automated turret | Car Armory | Up to +20 security; needs fence power and hand-loaded ammo |
| Alien power core | Crashed UFO | A huge fence charge that drains far slower than batteries |

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
2. **Arrival.** Establishing sweep of the clearing, settling on the campers' car. Wyatt (radio, line 5): check the car and the tents for guns.
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
2. **The storm shelter (the combination).** The owner fled to his family's storm shelter and took the combination with him. He died at the hatch, and the combination is on his body there.
3. **The military outpost (the ammo).** The rifle is empty and its rare rounds are up in the outpost's watchtower.

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

**Open questions for the gas station**

- Settled (Oct 16): the gas station appears every run, as part of the fixed opening cluster, and is always the player's second outing.
- Resolved (Oct 16): the storm shelter and the military outpost are both in the fixed opening cluster, so the chain always completes. See Map: Fixed opening cluster.
- The mutant's exact stats once mutant tuning is reworked.
- The wording of the owner's note, and his name.
- How long the witch is on screen and how clearly she's seen.

#### Old barn (Milo the Clown)

- A weathered barn painted with faded lettering for **"Milo the Clown"**, a lone clown with his own one-man act who kept his animals here. (A nod to another of the designer's stories.) **Milo has no connection to the circus** sigil ground: he's a lone clown doing his own thing, which is the joke.
- **Inside:** a turkey and a donkey alive in their stalls, a big snake in a reptile enclosure under a glowing heat lamp, and a knife-throwing pedestal with the wall around it scarred by knife marks. The animals are harmless.
- **Danger:** zombies in the hayloft drop down once the player is inside.
- **Loot:** scrap, a tractor battery.
- **Foreshadowing:** mutilated cattle in the pens outside, a nod to UFO lore.

#### Storm shelter (every run; fixed opening cluster)

Fleshed out with Aaron, Oct 16. Items marked *(proposed)* are suggestions not yet agreed; confirm them before building (rule 10).

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

1. **Arrival.** Wyatt says the shelter is hard to find; the establishing camera reveals a horde standing on the hatch.
2. **The fight.** The horde is the **first sigil's own spawn**. The witch planted a sigil here before the family arrived, and the zombies it raised caught them in the open. Clearing the horde, digging up the sigil and opening the hatch are one connected fight.
3. **Digging up the sigil.** The sigil tutorial: hold interact with the shovel; taking damage interrupts it. The glow dies, and the night (if it's night) goes noticeably quieter.
4. **The owner.** His body lies at the hatch: he never made it down. On him: the **gas station safe's combination** *(proposed: on a tag on his keyring, or written inside the cover of a pocket notebook)*.
5. **Opening the hatch.** Dig the hatch clear with the shovel and haul it open.
6. **The room below (the quiet).** Sealed exactly as the family left it, stocked with care for a survival that never came. The player reads a life that was ready to wait this out:
   - Family belongings: four bunks made up, the kids' things (a colouring book, a stuffed toy, a board game on the table), Marcy's handwriting on the shelf labels.
   - Bigfoot evidence: a plaster cast, maps of the north ridge with sightings marked, newspaper clippings of the local crank who saw Bigfoot.
   - **Trail-cam photos pinned to the wall:** mostly empty forest, one or two with a smear of motion that is unmistakably the witch.
   - Supplies: first aid kits, ammo, batteries, a radio.
7. **The diary.** On the table. The owner's, written before the end (see below).
8. **The tapes.** The owner's trail-cam footage, which the player takes home.
9. **Back up.** Climbing out past the bodies that prove the family never got the chance.
10. **At home: the tapes.** Handed in at the comms room, they trigger a cutscene (see below).

**The world only sees her through lenses.** The camcorder at the campsite, the sighting at the gas station, the family's trail cams, and now a dead man's photos and tapes: everyone glimpses her in fragments, never clearly. That's her mystique.

**The diary**

The owner's diary, written **before** the end. It's a reflective object, so it stops where reflection stops: a man wouldn't journal while dragging his kids to safety. It doesn't narrate the final day; the tapes do. A handful of dated entries across years, so the gaps tell their own story. His wife is **Marcy**; the two kids are unnamed.

1. *(years back)* "Saw it again today, up the north ridge. Taller than any man, and it just watched me, calm as you like, then walked off into the trees without a sound. Sheriff laughed me out of the office. Marcy believes me though. That's enough."
2. *(later)* "Opened the store. Everyone thinks it's a gag, the signs, the casts, the photos. Let them. Keeps the lights on, and it keeps me out here, where I can watch. Put trail cams up along the old logging trails this spring. If he's out there, I'll get him on film, and then they'll all stop laughing."
3. "Cameras for a year and not one clear frame of him. But I'm getting something else. Something fast. Camera four, three nights running now, a shape going through the trees quicker than anything should move. Low to the ground, wrong somehow. It isn't him. He's gentle. This thing isn't."
4. *(the last written entry)* "The lights started a few weeks back, out past the government land. Then the animals went quiet. Camera four's got that fast shape every night now, closer to the road each time. Checked the shelter today, restocked it, oiled the hatch. Stocked that place years ago, half as a joke. Hope to God I never need it."

Then a **blank page**. The blank page is the horror.

*(proposed)* Entry dates: entry 1 around 1987, entry 2 around 1989, entry 3 around 2002, entry 4 in 2003, a few weeks before the game. That fits Bigfoot predating the portal by 15+ years (see Ideas for later).

**The trail-cam tapes**

The footage, not the diary, delivers the family's final day. The player recovers it in the shelter and carries it home: a find in the field that pays off at base.

**What the footage shows** (camera four, night-vision green, timestamped late at night, 2003):

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

- **The horde on the hatch**, the first sigil's spawn. *(proposed)* 6–10 level-1 citizens (config), sized for an early player; the father, Marcy and the kids are not among them (no zombified family, so the sad beat stays sad rather than grotesque).
- **The room below:** none. It's a quiet room.

**Loot**

| Search point | Holds | Guaranteed or rolled |
| --- | --- | --- |
| The owner's body, at the hatch | The gas station safe's combination | Guaranteed |
| The table below | The owner's diary (lore item) | Guaranteed |
| The VCR shelf below | The trail-cam tapes (lore item; plays as a cutscene at home) | Guaranteed |
| Shelves below | First aid kits, ammo, batteries, a radio | Storm shelter loot table (*proposed:* at least one first aid kit and one battery guaranteed) |
| The wall below | Trail-cam photos | Set dressing |

**Day vs night.** The witch plants this sigil on Night 1, and the family can urge Tom to dig it up in the dark. *(proposed)* By night the horde is on the hatch and the sigil glows; by day the horde lingers on the hatch anyway, since they're the sigil's spawn and the sigil is still there.

**Revisits** *(proposed)*

- Once looted, the room stays as it is: a tomb, quiet, nothing restocks.
- The witch may replant here on a later night, like any clearing, but it isn't a sigil ground.

**Skip intro.** Repeat runs start at Dawn 1, with the Night 1 sigil still planted here, so the shelter plays as normal.

**Lore and dialogue hooks**

- Wyatt's arrival line (the shelter is hard to find).
- The combination found: a family line connecting it back to the safe *(proposed)*.
- The diary and the tapes, handed in at the comms room: the cutscene above, and Ellen's lore lines.
- The Night 1 trail-cam clip and the owner's tape show the same night from two cameras (see the open questions).

**Edge cases** *(proposed)*

- The player opens the hatch without digging up the sigil: allowed. The sigil keeps spawning, and the family nudge Tom to finish the job.
- The player takes damage while digging: digging is interrupted, as everywhere.
- The player leaves without the tapes: they stay on the shelf until collected.

**Performance cost.** Low: a small clearing, 6–10 sprite zombies, a one-room interior (no loading, *proposed*), a cutscene played at home.

**Open questions for the storm shelter**

- **Two cameras, one night.** The Hales' Night 1 trail-cam clip (tutorial lines 17–19, camera six) shows the witch planting this sigil. The owner's camera four shows the same night with his family. *(proposed)* The Hales' camera sits further off and only catches her after the family have scattered out of its frame, so the owner's tape later reveals what the Hales never saw. That's a strong retroactive chill, but it needs the timeline confirming: the family died on Night 1, while Tom was at the station.
- The combination's exact form (keyring tag, notebook, something else).
- The owner's name.
- Whether the room below is part of the main map (a hatch and a ladder) or uses the interior system.

#### Crashed plane

- A military patrol plane torn through the treetops, wings sheared off, gun pods scorched.
- **Enemy:** a single plain-grey alien survivor examining the wreck: the player's first alien. It drops energy armour (+30), an alien med kit and alien shotgun shells, the first hint that healing, armour and ammo come in stranger forms.
- **Loot:** the pilot's pistol, flares, a first aid kit, a battery.
- **Lore:** the pilot's log: chasing a craft of strange lights over the ridge and trading fire. The plane and the alien ship shot each other down; the ship limped south and became the crashed UFO. **Changed Oct 16: the dogfight happens live, mid-game.** Tom watches it through the hunting rifle scope from the military outpost's watchtower (see Overrun military outpost), so the crash is fresh when he arrives: smoke still rising, the pilot only just dead, and the lone alien survivor examining the wreck. The log's last entries were written in the air that day. The crashed plane appears every run (Aaron, Oct 16), placed where the cutscene shows it come down.

#### Abandoned mineshaft

- A timber-framed entrance in a hillside, rails running into the dark. A short linear tunnel; dark, so the flashlight matters.
- **The Mothman's origin:** the glowing seam the miners struck was a thin spot, and the Mothman came up out of it. The miners fled, leaving tools, lunch pails and a half-loaded cart.
- **Enemies:** zombie miners and a few giant beetles (the first live beetles are now at the military outpost, which every run reaches first). Shed husks and cracked egg casings in the deepest gallery.
- **Loot:** scrap, lamp batteries, **one explosive charge** in the blasting store.
- **Lore:** the foreman's logbook (the seam that glowed and hummed, the tall red-eyed thing that came out of it); warnings scratched on the walls.

#### Overrun military outpost (every run; the gateway south)

Fleshed out with Aaron, Oct 16. Items marked *(proposed)* are suggestions not yet agreed; confirm them before building (rule 10).

**Purpose.** The climax of the authored opening and the threshold between the home cluster and the randomised frontier (see Map: Fixed opening cluster). It's the moment Tom learns the cordon failed and he's on his own, so it has to *feel* like crossing a line. It's also the early game's first big fight.

**What it really was: a transfer point.** Not just a checkpoint on a defensive line. The military were moving captured entities through here, and containment failed in transit. That's why the dead are thickest at the barricade: the soldiers died trying to hold the things that got loose.

**Why Tom is here.** Ellen sends him to report that the witch has escaped containment (her sigils are turning up outside the quarantine zone). He arrives expecting soldiers and finds the dead.

**The gate: the hunting rifle.** The player can't reach the outpost without the hunting rifle, so the whole opening becomes the assembly of the loadout needed to cross the threshold. The tutorial isn't just teaching; it's equipping.

- The outpost path (step 4 of the soft funnel) opens only once the player has **claimed the hunting rifle** from the gas station safe, which needs the storm shelter's combination. So the storm shelter is required before the outpost, whenever the player does it.
- The rifle is claimed **empty**; its rounds are at the outpost, in the watchtower, which the player reaches before the barricade (see the order below).
- Ellen's call to adventure comes when the rifle is in hand *(proposed)*. If the player has the gas station done but not the shelter, the family nudge them back to the shelter for the combination.

**Layout** *(proposed)*

- **The approach:** a road or wide trail running south from the home cluster into the cordon, a few hundred metres of forest with abandoned military vehicles, dropped gear and fallen soldiers along it. Signage warns civilians off.
- **The watchtower:** stands on the near side of the barricade, covering it, where the snipers could fire over the checkpoint. Placing it before the barricade is what lets the player get the rounds before the peak.
- **The barricade:** the checkpoint in the cordon: sandbag walls, a breached section of steel fence (the same model as the station's, reused as grim set dressing, with bodies against it), a jeep across the road, dead floodlights. The only way through.
- **The compound:** beyond the barricade. Tents, a comms hut, the armoury, and a row of **armoured shipping containers** on flatbed trucks. A south gate out of the compound leads into the frontier.

**Beat by beat**

1. **The walk out.** Down the approach toward the checkpoint, the rifle on Tom's back, empty.
2. **The first helmet.** A single army zombie in helmet and fatigues: the player's first armoured zombie. Its helmet blocks headshots, so it eats extra bullets. The first sign things have gone wrong.
3. **Waves.** The approach comes in **waves** rather than a steady stream: a quiet stretch, a cluster, quieter, a bigger cluster, so Tom keeps thinking he's through it and isn't. Each wave is more soldiers than the last, and the player works out from sheer accumulation that the base is completely overrun. No cutscene announces it. One straggler is a casualty; a dozen is an overrun.
4. **The radio in the lulls.** Between waves, Ellen and Wyatt talk: realising the soldiers are the dead, what Ellen knows about containment, what "quarantine zone" really meant. They set up the story while the player catches their breath.
5. **The watchtower.** The player climbs it for the hunting rifle rounds, at the snipers' last stand: spent casings, a dropped (damaged) rifle, sandbags. The climb is exposed, so zombies below can swarm the ladder *(proposed)*.
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
| The watchtower's sniper nest | Hunting rifle rounds | Guaranteed |
| The armoury locker | One explosive charge | Guaranteed |
| The comms hut | The field report (lore document) | Guaranteed |
| A jeep | A battery | Guaranteed |
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
- *(proposed)* A shipping manifest on a clipboard by the containers lists contents by code, with one line redacted. It ties to classified document 4 (the specimen inventory, which already mentions transfer orders to the outpost).
- The resin-frozen alien and the beetles show that the government knew about the creatures long before Tom did.

**Edge cases** *(proposed)*

- The player retreats mid-wave: the waves reset to the last one cleared, and stragglers may follow toward the home cluster.
- The player skips the tower and goes straight for the barricade: the barricade wave is still beatable with rifle and shotgun ammo, but much harder, and the radio suggests the tower. The scope cutscene then plays the first time the scope is raised anywhere past the cordon.
- The player breaks no crates: at least one beetle breaks out on its own, so the beetle tutorial always happens.

**Performance cost.** Medium to high: the largest fight so far (up to about 20 active sprite zombies at the barricade, near the active-enemy cap), 3D beetles, two cutscenes, and the long approach. Waves keep the number of active enemies at any moment well under the cap except at the peak.

**Open questions for the outpost**

- The exact wave sizes and how hard the barricade peak should be.
- What exactly the player sees of the Mothman's container, and for how long.
- How the scope cutscene frames the dogfight and where the two crash sites appear relative to the outpost.

#### Car Armory and the government base (every run; north band, Aaron M6: the turret matters most for travelling away from home)

- **Outside:** trashed military vehicles; an armoured truck with its back doors open on a glowing purple portal.
- **Inside:** a secret government base, hand-built: corridors, labs, an armory section, far bigger than the truck. The source of the portal technology.
- **Enemies:** Men in Black, stealth-aware.
- **Loot:** large one-time stocks of every ammo type, first aid kits, scrap, body armour; **the game's one turret**; and **an explosives crate that restocks**.
- **Revisits:** the only revisitable restock. A smaller Men in Black squad moves back in each time, so every run for charges costs something.
- **Classified documents:** files and lab notes scattered through the base.

### Middle band

#### Stairs in the woods (2–3 per run)

- Based on the modern ranger legend of free-standing staircases deep in the forest that rangers don't talk about. Tom knows the unwritten rule never to touch them; the family react nervously if he heads toward one.
- A lone staircase in an off-path clearing, attached to nothing.
- **Climbing to the top** triggers a few seconds of first-person vision of the witch's dimension, then snaps the player back to the bottom. Each staircase shows a different glimpse. Each is usable once.
- **Cost:** the player is briefly disoriented and nearby zombies are drawn to the stairs.
- **Lore:** the stairs are thin spots worn through by the portal programme's damage.

#### Time capsule

- A ruined old church with a weathered plaque: a time capsule buried in the 1920s, "to be opened in 100 years". Dig it up with the shovel.
- **Inside:** letters, photos and clippings from the town that once stood here: a woman in the woods, missing livestock, strange lights, people who went into the trees and never came back.
- **Lore:** she didn't arrive out of nowhere. This forest was already a thin place where she could almost reach through, which may be why the government built here. Ellen links it to the classified files.

#### The Caller (night event, 0–2 per run)

- Based on the Appalachian superstition never to answer when your name is called from the trees.
- **A separate entity, not the witch.** Something from the other side that hunts by imitation. Almost never seen: a too-tall, too-thin silhouette at a clearing's edge, gone when the player looks again.
- **It always uses Junie's voice** to call Tom on the radio: Junie lost past the old creek; "they're inside, Mom's hurt, come home"; a plain cry for help in the trees.
- **The lure:** a silent zombie pack waiting where the call leads, or a long dangerous run home for nothing.
- **Tells:** no station crackle; Junie's blip pitch slightly off; the family never leave the comms room at night; a real overrun always comes with the alarm and HUD banner.
- **Checking:** radio home (D-pad down) and the real family say everyone's safe. Always safe, but it costs time.
- **Aftermath:** if Tom tells the family, the real Junie is shaken that something used her voice.

#### Bigfoot cave (every run)

- A dark entrance framed by boulders and trees. Walking in loads a small **seeded** cave interior: a short labyrinth of tunnels and chambers, about 3–6 minutes. Dark; the flashlight matters.
- **Bigfoot is good.** The cave is his home, overrun by the Mothman and its beetles.
- **Aesthetic:** a lived-in home with Bigfoot's handmade jewellery, beadwork, woven items, carved tools and totems in his own style, showing he's a person with a culture, a tool-user, and connected to the people who were on this land longest.
- **Boss:** the Mothman in the deepest chamber.
- **Reward:** once it dies, Bigfoot emerges, grateful, and gives Tom the **Bigfoot's Blessing** and his **nature armour** gift.
- **The Blessing** is buried at the base of a tree inside the compound (hold interact): +20 security, permanent, never drains, can't be removed; weak zombies avoid or slow near the station; its own line on the forecast.

### South band

#### Ground Zero (every run)

- Where the portal programme went wrong. A wide crater with a shattered metal ring at its centre, **still holding a shimmering, humming field: the portal is stuck open** and the government never found a way to switch it off. A cracked control bunker, wrecked trucks, cables, toppled floodlights.
- **Reality anomalies** (hazards and atmosphere): gravity hiccups (float briefly, land heavily); sound dropping out completely; **time skips** (the clock jumps forward, costing daylight); flickers of other dimensions.
- **Enemies:** a few Men in Black guarding the bunker.
- **Loot:** scrap and batteries.
- **Lore:** the programme's final documents: what they were trying to do, why this forest (the thin place), the moment it failed, and that the portal can't be shut. Ellen's biggest revelations.

#### Crashed UFO and the alien ship (every run, enterable from night 5)

- The ship the patrol plane shot down, crashed in a south clearing. **Changed Oct 16:** it comes down mid-game, in the dogfight Tom watches from the military outpost's watchtower, so he sees where it falls.
- **Entering:** interacting with the wreck switches on its tractor beam, which pulls the player up into the alien ship (hand-built interior). The aliens are shocked and immediately hostile.
- **Trapped:** an energy shield blocks the exit portal. The only way out is to reach the core room and take the **alien power core**, which drops the shield.
- **Look:** a complete change of art style: clean metal, purple and green light, alien geometry, and Americana creeping in deeper inside.
- **Loot:** the power core; alien shields, alien med kits, alien shotgun shells.
- **One visit:** it can't be re-entered once the core is taken.

#### Witch's hut (fixed)

See The witch: destroying the hut and the final battle.

### Interiors (shared system)

- One interior-map system: entering loads the interior, the main map keeps simulating in the abstract tier, the clock keeps running (visible on the HUD), and leaving returns the player to the entrance.
- **Bigfoot cave:** generated from the run seed out of tunnel and chamber pieces on a grid.
- **Government base and alien ship:** hand-built, the same every run (scripted beats: the shield, the core room, document placement, patrol routes).
- **Mineshaft and storm shelter:** small hand-built spaces.

## Story and lore

### Backstory

- **The mishap:** a well-funded government programme built portals into other dimensions. It went wrong at Ground Zero, the portal is stuck open, and entities have spilled into our world.
- **Americana made real:** the creatures on the other side are the creatures of American folklore: the Witch of the Woods, the Mothman, the Martians, and whatever the Caller is. Human legends were distant glimpses of their kind.
- **Bigfoot is the exception (Aaron, Oct 16):** he did not come through the portal. He has been in these woods for 15+ years at least, long before the programme, a true nature spirit native to this land (see Ideas for later).
- **Why this forest:** it was already a thin place (the time capsule, the stairs), which is why the government built here.
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
- **Tone:** serious. They're frightened for their lives. Very little comedy in their lines; the game's humour (Milo, the cowboy aliens) lives in the world.
- They shelter in the comms room. By day the player can talk to each of them (hold interact).

### The radio

The family run the station's radio and trail-camera network, so they stay part of the game while Tom is out.

- Calls play as subtitles with a radio crackle; the player keeps full control.
- **They radio about:** the dusk forecast, the base alarm, milestones (the fifth sigil, a document decoded, a light to the south), lore and character moments.
- **CCTV patch-through:** when a camera catches something, they patch the feed to Tom. Most mid-run cutscenes are framed this way.
- **Witch sightings are limited on purpose:** trail cameras sit at fixed spots (config, 5–6 in the north and middle). They report her only if she passes one, after a delay, and the map marks the camera, not her. A lead, never a tracker.
- Calls are rate-limited (config).

### Dialogue system

- One data file of lines (id, speaker, text, conditions, priority) shared by family talk, radio calls, creatures and cutscene captions.
- **Conditions:** night number, milestones (prizes, first sigil dug, witch wounded, hut found, encounters visited, documents handed in), current state (base damaged, zombie level 4+, low batteries).
- Talking picks an unheard line whose conditions are met, newest milestone first; otherwise an idle line. Heard lines are saved.
- **New-line marker:** a small marker floats over a family member with something new to say.
- **What lines do:** piece things together in step with the player; drop gentle hints; explain oddities (e.g. Wyatt on why aliens carry shotgun shells); build character.

### Dialogue presentation (no voice acting)

- All dialogue is subtitled, never voiced.
- **Talking bob:** the speaker bobs slightly (or a two-frame mouth movement for 3D characters) while their line plays.
- **Subtitles:** pixel font, speaker name above, on a dark strip at the bottom centre. Advance on a button or after a readable delay.
- **Blips:** a retro blip per letter or word, a different pitch per speaker.

### Lore sources

- Family dialogue (face to face and radio).
- **Classified documents** from the government base (5) and Ground Zero (3): 8 in total, listed below.
- Found items: the camcorder (campsite), the gas station owner's diary and trail-cam tapes (storm shelter), the pilot's log (crashed plane), the foreman's logbook (mineshaft), the field report (outpost), the time capsule.
- Each item is handed in at the comms room and unlocks family lines.

### The classified documents

Eight documents tell the programme's story in order. Each unlocks lines from Ellen. Outlines only; the text is still to be written. None of them names or explains the witch.

| # | Found at | Document | What it reveals |
| --- | --- | --- | --- |
| 1 | Government base | Funding memo | How much money went in, and why this forest: old accounts of a "thin site" (ties to the time capsule) |
| 2 | Government base | Breakthrough report | The first stable portal aperture; the listening array comes online |
| 3 | Government base | Transmission log | What the listening research heard: voices, singing, mimicry. Annotated by Ellen's old team; she recognises her own initials |
| 4 | Government base | Specimen inventory | Beetles captured, a grey "visitor" sealed in resin, transfer orders to the military outpost |
| 5 | Government base | Containment orders | The Men in Black's cover-up instructions: secure the site, no civilian evacuation |
| 6 | Ground Zero | Incident log | The night of the full-aperture test, when the ring overloaded |
| 7 | Ground Zero | Shutdown attempts | Every attempt to close the portal failed; the field seems to be held open from the other side |
| 8 | Ground Zero | Final entry | The last log line: a woman seen walking out of the field. Nothing more |

### Dialogue plan

| Group | Trigger | Mainly | Rough count |
| --- | --- | --- | --- |
| Day 1 tutorial | Scripted steps | Ellen, Wyatt, Junie | 23 (written, below) |
| Dusk forecast | Each dusk, by margin band | Ellen | \~8 |
| Alarm and base trouble | Under 50%, doors failing, low batteries, turret dry | Wyatt | \~8 |
| Dawn reports | Each dawn | Ellen, Wyatt | \~6 |
| Encounter discoveries | First visit to each encounter | Varies | \~20 |
| Lore items | Each found item handed in | Ellen | \~10 |
| Classified documents | Each document | Ellen | One each |
| Prizes | Blessing, turret, power core | All | \~9 |
| The witch's progress | First sigil, levels 2–5, first horde, first mutant, fifth sigil, wounded, sighted, hut found | Mixed | \~14 |
| Characters | By night number | Each | \~18 |
| The Caller | Aftermath | Junie, Wyatt | \~3 |
| Final battle and ending | Hut blown, mid-fight, victory dawn | All | \~8 |
| Idle | Nothing new to say | Each | \~2 each |

Roughly 130–150 lines in total.

### Day 1 tutorial lines

| # | Trigger | Speaker | Line |
| --- | --- | --- | --- |
| 1 | Opening, Tom wakes | Ellen | Tom. Wake up. Something's happened at the facility. Every channel's static except the emergency band. |
| 2 | Opening, end | Ellen | I need eyes on the woods. Get up the tower and tell me what you see. |
| 3 | Top of the tower | Wyatt (radio) | Dad, there's a car down at the campground. Those campers checked in two days ago. They never checked out. |
| 4 | After line 3 | Junie (radio) | Their fire's out. I saw the smoke over the trees last night, from my window. It's gone now. |
| 5 | Campsite sweep | Wyatt (radio) | If they had any guns, we need them. Check the car and the tents. |
| 6 | Camcorder picked up | Ellen (radio) | Play it, Tom. Whatever they saw, I need to know. |
| 7 | After the clip | Ellen (radio) | That wasn't an animal. I've heard things like that before, on the recordings. Please be careful. |
| 8 | Shotgun picked up, wave starts | Wyatt (radio) | Dad, behind you! In the trees! |
| 9 | Wave cleared | Wyatt (radio) | They didn't stop when you hit them. They just kept coming until they couldn't. |
| 10 | After line 9 | Ellen (radio) | The dead aren't supposed to get up, Tom. Pull the battery from their car and come home. |
| 11 | Entering the compound | Wyatt (radio) | East fence is torn up. The ledger's on the desk in the comms room. Patch it with the scrap you found. |
| 12 | Fence repaired | Wyatt | That battery goes in the fence box by the gate. It'll put charge back in the wire. |
| 13 | Battery fitted; marker appears | Junie | Are they going to come here? |
| 14 | After line 13 | Ellen | Not if we're ready for them. |
| 15 | Dusk 1 forecast | Ellen | This is how we stay alive. Left side is what we've got: fence, doors, charge. Right side is what's coming. Keep the left side bigger. |
| 16 | Night 1, first zombies at the fence | Wyatt (radio) | Movement on the east fence. Only a few. The wire's holding. |
| 17 | Trail-cam clip starts | Ellen (radio) | Tom, camera six. Look at this. |
| 18 | During the clip | Ellen (radio) | She's burying something. The transmissions talked about marks like that, wherever the dead started rising. |
| 19 | Clip ends | Junie (radio) | The ground's still glowing where she was. Like it's warm. |
| 20 | Sigil marked on the map | Wyatt (radio) | It's on your map. You could dig it up now, or wait for light. Your call, Dad. |
| 21 | Dawn 1, sigil not dug up | Ellen | We made it through. Whatever she buried is still out there. If we dig it up, maybe they stop coming. |
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

**Planned clips:** the Ground Zero cold open; the campers' camcorder; the Night 1 trail-cam clip of the witch planting; an establishing clip for each encounter (see the design checklist); the witch's fifth sigil going in (a warning); the dogfight and both crashes through the hunting rifle scope (military outpost; this replaces the earlier "UFO passing over the treeline" foreshadowing clip); the Mothman's torn-open container (military outpost; a hint, never named); government footage of the portal programme (unlocked by classified documents); the hut exploding (first-person); the victory montage.

## Opening and first run

The first 20 minutes teach through the radio and the world, not pop-ups. Only controller button prompts appear on screen.

### Main menu

- The pixel-font title over a live, slow CCTV feed of the forest at night.
- **New Run**, **Continue** (if a save exists), **Modifiers**, **Settings**, **Quit**.

### Opening cutscene (under a minute, skippable)

1. **Cold open:** grainy government CCTV at Ground Zero. Men in Black around the portal ring; it flares; the feed glitches and dies.
2. **First person:** Tom wakes in the station at dawn. Ellen at the radio, emergency broadcasts crackling (lines 1–2).

### Day 1 (guided, can't fail)

1. **Lookout tower:** climb it; the first patch of map is revealed. Before Wyatt's line, the view lingers: fog over the treetops, the cliff at Tom's back, and far to the south a shape or light he can't make out, never explained and not reached for hours. It plants the whole push south in one glance. Then Wyatt spots the campers' car, and a thin wisp of smoke above the canopy marks the campsite for Junie's line.
2. **Campsite:** the witch's signs, the camcorder clip, the shotgun and the first zombie wave, the campers' car battery.
3. **Home:** repair the fence at the ledger, fit the battery, meet the family face to face.

### Dusk 1

Ellen explains the first forecast.

### Night 1 (safe, no sigils)

- No sigils yet: only a few stray zombies test the fence.
- The family patch through the trail-cam clip of the witch planting her first sigil at the storm shelter; it's marked on the map. *(proposed)* One of the trail cameras is fixed near the shelter, so the clip is always possible.
- The player chooses: dig it up in the dark (optional and scary) or hold the station until dawn.

### Dawn 1

Autosave. The family suggest going after the sigil at the storm shelter. On Day 2 the path to the gas station opens (the guaranteed second outing). After it, Ellen's call to adventure sends Tom to the military checkpoint, which he finds overrun; fighting through it opens the frontier (see Map: Fixed opening cluster).

### Repeat runs

After the first run, **Skip intro** starts at Dawn 1 with the tutorial done (fence repaired, battery fitted, shotgun in hand).

## Modifiers and achievements

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

**Divorced Dad rules** (Aaron's idea, M6; not built yet, to be designed with the other modifiers in M12): the family and the compound are gone, so the station can't fall and the dusk forecast, alarm and night marches have nothing to defend. Open questions for later: where the run starts and where Tom sleeps; where batteries, scrap and the turret go (no fence to power or repair); whether marching groups head for the player instead, or just wander; and how it combines with Coven and Blood Moon.

| Achievement | Condition | Unlocks |
| --- | --- | --- |
| Witch Hunter | Finish the game for the first time | Blood Moon |
| Red Sky at Night | Finish with Blood Moon on | Static |
| Not a Scratch | Clear the alien ship without taking damage | Cowboy Up |
| Dead Eye | Headshot 10 zombies in a row without a miss | Empty Holsters |
| Ambush | Kill the witch in a pathway fight | Coven |
| The Light Was On | Defeat the Mothman without taking damage | — |
| Ranger Danger | Clear the government base of every Man in Black without ever being seen | — |
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
| Bottom right | Weapon icon and name with an RB glyph, ammo count, chips for flares (Y), charges and first aid kits; a small D-pad showing map, flashlight, radio and first aid |

- Prompts always show the controller glyph (A green, B red, X blue, Y yellow), or the key when keyboard is in use.
- The pause screen shows the three-prize checklist, documents found and the full map.

## Art style and rendering

**Atmospheric 3D with retro touches.** A real 3D forest rendered at normal resolution (scaled automatically to hold the frame rate), aiming for an Xbox 360-era horror look. No chunky-pixel upscale. Retro flavour lives only where it fits: the pixel-font HUD and subtitles, the Doom-style zombie sprites, and heavily grained CCTV and camcorder footage. An optional retro pixel filter is available in the Quality settings.

### Visual ambition: Xbox 360-era atmosphere

The goal is graphics as close to Xbox 360 level as a browser on a mid-range tablet allows, with a hint of indie. Reference point: Alan Wake (a 360-era game of dark forests, fog and flashlights).

**Rule: spend effort where it's cheap and looks great; hide what's expensive in fog, darkness and shadow.** Night is our friend: it lets the draw distance shrink and the flashlight do the heavy lifting.

Cheap techniques to do well:

- **Night sky:** gradient dome, dense starfield with twinkle, a moon with a soft halo, thin clouds drifting across it from a scrolling noise texture, moonlight tinting the whole scene.
- **Fog and mist:** height fog plus distance fog; low ground-mist layers drifting between trees; fake light shafts (soft billboards) where moonlight or the flashlight cuts through.
- **Trees:** instanced camera-facing billboard sprites (alpha-cut, several variants in one atlas), wind sway in the vertex shader. Decided with Aaron in M1: every tree is a billboard, near and far.
- **Ground:** blended tiled textures (dirt, grass, moss, mud, leaf litter) with a detail texture up close, normal maps, scattered rocks, roots and fallen logs.
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

- Normal-resolution textures with mipmaps and normal maps, compressed for mobile; a consistent, moody colour palette across all assets.

| Thing | Render as |
| --- | --- |
| Zombies | Billboard sprites with 8 facing angles, pre-rendered from lit 3D models so they sit naturally in the scene |
| Mutants, beetles, the Mothman, aliens, Bigfoot, the witch | Low-poly 3D, animated |
| Trees | Billboard sprites, instanced, camera-facing (near and far) |
| Bushes, grass, ferns | Instanced sprites |
| Station, tower, defences, turret, hut, traps, vehicles | Low-poly 3D |
| Pickups and sigils | Small 3D or sprite with a glow |

Everything shares the same fog and moonlight colour so the mix reads as one style.

### Sky and lighting

- Gradient sky dome driven by time of day; `Points` starfield; moon sprite.
- One directional light (sun/moon) plus ambient. The only real-time shadows come from the flashlight (see Visual ambition).
- A small pool of point lights for the flashlight, muzzle flash, flares and witchfire.
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
- **Budgets** (debug overlay): draw calls under \~100; active enemies capped (e.g. 25); at most \~4 point lights at once; dynamic resolution drops the render scale automatically to hold the frame target; frame time split into simulation and render. A \*\*Quality setting\*\* (render scale, draw distance, flashlight shadow, post effects, mist and particle density, 30 or 60 fps cap, plus the optional retro pixel filter) is the safety valve, with defaults chosen for the tablet.

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
  core/                  Game (loop, phases), Clock, EventBus, Rng, Input (gamepad + kb/m), SaveSystem, Settings
  render/                Renderer (dynamic resolution), Sky, Forest, SpriteBatch, PostFX (tone mapping, bloom, grading, grain, CCTV, retro filter, blood night)
  world/                 MapGraph, MapGenerator, Terrain, FogOfWar, Interiors
  player/                Player, Weapons, Inventory, Armour, Detection
  ai/                    Enemy, EnemyManager (pools, LOD tiers), Zombie, Beetle, Alien, MenInBlack, Mothman, Witch
  sigils/                Sigil, SigilManager, SigilGrounds
  base/                  Station, Fence, Turret, Defences, Ledger, NightResolver, Forecast
  encounters/            one module per encounter, plus EncounterRegistry
  story/                 Dialogue (picker + conditions), Radio, Cutscenes, Lore
  meta/                  Achievements, Modifiers
  audio/                 AudioEngine, Ambience, Stingers, Blips
  ui/                    Hud, Minimap, MapScreen, LedgerUI, ForecastUI, Menus, Subtitles
  data/                  dialogue.json, cutscenes.json, encounters.json, clearingTypes.json, lootTables.json
  debug/                 DebugMenu, DebugOverlay
/tests                   unit tests for pure logic
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

### Debug tools (built in M0, extended every milestone)

- Overlay: fps, frame time (simulation vs render), draw calls, active enemy count, seed, clock.
- Debug menu: set seed, skip time and phases, reveal map, god mode, give items, spawn any enemy, place or remove sigils, set zombie level, teleport to any clearing or encounter, trigger any cutscene or dialogue line, force the witch's state, toggle LOD tier colours.

### Milestones

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
| M8 | Family and storytelling | Dialogue data and picker, subtitles, bob, blips, new-line marker, radio and rate limiting, the three cutscene styles, CCTV shader, lore item hand-ins | A radio call, a CCTV patch-through and a face-to-face line all work from data alone |
| M9 | First run and the north | Main menu, opening cutscene, guided Day 1 and Night 1 with the 23 lines, Skip intro; campsite, gas station, barn, storm shelter, crashed plane, mineshaft, outpost | A new player gets through Day 1 without help; every north encounter is playable |
| M10 | Interiors and the middle | Interior system; Bigfoot cave (seeded) with beetles, the Mothman and Bigfoot; Mothman flare attention; stairs, time capsule, the Caller | The cave is completable and the Blessing works at home |
| M11 | Government base and the south | Car Armory and the base (Men in Black, stealth, documents, turret, restocking explosives); Ground Zero and anomalies; crashed UFO and alien ship | All three unique prizes obtainable; explosives come from the world instead of debug |
| M12 | Meta and persistence | Full save and quit, achievements, modifiers (Coven included), run summary | Achievements and modifiers survive permadeath and a browser restart |
| M13 | Art and audio | Final sprites and models, the full lighting, fog and post-processing pass, grain and camera-style shaders, the audio pass, the final HUD | Matches the art and audio direction |
| M14 | Balance and polish | Tune every number, 130–150 dialogue lines, performance pass, bug bash | A full run lands in 1.5–2.5 hours and feels fair |

### Performance gates

Check on the Samsung tablet, against the budgets, at the end of **M1, M3, M6, M11 and M14**. If a gate fails, fix performance before starting the next milestone.

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
| 10 | Graphics Engineer | Style pass 1: make the slice look good (ground, trees, mist, post-processing). 10b: the guns, a sniper rifle and four more guns | Part of M13 |
| 11 | Narrative Designer | Dialogue system, radio, subtitles, cutscene system, CCTV grain | M8 |
| 12 | Level & Encounter Designer | Main menu flow, opening, Day 1 tutorial, campsite, gas station, barn | M9 (part 1) |
| 13 | Level & Encounter Designer | Storm shelter, crashed plane, mineshaft, military outpost | M9 (part 2) |
| 14 | Level & Encounter Designer + AI Programmer | Interior system, Bigfoot cave, beetles, the Mothman, Bigfoot | M10 (part 1) |
| 15 | Level & Encounter Designer | Stairs, time capsule, the Caller, Mothman flare attention | M10 (part 2) |
| 16 | Graphics Engineer | Style pass 2: encounters, interiors, camera-style shaders; plus Session 10b's deferred art: zombies, cars, the witch's hut, the station's interior and the family (OPEN_QUESTIONS #144-148) | Part of M13 |
| 17 | Level & Encounter Designer + AI Programmer | Car Armory, government base, Men in Black, stealth | M11 (part 1) |
| 18 | Level & Encounter Designer + AI Programmer | Ground Zero, crashed UFO, alien ship, aliens | M11 (part 2) |
| 19 | UI / UX Programmer | Final HUD, menus, save and quit, achievements, modifiers, run summary | M12 |
| 20 | Audio Designer | Audio engine, ambience, stingers, music, blips | Part of M13 |
| 21 | Narrative Designer | Write the remaining dialogue and document text with Aaron | Part of M14 |
| 22 | Graphics Engineer | Final style pass across the whole game | M13 |
| 23 | QA & Balance | Full-run balance, performance pass on the tablet, bug bash | M14 |

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

- **The Caller's first whisper.** On the walk *back* from an encounter (never Day 1), the radio crackles for half a second with something that isn't the family, a wrong voice or a wrong texture, then snaps back to normal. Nobody acknowledges it and nothing explains it. It's an early, deniable seed for the Caller, placed in the comedown when the player thinks the action is over and the loop is resetting. Players who meet the Caller later may realise it was there all along.
- **Setting year: about 2003 (Aaron's leaning, not final).** Late enough for phones and computers, but before everything went fully digital and connected. Patchy cell coverage in deep Appalachian forest is believable, so the radio, trail cams, camcorder (miniDV) and VCR tapes all earn their place, and the analog CCTV and grain aesthetic is honest rather than affectation. It touches the campsite camcorder, the storm shelter's VCR and tapes, the station's radio and CCTV, and the overall art and audio feel. **One conflict to settle:** the time capsule says it was buried in the 1920s "to be opened in 100 years", which would be due in the 2020s. *(proposed)* Bury it in **1903**, so it falls due in 2003, the year of the game: the town's capsule is opened on schedule, by the wrong person, for the wrong reason.
- **Bigfoot as a true nature spirit (Aaron, Oct 16).** Bigfoot is not a portal creature. He has been in these woods for 15+ years at least (since the gas station owner's first sighting), long before the government opened the portal, so he belongs here in a way nothing else in the game does. It sharpens the three-sided story: the family are newcomers, the witch is a true outsider who came through the tear, and Bigfoot is the oldest rightful presence. The portal let the hostile things in; it didn't make Bigfoot, who is older than the wound. It also recasts the owner's long-ago sighting as a glimpse of the land's own guardian, the gentlest presence in the story. Consistent with the Native American influence section and the Bigfoot cave (he's the forest's guardian; the Blessing is old protective land magic); the backstory's "Americana made real" list has been updated so he's no longer counted among the portal creatures.
- **The battery gate.** A sealed gate with no power, where fitting a battery opens it onto a horde: a real choice to open it or not. Cut from the military outpost because you could shoot through chain-link, which kills both the drama and the ammo economy. It needs a spot where the horde is truly sealed off and can't be shot through (solid doors, a bunker, a container yard).
- **Make the walk back matter (a candidate design pillar).** The game is a push north to south, but every push creates a return trip. Seed keys, combinations, tools and knowledge in the south (and across encounters generally) that unlock new value at places already visited in the north, so return journeys are rewarding re-reads of the map rather than dead travel. The first instance is the hunting rifle chain: the gas station safe, the storm shelter combination and the outpost's watchtower ammo.

## Open questions

- The full text of the 8 classified documents (outlines are done).
- The rest of the dialogue lines (Day 1 is written; about 110–130 to go).
- More achievements that don't unlock modifiers.
- Exact numbers for everything marked config: settled in play-testing (M14).
- Art direction details for the Men in Black (sprite or 3D).
- Candidate entities for later, not in scope: Jersey Devil, Flatwoods Monster, Dogman, Headless Horseman.
