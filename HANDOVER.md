# Handover

## Just finished: Session 5, AI Programmer, M4 (Sigils and zombies)

**Status: built, tested headless, and waiting on Aaron's tablet play-test** (script below). The M4 "done when" is: **raising the level by debug visibly changes the night.**

Aaron's calls before building (rule 10):

- **Mutant zombie: a placeholder 3D model is fine.** Built from boxes; the real model is the art pass.
- **Sigil grounds: only what matters for play now.** The witch prefers them and they raise faster, plus a simple marker. The scarecrow, cemetery, circus scares and the crows-and-candles tells are for an encounter session.
- **A stand-in plants the sigils until the witch exists (M7).**
- **Loot: all fine.** Police vests and army helmets feed M2's armour, pistol ammo goes in the inventory for the pistol, and miner zombies wait for the mineshaft (M9).
- **The map screen pauses the game** (OPEN_QUESTIONS #39, resolved). DESIGN.md "The map screen and fog of war" is updated.

### What was built

Details in `STATUS.md` ("M4: Sigils and zombies"):

- **Sigils:**
  - Each one raises zombies round itself at night, up to 6 of its own.
  - At most five at once. **Zombie level = the number of sigils.**
  - Sigils on sigil grounds raise faster.
  - Look: a glowing glyph in turned earth with a soft halo, faint by day.
- **Stand-in planter:** at each dusk from night 2 it plants one sigil, 60% on empty sigil grounds, the rest just off a pathway in the woods.
- **Sigil grounds:** a ring of dark stakes marks each one.
- **Digging:** hold X for 4 s by a sigil, with a prompt and a bar. Damage loses the progress. Once it's up, the level drops at once.
- **Levels 1-5** (the DESIGN.md table):
  - Each level sets the speed range, horde chance and mutant chance.
  - Health, damage and notice range all grow with the level.
  - Every zombie keeps its speed roll, so **a level change speeds up or slows down every living zombie at once.**
- **Variants:** citizen, police and army, each with its own sprite and toughness. The mix comes from each clearing type.
- **Hordes:** 7-15 slow zombies that wander as a pack and all come when one sees you.
- **Mutants:** a placeholder 3D giant made of boxes. Tough and slow, with a heavy swipe. At most 4 at once.
- **Detection** (one model): distance, line of sight over the hills, daylight, torch, crouch, brush, footsteps and gunfire.
- **Targeting:**
  - Each zombie chases you once it notices you, keeps after you a while, then searches where it last saw you, then wanders the pathways.
  - A station "siege" goal is wired in, waiting for M5.
- **Rising and dawn:** zombies climb out of the ground. At dawn 85% sink back in; the rest stay as daytime stragglers.
- **Loot and pickups:**
  - Drops from data tables (`data/loot.json`).
  - Walk over a pickup to take it. A full armour bar or kit bag leaves it lying.
  - A pickup feed shows bottom right.
- **Debug and overlay:**
  - Debug menu: zombie level (auto or fixed), plant sigils, raise zombies now, teleport to a sigil, sigils on the map, spawn a horde or a mutant.
  - New overlay lines: `zombies` (variants, modes, how far you're seen and heard) and `sigils`.
- **Tests:** 234 pass (66 new).

### Checked in headless Chromium (no tablet timings)

- Planting, raising, levels, variants, hordes, the mutant (including its death and loot), the pickup rules, the dig, the map pause and dusk planting all worked.
- **64 zombies cost about 0.1 ms of simulation per frame; 47 draw calls at night** (budget ~100).
- No console errors.

### Unfinished or for later

- The dawn thinning over a real 60 s dawn hasn't been watched in the browser. The unit test covers it, and the time speed-up can't hurry it.
- Zombies see through trees; only hills block sight (OPEN_QUESTIONS #55).
- Encounter placement hints are still not honoured (#42, for the encounter sessions).

## Play-test script for Aaron (M4)

**Setup:**

- Open the live build on the tablet with the controller. The overlay is on; the new lines are `zombies` and `sigils`.
- You start at home by day. Hold **View + D-pad down** for the debug menu.
- Turn **God mode** on for steps 2-4 if you want to look rather than fight.

1. **A sigil by day, then by night:**
   - Debug menu: **Plant sigil (stand-in witch)**. A toast says where it went.
   - Then **Teleport: next sigil**.
   - Good: by day, a faint green glyph in a patch of dark earth.
   - Then **Skip to night**.
   - Good: the glyph glows plainly, with a soft halo you can spot from a distance. The halo fades as you walk up.
   - If it was on a sigil ground, you'll see a ring of dark stakes round the clearing.
2. **Zombies rising (level 1):**
   - Stand about 15 m from the sigil. Debug menu: **Raise zombies now**, a few times.
   - Good: zombies climb out of the ground round it and shamble off along the pathways.
   - Their sprite and mix follow the clearing type: a roadside sigil raises mostly police, a checkpoint mostly army.
3. **Being noticed (the detection model):**
   - Crouch (R3) and turn the torch off (D-pad left). Creep toward a wandering zombie.
   - Good: it shouldn't notice you until about 6 m (watch `seen from` on the `zombies` line).
   - Stand up and turn the torch on.
   - Good: it notices from about 30 m, speeds up and comes at you.
   - Fire the rifle once.
   - Good: zombies further off turn and come too.
   - Run away and break line of sight.
   - Good: after a few seconds they search where they last saw you, then give up and wander.
4. **The level changes the night (the M4 gate):**
   - Debug menu: **Zombie level** (cycle to **fixed L1**), then **Spawn 5 zombies near me**. Note how slow they are.
   - Cycle to **fixed L5** and watch the same zombies: they speed up straight away, and a few now outrun your sprint.
   - Then **Raise zombies now** a few more times at level 5.
   - Good: hordes (a tight pack of 7-15) and now and then a **mutant** (a hunched box giant).
   - Set the level back to **auto**.
5. **The mutant:**
   - Debug menu: **Spawn a mutant near me**. Fight it with God mode off.
   - Good: it's slow, shrugs off most of the stun, and its swipe has a long wind-up you can dodge but hurts.
   - Is it a fun mini-boss, or a bullet sponge? It takes about 15 rifle body shots at level 3, or 5 headshots.
6. **Loot:**
   - Kill some police and army zombies, then walk over the coloured boxes they drop.
   - Good: "+ police vest (+40 ballistic)", "+5 rifle rounds" and so on bottom right, and the armour bar fills.
   - With a full armour bar, a vest stays on the ground.
7. **Digging:**
   - Plant five sigils (overlay: `5/5 sigils`, level L5). Stand on one: the prompt "Hold X: dig up the sigil" appears.
   - Hold X for 4 seconds.
   - Good: a bar fills, then a chime and "zombie level 5 → 4". The zombies already about slow down.
   - Try again and let a zombie hit you mid-dig.
   - Good: the progress is lost.
8. **A whole night:**
   - **Remove all sigils**, then plant 2-3 with the stand-in.
   - Skip to night and play it out normally, with **Sigils on the map** on if you want to find them.
   - Watch fps the whole time (top left), especially with many zombies about.
   - At dawn, wait the real minute.
   - Good: most zombies sink back into the ground (never right in front of you), and a few stay as stragglers.
9. **The map pauses:**
   - Open the map (D-pad up) at night and wait a while, then close it.
   - Good: the clock (overlay) hasn't moved.
10. **Report:**
    - fps at the worst moment, and whether the tablet got warm.
    - Whether level 1 vs level 5 feels clearly different.
    - Whether being seen feels fair (too easy or too hard to sneak).
    - The mutant's look and toughness.
    - Anything that looked wrong.

## Next: Session 6, Gameplay Programmer, M5 (The station)

**Goal:** the compound layout, fence and batteries, doors, comms room, ledger, security rating, turret, real-time base defence, vehicles and battery pulling. **Done when** a night defending the station is tense and readable.

Rule 10: the station is content (layout, look, the turret), so workshop the build plan with Aaron first.

### Look at first

- **`STATUS.md` "What M5 needs next":**
  - The zombie hooks: `enemies.station = { x, z, baseRadius }` switches nearby zombies to a `'siege'` goal.
  - Each level's `defenceDamage` is for zombies hitting the defences.
  - `enemies.living` and `enemies.damage()` are there for the turret.
  - `enemies.alert()` handles noise.
- `src/ai/ZombieBrain.js`: the siege goal. Zombies walk to the station; M5 decides what they do there.
- `src/ai/EnemyManager.js`:
  - `spawnZombie()` and `spawnPlanned()` (singles, hordes, mutants).
  - `living`, `damage()`, `alert()`, `tally()`.
- `src/combat/Combat.js`: loot, pickups and `inventory.scrap` (for the ledger).
- `src/world/World.js`: `home` is the station's clearing, 32 m south of the cliff.

### Gotchas and decisions

- **Systems:** follow `init()` / `update(dt)` / `dispose()`, talk through `EventBus`, and use `rng.fork('label')` per system.
- **Night pacing:** the stand-in planter adds one sigil a night from night 2, so a test night at home needs sigils. Use the debug menu: plant sigils, raise zombies now, or fix the level.
- **Every zombie is fully simulated** until M6. The pool is 64; when it's full, sigils stop raising.
- **Mutants are 3D** (`MutantRenderer`), the rest are sprites (`ZombieRenderer`). Both read the same pool. Mutants have `kind: 'mutant'` and a bigger hit shape.
- **Draw calls:** 47-60 at night with zombies (budget ~100). Each visible sigil adds 2 draws, each sigil ground 1.
- **Anything with a height** stands at `ground.heightAt(x, z)`.
- **Anything a shot or the torch should hit** goes in the collider grid (`r`, optional `vr`, `base`, `top`).
- **The map screen now pauses everything, clock included.** The debug menu still lets the clock run.
- **Vite `base`** is `/WitchHunt/`: never hard-code `/assets/...` paths.

### Open questions for Aaron

These are in `OPEN_QUESTIONS.md` #51-65 (the numbers M4 picked). The main ones to look at after the play-test:

- The per-sigil cap and raising rate (#51).
- The stand-in's pace of one sigil a night (#52).
- The detection ranges (#54).
- The mutant's toughness (#60).

## Session kickoff prompt for Session 6

```
You are the Gameplay Programmer on Witch Hunt, Session 6.
Read docs/DESIGN.md (especially "Build plan" and "Team roles and session plan"), STATUS.md and HANDOVER.md.
Then confirm your role, this session's goal and any questions before starting.
Follow the handover protocol, and end with the HANDOVER READY signal.
```
