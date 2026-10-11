# Handover

## Just finished: Session 3, Gameplay Programmer, M2 (Combat feel)

Aaron approved the M2 build plan before anything was built (rule 10), and made these calls:

- **RB = next weapon, Y = previous**; **D-pad right = first aid**.
- **Headshots: yes** ("×2 at least, open to ×3–4"); M2 uses ×3.
- **Placeholder sounds: yes**, flagged everywhere as **to be upgraded** in the audio pass.

DESIGN.md "Controls" is updated to match.

### What was built

Details in `STATUS.md` ("M2: Combat feel"):

- **Weapons:** shovel, service rifle and shotgun. Fire, aim down sights, reload, switch, recoil and muzzle flash.
- **Hits:** hit-scan with head and body hit boxes; trees and rocks block shots.
- **Aim:** light aim assist (controller only), and the slowdown while aiming or firing.
- **The zombie:** one Doom-style billboard type, 8 angles × 11 frames from one procedural atlas. It walks in, swipes, staggers, falls, then lies as a corpse.
- **Health and healing:** health, three armour bars, first aid kits with the healing queue.
- **Feedback:** blood and dust particles, a placeholder HUD, placeholder sounds, the death screen with "try again".
- **Debug tools:** spawn zombies, zombie speed level 1/5, god mode, give items, aim assist toggle, and a combat line on the overlay.
- **Tests:** 113 pass.

### M1 follow-ups from Aaron's 20-minute test (gate passed: 60 fps throughout)

1. Dead trees have real bark detail up close.
2. A wide, dim spill light round the torch beam, so the edges of the view aren't black.
3. The torch now dims on rock tops: the "magnifying glass" spot. Aaron's screenshot never arrived, so please re-check on the tablet.

### Aaron's M2 play-test on the tablet: passed

- **"Fighting the zombies at night was fun... real lot of fun."** M2's "done when" is met.
- **60 fps the entire time, even with 20+ zombies spawned at once.**
- **B** always reloads and never leaves fullscreen (the M0 worry is closed).
- The torch is enough to see by in a fight.
- The dead trees look "much, much better", and the rock glare is gone.
- **Fixes made after the test:** the stuck red hit marker (a HUD bookkeeping bug), and bullet **penetration** (Aaron: "carve through the mobs"): a rifle round goes through up to 4 zombies, shotgun pellets 2 (`config.weapons.*.pierce`).
- **Fix made after the test:** by day the gun looked black. The view model's colours now follow the sky's light (`config.viewModel.lighting`), with real wood and steel colours.
- **Fix made after the test:** the weapon in hand bobbed far too fast and vibrated at a sprint. It was tied to the head-bob cycle and doubled. It now sways at its own footstep pace (`config.viewModel.bob`). This was checked headless only, so give it a quick look on the tablet.

### Unfinished

Nothing in M2's scope. The sounds weren't commented on: worth a listen.

## Play-test script for Aaron (M2, as used)

**Setup:** open the live build on the tablet with the controller. The overlay is on. Hold **View + D-pad down** for the debug menu.

1. **First fight:**
   - Open the debug menu, pick **Spawn 5 zombies**, close it with B.
   - Listen for groans and find them with the torch.
   - Good: they read as figures in the beam, turn as they walk, and you can tell front from back.
2. **Rifle (you start with it, RT):**
   - Shoot one in the body three times, then another in the head.
   - Good: hit markers, blood, a red flash on the zombie, and a stagger. A headshot (yellow marker) kills with one shot.
   - B reloads. Firing on an empty magazine reloads too.
3. **Aim (hold LT):**
   - The view zooms and you slow down.
   - Sweep the crosshair across a zombie.
   - Good: the stick feels a little "sticky" over it, not grabby.
   - Compare with **Aim assist: off** in the debug menu.
4. **Shotgun (RB):**
   - Let them get close, then fire.
   - Good: a big kick; one close blast drops or nearly drops a zombie; distant shots are weak.
5. **Shovel (RB again, or Y to go back):**
   - Hold RT next to a zombie.
   - Good: a swing you can see, a thunk, the zombie knocked back. Three hits kill.
