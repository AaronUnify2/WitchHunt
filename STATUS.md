# Witch Hunt: Status

Last updated: Session 5 (AI Programmer), milestone **M4: Sigils and zombies**. Built and checked in headless Chromium; **waiting on Aaron's tablet play-test** (script in `HANDOVER.md`). M3 gate passed on the tablet (Aaron).

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

Dev conveniences: `?seed=1234` in the URL fixes the run seed (and so the whole map). The debug menu has "New map" (a fresh random seed) and "Restart this map" (same seed). In dev builds, `window.game` exposes the running Game in the browser console.

## What exists

### M4: Sigils and zombies (Session 5)

Agreed with Aaron before building: a **placeholder 3D mutant** (boxes; the model is the art pass); **sigil grounds get only what matters for play** (the witch prefers them, they raise faster, a simple marker; the scarecrow, cemetery, circus scares and the crows-and-candles tells wait for an encounter session); a **stand-in for the witch plants the sigils** until M7; loot as below (pistol ammo kept in the inventory for the pistol; miner zombies wait for the mineshaft, M9); **the map screen pauses the game**.

| Area | Files | Notes |
| --- | --- | --- |
| Sigils | `src/ai/Sigils.js`, `ZombieDirector.js` | Pure state: position, the five-sigil cap, a raising timer each. At night each sigil raises zombies round itself (3-9 m out) every 18-36 s, up to **6 living zombies of its own**, then waits until one dies. Sigils on sigil grounds raise about 1.7× as often (interval × 0.6). Raising starts 2-12 s after nightfall (or after planting at night). **Zombie level = active sigils (1-5)**, map-wide. Digging one up drops the level at once, and its zombies carry on as strays. |
| Stand-in planter | `src/ai/sigilPlanter.js` | Placeholder for the witch (M7). At each dusk **from night 2** she plants **one** sigil (`planter.perNight`), up to five, so night 2 is level 1 and night 6 level 5 if none are dug up. **60% go to an empty sigil ground** (3 m off its centre), the rest 6-16 m off a pathway into the forest. Never within 160 m of home, 70 m of another sigil or 50 m of the player, nor in an encounter's clearing, home or the hut. Seeded: the same seed plants in the same places. |
| Sigil look | `src/render/SigilRenderer.js` | A patch of turned earth that follows the slope, with a glowing seven-pointed glyph and runes (an emissive map, so no light needed), and a soft green halo above it that fades as you walk up. Faint by day, plain at night. Two draw calls per sigil, only within the draw distance. |
| Sigil grounds | `src/render/SigilGroundMarkers.js` | Placeholder marker: a ring of 9 dark leaning stakes round each sigil ground (plus M3's signpost). One draw call per ground, only when near. Sigil grounds never attack the player (DESIGN.md rule): they're just faster, favoured planting spots. |
| Levels | `src/ai/zombieLevels.js`, `config.zombies.levels` | The DESIGN.md table: speed range (multiples of the player's sprint, skewed slow), horde chance (0/10/10/20/30%), mutant chance (0/0/5/10/15%), plus health, damage and notice multipliers (×1 to ×1.5, notice ×1 to ×1.4) and `defenceDamage` for M5. **Every zombie keeps its speed roll**, so when the level changes every living zombie speeds up or slows down at once; damage and notice range follow the current level too. Only level 5 has zombies that outrun your sprint. |
| Variants | `config.zombies.variants`, `data/clearingTypes.json`, `src/render/zombieSprite.js` | Citizen, police (×1.5 health; vest and cap on the sprite) and army (×1.6; olive fatigues and helmet). Each sigil uses its clearing type's mix (e.g. roadside 60% police, checkpoint 60% army); off-path sigils use the nearest clearing's. The sprite atlas has one 8-row block per variant (1056×3072); the shader picks the block, still one draw call. |
| Hordes | `EnemyManager.spawnPlanned()` | One raising of 7-15 slow zombies (0.35-0.5× sprint) in a 4 m cluster. They wander as a pack behind a leader (a new one takes over if it falls), and when one notices you the whole pack comes. |
| Mutants | `config.mutant`, `src/render/MutantRenderer.js` | A placeholder 3D giant made of boxes, 2.5 m tall: hunched, with a hump, a small sunken head and long arms (one swollen). 300 health × level (at level 3, 360: about 15 rifle body shots, 5 aimed headshots, or 8 point-blank shotgun blasts), a slow heavy swipe (0.9 s wind-up, 30 damage × level, 1.9 m reach), shrugs off 75% of stagger and 80% of knockback, its own deeper groan. At most 4 at once. Rigid but posed: sways as it walks, rears back and lunges, reels, topples sideways. One draw call plus the torch shadow. |
| Detection | `src/ai/detection.js` | One model for every enemy: **sight** 13 m at night and 38 m by day for a standing player with the torch off; the torch ×2.3 at night (barely matters by day); crouched ×0.45; sprinting ×1.2; in the brush ×0.75; behind the zombie ×0.55; all × the level's notice. Sight needs a clear line over the hills (trees don't block it). **Hearing:** walking footsteps 6 m, sprinting 18 m, crouching silent. **Gunfire:** the rifle is heard 70 m away, the shotgun 55 m, the shovel 4 m; every zombie in range comes for you. Always noticed within 2.5 m. Crouched with the torch off at night, a zombie facing you notices you at about 6 m; with the torch on and standing, about 30 m. |
| Targeting | `src/ai/ZombieBrain.js`, `pathRoutes.js` | Each zombie thinks every 0.5 s (staggered): noticed you → **chase**; else (M5) the station within its base radius → **siege** (wired, waiting for the station); else **wander**: a random walk along the pathway graph at 0.55× pace, clearing to clearing, not doubling back if there's a choice. Losing you, it keeps after you for 6 s, then **searches** where it last saw you for 10 s, then wanders. Once chasing, it keeps you in sight 1.7× further. |
| Rising and dawn | `src/ai/Zombie.js` | Raised zombies climb out of the ground over 1.6 s (they can be shot, but not stunned, while rising). **At dawn 85% sink back into the ground** over the 60 s of dawn (no corpse, no loot), never within 25 m of you or while chasing you; **15% stay as stragglers** wandering the pathways by day. |
| Loot | `src/data/loot.json`, `src/combat/loot.js`, `src/world/Pickups.js`, `src/render/PickupRenderer.js` | Every table entry rolls on its own. Citizens: shells 35%, rifle rounds 12%, scrap 20%, a first aid kit 4%. Police: **vest (+40 ballistic) 35%**, pistol rounds 60%, shells 15%. Army: **helmet (+20 ballistic) 35%**, **rifle rounds 60%** (the main source), scrap 10%. Mutants: rifle and shotgun ammo, scrap, a kit 50%, a vest 30%. Drops are small coloured boxes that bob and turn by the body. **Walk over one to take it**; a full armour bar or kit bag leaves it lying. A short "+4 shotgun shells" feed shows bottom right. Pool of 48, gone after 15 minutes. Pistol rounds and scrap are counted in the inventory (overlay `combat` line) for later. |
| Digging | `src/player/Digging.js`, `ZombieDirector.updateDigging()` | Stand within 2.2 m of a sigil: "Hold X: dig up the sigil" (E on the keyboard). 4 seconds of holding, with a progress bar and shovel sounds. Letting go pauses; stepping away starts over; **taking damage loses the progress**. When it's up: a cleansing chime, the sigil vanishes and a toast shows the level dropping. |
| Map screen pause | `src/core/Game.js` `update()` | **Aaron: the map screen pauses the game**, now including the clock. The debug menu still lets the clock run (#9). |
| Sounds | `src/audio/Sfx.js` | Placeholders (audio pass, Session 20): shovel digging, the cleansing chime, earth breaking as zombies rise, pickup click, a deeper mutant groan. Groans now only play for zombies within earshot. |
| Debug menu | `ZombieDirector.addDebugItems()`, `Combat.addDebugItems()` | **Zombie level: auto / fixed L1-L5** (cycles; auto counts the sigils); plant sigil (stand-in witch); plant sigil right here; raise zombies now (every sigil); teleport: next sigil; remove all sigils; **sigils on the map** (green diamonds on the minimap and map screen); spawn a horde near me; spawn a mutant near me; spawn 5 zombies near me (now with the local variant mix). The M2 "Zombie speed" toggle is replaced by the level. |
| Overlay | `Combat.zombieOverlayLine()`, `ZombieDirector.overlayLines()` | New `zombies` line: level, alive and active, by variant (citizen/police/army/mutant), how many in hordes, by what they're doing (chase/search/wander/rising), stragglers, and **how far you can be seen and heard from right now**. New `sigils` line: count (and how many on grounds), level, the next raising, the nearest sigil. The `combat` line adds scrap, pistol rounds and pickups lying about. |

### M4 follow-up: Aaron's tablet play-test (first round)

- **Dawn works:** all the zombies thin out at dawn as expected.
- **The mutant felt like a bit of a bullet sponge.** Workshopped with Aaron: health stays at 300, but aim now pays (below).

| Feedback | Change | Tune in |
| --- | --- | --- |
| The drops glare under the torch, like the signs and rocks did | Pickup colours are darkened to 0.2× (the near-white first aid kit and grey pistol rounds also got mid-tone colours), and drops within 6 m are now in the torch's glare check, so the beam dims when it's right on one. Checked side by side at night in headless Chromium: the boxes no longer burn out and still read as different items. | `config.pickups.albedoScale`, `glareRange`, `data/loot.json` colours |
| The mutant is a bullet sponge (Aaron: keep its health, add a weak spot) | **Headshots on the mutant do 4×** (other zombies stay at 3×). **A glowing red spot on its back does 8×:** a throbbing, unlit blob (it shows in the dark) that only shots from behind can reach, and a shovel swing from within 50° of straight behind lands on it too. It goes dark when the mutant dies. At level 3 (360 health) that's 3 rifle shots to the spot instead of 15 to the body. Weak-spot hits use the headshot blood, sound and hit marker. Checked in headless Chromium: one rifle shot to the spot from behind took a level 1 mutant from 300 to 100. | `config.mutant.headshotMultiplier`, `config.mutant.weakSpot` |

### M3: The map (Session 4)

Decided with Aaron before building: the map is **1 km wide by 1.4 km north to south** ("we'll see how it goes"); off the pathways, **undergrowth slows you but never blocks you** ("something the player can choose to do, but it comes at a cost"); **gentle rolling ground**; a simple but usable minimap and map screen (the final look is Session 19); runs **start at home on the cliff edge, by day**.

| Area | Files | Notes |
| --- | --- | --- |
| Map generation | `src/world/MapGenerator.js`, `mapGraph.js`, `mapGeometry.js`, `noise.js` | Pure and seeded: the same seed always gives the same map (tested on 40 seeds). **Roster:** home, the hut, the encounters that appear this run (from `data/encounters.json`: "every", "common" 75%, "uncommon" 40%, stairs 2-3), 4-6 sigil grounds (`data/sigilGrounds.json`, weighted south), then plain clearings up to 22. Each clearing gets a band, a 0-1 southness and a clearing type (`data/clearingTypes.json`). **Placement:** home 32 m south of the cliff (the compound backs onto it), the campsite 95-150 m from home, the hut at southness 0.9+, the rest at random in their bands with a 70 m gap between clearings. **Pathways:** a minimum spanning tree, plus shortcuts (shortest first) where walking the existing pathways would be 1.8× longer, never crossing another pathway or passing through a clearing. **Rules,** retried from a forked seed if broken: the hut is 4+ pathways from home (5-11 in practice); every north clearing is at most 2.5× its straight-line distance from home by pathway; the outpost is moved to a clearing 2-3 pathways from home if one exists. About 1 ms per map. |
| Ground | `src/world/GroundField.js`, `Terrain.js` | Heights from three layers of smooth noise (about ±5 m of rolling hills), levelled in clearings and smoothed along pathways, lifted onto the plateau behind the cliff. Two masks on a 2 m grid: **dirt** (bare ground on pathways and clearing centres, blended in by the ground shader from one small texture) and **open** (no trees, no undergrowth). Ground meshes are 128 m chunks; height lookups follow the mesh's exact triangles, so feet, zombies, trees and rocks sit on the drawn surface. About 1,000 rocks: round clearing edges (out of pathway mouths) and scattered through the forest, one instanced mesh per ground chunk. |
| The cliff | `src/render/Cliff.js` | A rock wall the width of the map, 26 m ± 8 m tall, wandering ±14 m north and south. Bulging face with ledges, sloping foot and ragged top; procedural rock texture. Trees grow on the plateau above it. Collision circles along its foot, and the player and zombies stay 4.5 m south of the line. |
| Forest and undergrowth | `src/render/Forest.js`, `src/world/forestLayout.js`, `src/render/mapTextures.js` | About 88,000 billboard trees and 190,000 bushes and ferns across the whole map (thicker and thinner patches), never on open ground. One atlas (3 trees + 4 undergrowth sprites); trees and bushes share each 48 m chunk's single draw call. **Undergrowth slows the player to 0.55×** (walk 4.5 → 2.5 m/s, sprint 7.2 → 4.0) **and zombies to 0.75×**, read from the ground's open mask, so the pathways matter when running. |
| Distance culling | `src/render/ChunkCuller.js` | Forest chunks, ground chunks, rocks, cliff sections and signposts are filed in a grid; only those within the draw distance are drawn, re-checked every few metres of movement. |
| Map bounds | `mapGeometry.js` `clampToWalkable()` | Replaces M1's 100 m circle. The cliff closes the north; the east, west and south edges stop 60 m inside the forest (the forest carries on beyond, darker on the map). Player and zombies use it. |
| Encounter placeholders | `src/render/Landmarks.js`, `src/data/*.json` | A wooden signpost in every clearing naming what will be there ("ROADSIDE GAS STATION / Encounter: built in M9 / Roadside clearing", "SCARECROW FIELD / Sigil ground", "RANGER STATION", "WITCH'S HUT", "BOG / Clearing"). Content comes from data only: new encounters, sigil grounds and clearing types need no code. |
| Fog of war | `src/world/FogOfWar.js` | 8 m cells over the map; walking reveals 45 m round you. `reveal(x, z, radius)` is ready for the lookout tower (M5). Saves as plain bytes (M6). |
| Minimap | `src/ui/Minimap.js`, `mapImage.js` | Round, top right. Turns with you (the way you face is up) with an N marker on the rim. Terrain, pathways and hill shading under soft-edged fog; markers for revealed clearings; living zombies in revealed areas as red dots. |
| Map screen | `src/ui/MapScreen.js`, `MapUi.js` | **D-pad up / M** opens the whole map, north up: revealed terrain, clearing markers with names (■ home, ▲ hut, ◆ encounter, ● sigil ground, ○ clearing), zombies, your arrow, percentage seen. D-pad up, M or B closes it. While it's open you can't move or fire and zombies wait (the clock runs on), like the debug menu. |
| Terrain-aware combat | `combat/hitscan.js`, `world/collision.js`, `ai/*`, `player/*` | Zombies stand at their ground height (hit boxes, sprites, glare circles, aim assist follow); shots and the torch's glare check stop where they meet the hills (`ground.rayDistance()`); rocks block between their base and top; blood lands on the slope. Flat ground stays the default in the pure functions, so the M2 tests are unchanged. |
| Debug menu | `Game.addMapDebugItems()`, `MapUi` | Teleport: next clearing (cycles all 22, with names) / home / witch's hut; reveal whole map; map screen shows the whole graph (every clearing and pathway, ignoring fog); new map (new seed); restart this map (same seed); skip to night. |
| Debug overlay | `Game.addOverlayStats()` | `player` shows your height and how deep in undergrowth you are; new `map` line: the clearing you're in or nearest (band, southness), clearing and pathway counts, % of the map seen; `world` shows tree and bush counts, chunks drawn and how long the world took to build. |
| Tests | `tests/*.test.js` | 168 tests (50 new): map generation rules over 40 seeds (roster, bands, spacing, bounds, home and campsite, hut depth, connectivity, no crossing pathways, north detours, determinism), graph maths, ground heights and masks, plateau, rays and bounds, forest and undergrowth layout, fog of war, hit-scan and torch rays on hills. |

### M3 follow-up: Aaron's tablet play-test

**Gate passed.** Aaron: the frame rate never dropped walking the map; the hills are smooth; zombies fought on slopes work; the same seed restarts to the same map; "this feels like a really good size map for the game"; "everything looks really good". Happy with the map edges as plain forest and with empty clearings ("they almost add something to the game").

| Feedback | Change | Tune in |
| --- | --- | --- |
| The minimap turns in jerks, like a jagged compass, which felt queasy | It redrew 20 times a second while the view turns at 60-90. It now redraws every frame. | `config.minimap.refreshPerSecond` (0 = every frame) |
| The undergrowth slowdown feels right, but a few more bushes would show you're in the brush | About 60% more undergrowth: 2.3 m grid instead of 2.8, thinnest patches 55% instead of 45% (about 190,000 bushes; same draw calls) | `config.forest.undergrowth.cellSize`, `densityMin` |
| The torch burns a hot spot on the signposts, like a magnifying glass (the M1 rock problem again) | The torch's glare check only saw each sign's thin post, so it never dimmed for the 2.4 m board. The board now counts, so the beam dims on it up close. The boards are darker wood with dull cream lettering. The post also stops at the board's bottom edge instead of covering the middle of the lettering. | `src/render/Landmarks.js`, `config.landmarks` |

### M2: Combat feel (Session 3)

Plan workshopped and approved by Aaron before building (rule 10). **Aaron's M2 tablet play-test: "Fighting the zombies at night was fun... real lot of fun."** M2's "done when" is met.

| Area | Files | Notes |
| --- | --- | --- |
| Combat hub | `src/combat/Combat.js` | Owns everything below and wires it through the event bus. Game calls `update()`; the player only moves while alive. |
| Weapons | `src/player/Weapons.js`, `src/combat/WeaponState.js` | Shovel, service rifle and shotgun from one table in `config.weapons`. **RB** next, **Y** previous (keys 1–4, wheel). **RT** fires (guns once per pull; the shovel keeps swinging while held). **LT** aims down sights: zoom, tighter spread, stronger aim assist. **B** reloads (rifle: whole magazine; shotgun: shell by shell, and firing cuts the reload short); an empty gun reloads when you pull the trigger. Switching takes 0.35 s. The tap that starts the game never fires. |
| Hit-scan and melee | `src/combat/hitscan.js` | Instant rays that penetrate lined-up zombies (rifle up to 4, shotgun pellets 2, losing damage each time). A zombie is a body cylinder plus a narrower head cylinder (**headshots ×3**). Tree trunks and rock bodies block shots (canopies don't). Shotgun: 8 pellets in a cone, damage falls off from 8 m to 25 m, one hit per zombie per shot. Shovel: 2.2 m reach, 70° arc, connects 0.14 s into the swing, big stagger and knockback. |
| Aim slowdown | `src/player/Player.js` | Aiming or firing slows you to 0.6× and stops a sprint (`config.player.aimMultiplier`). |
| Aim assist | `src/combat/aimAssist.js` | Light: controller look slows (to 0.45×, 0.35× aimed) over a zombie's body or head, fading out over 3°. No magnetism. Never on the mouse. Toggle in the debug menu. |
| Zombie | `src/ai/Zombie.js`, `EnemyManager.js` | One "citizen" type using level 1 rules. Pool of 25 (the active cap). Walks straight at you at 0.35–0.45× your sprint (debug: level 5 is 0.5–1.3×, skewed slow). Slides round trees and rocks, keeps apart from other zombies. Swipe: 0.5 s wind-up, 10 damage, only lands if you're still in reach. Hits flash it red, stagger and knock it back (a hit in the wind-up cancels the swipe). 60 health. Falls when killed; the body stays 20 s, then sinks away. Close zombies are fed into the torch glare check. |
| Zombie sprite | `src/render/ZombieRenderer.js`, `zombieSprite.js` | Doom-style billboard: 8 facing angles × 11 frames (walk 4, swipe 2, flinch 1, fall 4) in one procedural atlas, crisp nearest-neighbour pixels up close. One instanced draw call plus one in the torch shadow pass. Lit by the torch, casts its shadow. Dark albedo (`albedoScale`) because sprites face the torch head-on. |
| In-hand weapons | `src/player/ViewModel.js` | Placeholder box-and-cylinder models (one mesh each) tinted by the sky's light (dark at night, full colour by day), footstep-paced sway (`config.viewModel.bob`: one dip per step, 1.8 steps/s walking, 2.3 sprinting), recoil kick, pump slide, reload dip, lower and raise on switch, shovel swing, muzzle flash card. Baked shading (the torch would blow them out). |
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
| By day the gun still looks black, as if in heavy shadow | The in-hand weapons had a fixed night-time brightness. Their colours now follow the sky's real light each frame (ambient plus sun or moon, as set by the clock), plus a warm fill while the torch is on and a flash when firing. They're full colour by day and dark and moonlit at night. The parts also got real colours: walnut stocks, steel barrels, bolt and shovel blade. | `config.viewModel.lighting` |
| A red X stays over the crosshair | Bug: the HUD only touches the page when a value changes, and the hit marker bypassed that bookkeeping, so after the first marker cleared, later ones were never cleared. Fixed; the marker now always fades after its 0.18 s (0.29 s on a kill). | `src/ui/Hud.js` |
| Bullets should carve through lined-up mobs | Penetration, per weapon: a rifle round passes through up to **4 zombies**, keeping 75% of its damage after each (25 / 19 / 14 / 11). Each shotgun pellet goes through **2**, keeping 50%, so a blast carries into the second rank. Trees and rocks still stop rounds. | `config.weapons.*.pierce`, `pierceKeep` |

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

- `npm run dev`, `npm run build` and `npm test` (**238/238**, 70 new) all pass.
- **M4 in headless Chromium (software GPU, so no timings for the tablet):**
  - The stand-in planted five sigils on seed 1234 (four on sigil grounds, one in the woods by the gas station) and refused a sixth; level went to 5. Five sigils on six other seeds all follow the planting rules (tests).
  - At night the sigils raised zombies that climbed out of the ground and wandered off; a police zombie came from the roadside mix. The glyph reads clearly at night, faintly by day; the halo fades as you walk up.
  - A mutant and a horde spawned and came for the player; the mutant falls sideways when killed and drops its loot. Police (vest and cap) and army (helmet) sprites read correctly.
  - Killing 12 police and army zombies dropped 14 pickups; walking over them took vests and helmets up to 100 ballistic, rifle rounds and pistol rounds, with the pickup feed; the rest stayed lying (full armour bar).
  - Holding E on a sigil showed "Hold E: dig up the sigil", then "Digging up the sigil…" with the bar, dug it up and toasted.
  - The map screen stopped the clock.
  - At dusk on day 2 the stand-in planted one sigil.
  - **64 zombies (the whole pool), all thinking and moving: about 0.1 ms of simulation per frame**, 47 draw calls at night (budget ~100).
  - No console errors.
- `npm run preview` and the production build at `/WitchHunt/` ran with no console errors in M3 (not re-checked in M4 beyond `npm run build`).
- **M3 in headless Chromium (software GPU, so no timings):**
  - Every seed tried generates a valid map (200 seeds in the generator check; 40 in the tests), almost always on the first attempt. The world (map, ground, 88k trees, 120k bushes, rocks, cliff, signposts) builds in about 0.5 s; JS heap about 97 MB.
  - **Draw calls 45-67 at night with the torch shadow** (budget ~100), checked standing at all 22 clearings and the middle of all 26 pathways; at most 63k triangles.
  - Walking 4.5 m/s on a pathway, 2.5 in the undergrowth; sprinting 7.2 / 4.0.
  - Zombies spawn on the hills, walk at 0.75× in undergrowth, show on the minimap; rifle hits on a zombie standing 1.2 m higher land and kill.
  - Screenshots: the cliff face up close, a pathway by day and night, the forest with undergrowth, the minimap turning with the view, the map screen with fog and labels.
- **M1 performance gate passed on the tablet (Aaron):** a steady 60 fps for 20+ minutes of night walking at Medium, the tablet warm but not hot. Locking and unlocking, controller off and on, and leaving fullscreen all recover.
- **M2 on the tablet (Aaron):** fighting zombies at night is fun. **60 fps the whole time, even with 20+ zombies spawned at once.** B always reloads and never leaves fullscreen. The torch is enough to fight by. The dead trees look "much, much better" and the rock glare is gone.
- **M2 follow-ups on the tablet (Aaron, second test):** the footstep-paced weapon sway, the gun's colours by day, the hit marker clearing, and penetration all work ("being able to shoot through the crowd was really enjoyable").
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

- **M4 on the tablet** (Aaron's play-test): frame rate with many zombies and up to five sigils visible, whether the level changes are visible enough, whether the detection numbers feel fair, the mutant's look and toughness, and the sigil glow at night on the real screen.
- The dawn thinning over a real 60 s dawn in the browser (the unit test covers it; the debug time speed-up only speeds the clock, not the zombies, so it can't be hurried).
- The M3 follow-ups (smooth minimap, more bushes, sign glare) on the tablet.
- How long the world takes to build on the tablet (about 0.55 s on a desktop CPU).

- Whether the placeholder sounds play on Android Chrome (Aaron didn't mention them either way).
- Feel numbers (aim assist strength, recoil, zombie damage, headshot ×3) passed a first play-test; they get their real tuning in M14.
- Headless runs use a software GPU (~10 fps), so its timings say nothing about the tablet.

## Stubbed / placeholder (by design)

- All art is procedural placeholder (tree sprites, ground, torch pattern, moon). The art pass replaces it.
- Encounters are signposts only: each is built in its own milestone (M5 home, M7 hut, M9-M11 encounters). Sigil grounds work for play (M4) but look like a signpost and a ring of stakes; their set dressing and twists (the scarecrow that turns its head, open graves, stick figures, the hanging oak's ropes, the circus sideshows) and the tells before she uses one (crows, turned earth, candles) are for an encounter session.
- **The witch doesn't exist yet: a stand-in plants the sigils** at dusk from night 2, one a night (M7 replaces it with her planting, interruption and ambushes).
- The mutant is a placeholder of boxes; the miner variant waits for the mineshaft (M9); the siege goal waits for the station (M5).
- Encounter placement hints not yet honoured: the gas station "on a road edge" (no roads yet), the mineshaft "hillside edge", stairs "off-path", the Bigfoot cave "rocky clearing or path edge", the crashed plane "off a pathway" (OPEN_QUESTIONS #42).
- Clearing types (bog, graveyard, roadside, checkpoint, standing stones) tint the map, name the signpost and set the zombie variant mix (M4); their look arrives with the style passes.
- The east, west and south map edges are an invisible line inside dense forest (Aaron: fine as it is).
- The HUD is a placeholder (no pixel font, clock or glyphs); the minimap and map screen are simple placeholders (final look Session 19); no pause menu.
- **Every zombie on the map is fully simulated** (one pool of 64) until M6's tiers; distant ones are cheap but the pool can fill on a busy night, and then sigils stop raising until some die or sink at dawn.
- Pathfinding is pathways plus straight lines: a chasing zombie walks straight at you and slides round trunks; it can snag on a rock or a dense cluster.
- The zombie sprite, the in-hand weapons and every sound are placeholders (art pass M13, audio pass Session 20).
- Pistol rounds and scrap are counted but have no use yet (the pistol and building arrive later); the inventory screen is later.
- Not built from "Visual ambition": ground mist layers, height fog, fake light shafts, fireflies and other particles, normal-mapped blended ground, distant impostor tweaks, retro pixel filter. These belong to the style passes (OPEN_QUESTIONS #21).
- Billboard trees look like flat cards when you stand right next to one, the expected trade-off of sprites (the decision Aaron made). Final art can soften this with wider, bushier sprites.
- The placeholder drawing proportions in `proceduralTextures.js` (tier shapes, gradient stops) are hard-coded rather than in config, since the whole file is thrown away in the art pass. Colours, counts and sizes are in config.

## Dependencies

Only `three` (runtime), `vite` and `vitest` (dev). Post-processing and geometry merging use three.js's own `three/addons` modules, which ship inside the `three` package. Sounds use the browser's Web Audio API.

## Known issues and risks

- **M4: zombie numbers on a busy night.** Up to 64 zombies (five sigils × six each, plus hordes) all simulated and drawn; the headless check had 64 cost about 0.1 ms of simulation and 47 draw calls, but the tablet hasn't seen it. Levers: `zombies.poolSize`, `sigils.perSigilCap`, `sigils.spawnInterval`, `zombies.horde.countMax`. M6's tiers are the real fix.
- **M4: the mutant is tanky** (360 health at level 3). If it feels like a sponge rather than a mini-boss, lower `mutant.health`.
- **M4: zombies see through trees.** Sight only checks the hills, not trunks (88,000 of them). In the forest the brush multiplier (×0.75) stands in for cover. If being spotted through thick woods feels unfair, lower `detection.undergrowth`.

0. **M3 memory and load:** about 210,000 tree and bush sprites and 88,000 colliders are plain JS objects (heap about 97 MB). Fine on the tablet's RAM, but if load time or memory becomes a problem, the levers are `forest.undergrowth.cellSize` (fewer bushes), `forest.cellSize`, or packing the layouts into typed arrays.

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

## What M5 needs next

M5, **The station** (Session 6, Gameplay Programmer): compound layout, fence and batteries, doors, comms room, ledger, security rating, turret, real-time base defence, vehicles and battery pulling. Done when a night defending the station is tense and readable.

- **Zombies already know about a station:** set `game.combat.enemies.station = { x, z, baseRadius }` and any zombie that hasn't noticed the player but is within `baseRadius` switches to mode `'siege'` and walks to (x, z) (`src/ai/ZombieBrain.js`). M5 adds what they do there (attack the fence, doors and turret) and should use the level's `defenceDamage` (`config.zombies.levels`).
- Zombies wander the pathways, and home is a clearing on the graph, so some will wander into the compound by themselves.
- The turret's targets: `enemies.living` (each has `x, y, z, hitRadius, height, headBottom, headRadius`, `kind` 'zombie' or 'mutant'); apply hits with `enemies.damage(zombie, amount, part, { stagger, knockback }, at, from)`, which drops loot.
- Scrap from zombies is counted in `combat.inventory.scrap`, ready for the ledger.
- Noise: `enemies.alert(x, z, radius)` brings zombies to a loud noise (the turret firing, an alarm). Gunfire uses each weapon's `noise` (`config.weapons.*.noise`).
- The stand-in planter keeps sigils 160 m from home (`config.planter.homeMinDistance`).

## What M4 needed (done)

M4, **Sigils and zombies** (Session 5, AI Programmer): sigils, night spawning, five-sigil cap, levels 1-5, variants, speed variance, hordes, mutants, loot, digging, sigil grounds, detection model, targeting. Done when raising the level by debug visibly changes the night.

- M3's gate is passed (Aaron: no frame drops walking the map).
- `game.world.map.clearings` lists every clearing with `kind` ('home', 'hut', 'encounter', 'sigilGround', 'wild'), `band`, `southness`, `clearingType` and `hopsFromHome`. Sigil grounds are `kind: 'sigilGround'`. Clearing types carry a zombie variant mix in `data/clearingTypes.json` (`variants`).
- `game.world.map.paths` (polylines) and `edges` (with lengths) are the pathway graph for "random walk along the pathway graph" targeting; `mapGraph.js` has `adjacency`, `hopCounts` and `graphDistance`.
- `game.world.ground`: `heightAt`, `undergrowthAt`, `openAt`, `clamp`, `rayDistance` (line of sight over hills).
- Zombies already stand on the ground (`zombie.y`) and slow in undergrowth (`moveScale`).