6. **Getting hurt:**
   - Let one swipe you.
   - Good: a red edge, a shake, a health segment gone.
   - Back off during its wind-up and the swipe should miss.
   - **D-pad right** uses a first aid kit: a green "+", and health climbs over 3 s.
7. **Death:**
   - Let them kill you, then press A to try again.
8. **Fast zombies:**
   - Pick **Zombie speed: level 5** and spawn 5 more.
   - Good: one or two outrun you, so you have to stop, turn and shoot.
9. **M1 checks:**
   - Walk up to a dead tree (bark detail?).
   - Look at the edges of the view with the torch on (better?).
   - Aim the torch straight down onto a rock from close (no burning spot?).
10. **Report:**
    - fps during a fight.
    - Whether B ever leaves fullscreen.
    - What's not fun: too easy, too hard, too floaty, too sticky, too loud.

## Next: Session 4, Lead Engineer, M3 (The map)

**Goal:** seeded generation of 22 clearings in bands, the cliff, pathways, chunked forest, colliders, fog of war, minimap and map screen, and encounter placeholders from data. **Done when** a whole map generates the same from a seed, and walking end to end holds the frame target on the tablet (a performance gate).

### Look at first

- `src/world/forestLayout.js`, `Forest.js`, `Terrain.js`: the M1 clearing that M3 replaces. Forest chunks already exist (`config.forest.chunkSize`).
- `src/world/SpatialGrid.js`: static colliders.
  - The player, zombies (`ai/EnemyManager.js`), shots (`combat/hitscan.js` `rayBlockers`) and torch glare all use it.
  - New colliders should carry `r` (blocks movement and bullets), and optionally `vr` (what the torch glare sees) and `top` (a height, for rocks: shots pass over it).
- `config.world.boundaryRadius`: both the player and zombies clamp to it. Replace it with the map's bounds.
- `src/combat/Combat.js`: the combat hub. `EnemyManager.spawnAround()` is the spawn entry point. M4 (AI Programmer) owns spawning from sigils.

### Gotchas and decisions

- **Systems:** follow `init()` / `update(dt)` / `dispose()`, talk through `EventBus`, and use `rng.fork('label')` per system.
- **Draw calls:** about 48–57 at Medium in a fight (budget ~100). The zombie pool is one instanced draw plus one in the shadow pass; each in-hand weapon is one mesh.
- **Lights:** the torch is the only shadow caster. Lights now present: torch, torch spill, muzzle flash (always in the scene, intensity only), moon/sun and ambient. DESIGN.md allows about 4 point lights. Never toggle a light's `visible` mid-game (it recompiles shaders): change its intensity.
- **Dark albedos:** light colours blow out under the torch (rocks, zombies). Zombies use `albedoScale`.
- **The in-hand weapon isn't lit by scene lights**: it reads the Sky's `ambient` and `light` each frame (passed to `Combat.init` as `lights`). If the sky or lighting changes (blood night, interiors), the gun follows automatically.
- **The camera is in the scene** (`scene.add(player.camera)`), because the in-hand weapon hangs off it.
- **The start tap never fires a weapon:** `Weapons.holdFire()` waits for the trigger to be released. Call it again if a future pause menu resumes with a click.
- **Combat events:** `enemy:hit`, `enemy:killed`, `enemy:strike`, `weapon:fired`, `weapon:hit`, `weapon:impact`, `player:hurt`, `player:died`.
- **Vite `base`** is `/WitchHunt/`: never hard-code `/assets/...` paths.

### Open questions for Aaron

These are in `OPEN_QUESTIONS.md` #22–33. The main ones:

- Is ×3 the right headshot multiplier?
- How hard should zombies hit (10 per swipe, 0.5 s wind-up)?
- Starting ammo (rifle 5 + 10, shotgun 4 + 12).
- How strong should aim assist be?

## Session kickoff prompt for Session 4

```
You are the Lead Engineer on Witch Hunt, Session 4.
Read docs/DESIGN.md (especially "Build plan" and "Team roles and session plan"), STATUS.md and HANDOVER.md.
Then confirm your role, this session's goal and any questions before starting.
Follow the handover protocol, and end with the HANDOVER READY signal.
```
