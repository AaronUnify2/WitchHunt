# Handover

## Just finished: Session 6, Gameplay Programmer, M5 part 1 (The station)

**Status: built, play-tested by Aaron on the tablet over two rounds, his fixes made; he confirmed the last fix (the retry bug) and called the handover.** His full night-defence verdict and the numbers are still to come (play-test script below). M5 is split in two, as agreed with Aaron:

- **Part 1 (this session):** the compound and its defences.
- **Part 2 (next session):** vehicles and battery pulling.

The M5 "done when" is: **a night defending the station is tense and readable.** It can be judged now with debug batteries.

Aaron's calls before building (rule 10):

- **The M4 follow-ups work.** He shot the mutant's weak spot and saw it charge.
- **The turret comes from the debug menu** until the Car Armory (M11). "Let's keep it simple."
- **The fence:** 12 segments ("about right") plus a gate that opens itself.
- **Spending scrap:** barricades, spike traps and floodlights are in.
- **Start of a run:** the east fence torn up, a little scrap in the inventory, no charge.
- **Batteries:** carry as many as you find, with no slowdown.
- **Prices:** placeholders, to be settled in the play-test.
- **The turret's rounds** go through crowds even more than the rifle's: "make a bit of a spectacle of this".
- **Splitting the session** is fine: about 400k tokens, then evaluate.

### What was built

Details are in `STATUS.md` ("M5 part 1"):

- **The compound** (placeholder boxes):
  - A chain-link fence from cliff to cliff: 12 segments plus a gate due south. The top wires glow blue while charged.
  - The cabin: front door, the fortified comms room (desk, radio, CCTV monitors, the ledger, the family as placeholder figures), glowing windows at night.
  - The fire lookout tower, the turret pad and the fence box.
- **The siege:**
  - Zombies near the station make for the comms room.
  - They walk round the outside of the fence to a nearby gap, or claw the segment in front of them.
  - Then they go round the cabin, break the front door, then the comms door.
  - A zombie in the comms room ends the run: "The station fell".
  - Breaches toast with a crash ("The east fence 2 is down!").
- **The electric fence:** a charged fence zaps zombies that claw it (sparks, damage, a stun) at a cost in charge. The charge drains each night.
- **Defences:**
  - Repair the fence, gate, doors and barricades with scrap (part repairs if you're short).
  - Barricades behind segments, reinforced doors, spike traps outside segments, and floodlights. Floodlights are fake light pools, and zombies in them are lit up.
- **The turret:**
  - Install, load (any ammo, converted by damage) and set the mode (slow, medium or fast).
  - It shoots zombies inside the fence first, then those clawing, then the nearest.
  - Each round pierces up to 7 zombies, with a tracer, a flash and a loud report.
- **The gate and doors** open themselves for you and close behind you.
- **The tower:** climb it to reveal the map round the station. Zombies can't reach you up there.
- **Hold X to interact:** repair, build, fit a battery, install or load the turret, climb, open the ledger.
- **The ledger:** a placeholder book with tabs for Fence, Doors, Turret, Power, Upgrades and Security. The clock runs while it's open.
- **HUD strip** under the minimap near home:
  - Security and charge.
  - A pip per fence segment and door, flashing while it's being clawed.
  - The turret's status.
- **Tests:** 268 pass (26 new).

### Checked in headless Chromium (no tablet timings)

- Building, repairing, batteries, the turret firing and killing, a siege breaking the fence, a full overrun (through the torn east gap, round the cabin, both doors) and "try again" resetting the station all worked.
- With real keys: hold E repairs and fits batteries, the ledger works, the doors and gate open, the fence blocks you, the tower climbs.
- **Draw calls 77-86 by day at home, 57-82 at night** (budget ~100).
- No console errors.

### Aaron's play-tests of part 1 (all fixed)

- The turret, gate, fence box and tower railing glared under the torch: darker, plus glare-only shapes the torch dims on.
- **Turret menu:** hold X at the turret, then load 1, 5 or all of each ammo type.
- Zombies at the station go for whichever is nearer: you, or the defence in their way.
- **Barricades, spikes and floodlights didn't show** (an instancing bug; their colliders worked, which is probably why zombies and Aaron got stuck at a "broken" fence). Fixed.
- Letting go of X drains the hold bar (digging too).
- **LB is now previous weapon**; Y is the flare (later).
- The floodlight beam looked like a grey wall; now a faint beam and a pool.
- **Second round:** after dying or an overrun, zombies got stuck on the fence and he couldn't get into the cabin. "Try again" rebuilt the barriers but the fence and door colliders were keyed to the old ones; now keyed by id. **Aaron confirmed it's fixed.**
- Scrolling up a menu (ledger, debug menu) kept the highlight pinned at the bottom: the list's scroll is now kept across redraws.

Gotcha from this: `StationState.init()` replaces every barrier object on "try again". Anything that holds on to a barrier must look it up by id (`state.barriers()`), as `syncColliders()` now does.

### Unfinished

- **Vehicles and battery pulling** (M5 part 2, next session). Until then batteries come from the debug menu.

## Play-test script for Aaron (M5 part 1)

**Setup:**

- Open the live build on the tablet with the controller. The overlay has a new `station` line.
- You start in the yard between the cabin and the gate, by day. The debug menu is **View + D-pad down**. The station items start with "Station:".

1. **Look round the compound (by day):**
   - Walk round the cabin, the tower and the fence, and out through the gate (it slides open as you come up to it).
   - Good: it reads as a ranger station against the cliff.
   - The east end of the fence is torn down: two panels flat, one leaning.
   - Bottom right shows "Scrap 30".
2. **Repair the east fence:**
   - Stand at a flat panel. The prompt reads "Hold X: repair the east fence 2 0/200 (12 scrap)". Hold X.
   - Good: hammering, the panel stands up again, and the strip under the minimap turns that pip green.
   - You can afford about two and a half segments.
3. **The ledger:**
   - Go in the front door (it opens), then the comms room door. Hold X at the desk.
   - LB / RB change tabs, the D-pad moves, A buys, B closes.
   - Look at each tab. Security shows the breakdown.
   - Good: readable on the tablet. Note anything confusing.
4. **Power:**
   - Debug menu: **Station: give a battery** (a couple of times). Hold X at the fence box just inside the gate.
   - Good: a clunk and hum, the top wires glow blue, and the charge reads 100.
5. **The turret:**
   - Debug menu: **Station: give the turret**, and **Give ammo**. Hold X on the pad in front of the cabin to install it.
   - Hold X again for its menu: load what you like (1, 5 or all of each ammo type) and set the mode to **fast**.
6. **A night at the station (the M5 gate):**
   - Debug menu: **Skip to night**, then **Station: siege wave** (10 zombies outside the fence), two or three times.
   - Watch from the yard, then climb the tower (hold X at the ladder) and watch from above.
   - Good:
     - The zombies come to the fence and claw it. The charged fence sparks and throws them back.
     - The turret swings round and carves through them with tracers.
     - The strip's pips flash where they're clawing, and a toast names any segment that falls.
   - Try it again with **Zombie level: fixed L5** and no turret ammo.
   - **Is it tense? Can you tell what's happening and where?**
7. **Spending scrap:**
   - Debug menu: **Station: give 50 scrap** a few times.
   - In the ledger, build barricades, spike traps, a floodlight or two, and reinforce the doors. At night:
     - The floodlights light a pool outside the fence, and zombies in it show up.
     - The spikes bite.
     - Zombies have to break the barricade after the fence.
8. **Losing the station:**
   - Debug menu: **Station: drain the fence charge**, **Station: break a random fence segment** a few times, then **Station: siege wave** (God mode on).
   - Let them in.
   - Good: they go round the cabin, break the front door, then the comms door, and the run ends with "The station fell". A starts again with a fresh station.
9. **Report:**
   - fps at the worst moment (most zombies, turret firing), and whether the tablet got warm.
   - Whether a night at the station is tense and readable.
   - Prices and health: too cheap, too dear, too tough, too weak?
   - The turret: spectacle enough?
   - The ledger on the controller.
   - Anything that looked wrong (zombies stuck on walls or corners, the fence, the doors).

## Next: Session 6b, Gameplay Programmer, M5 part 2 (vehicles and batteries)

**Goal:** abandoned cars and trucks, searching them for scrap and ammo, and pulling batteries (DESIGN.md "Vehicles and batteries"). **Done when** the night is tense and readable *and* batteries come from the world, not the debug menu.

Rule 10: vehicles are content (the look, how many, where, the battery-pulling animation), so workshop the build plan with Aaron first. Fold in any fixes from his M5 part 1 play-test first.

### Look at first

- **`STATUS.md` "What M5 part 2 needs next"**.
- `src/base/Station.js`:
  - `pickInteraction()` shows how hold-X prompts are offered (spots before lines).
  - `fitBattery()` takes batteries from `combat.inventory`.
- `src/player/HoldAction.js`: the generic hold-X helper (let go between actions; damage interrupts).
- `src/combat/loot.js` and `src/data/loot.json`: loot tables for searching cabins and boots.
- `src/world/collision.js` `segmentCollider()`: thick-segment colliders, good for car bodies (blocks shots if you want).
- `combat.promptSources`: push a `{ prompt, progress }` object to show prompts on the HUD.

### Gotchas and decisions

- **Systems:** follow `init()` / `update(dt)` / `dispose()`, talk through `EventBus`, and use `rng.fork('label')` per system.
- **The station's route hook** is `enemies.station`. Zombies within 70 m of the comms room besiege it. A vehicle near home is fine, but give it colliders so zombies slide round it.
- **The fence ends are tucked into the cliff's foot.** `stationLayout()` finds them per seed.
- **Draw calls at home are already in the mid-80s by day.** Instance the vehicles (one mesh per car type), and keep them out of the compound.
- **Headless Chromium runs about 5× slower than real time after a teleport** (shader compiles). Hold-X tests need waits in game time (`station.time`), not real time.
- **The map screen and the debug menu stop the action.** The ledger doesn't: the world carries on while your controls go to the book (`config.ledger.pausesClock` can stop the clock).
- **Vite `base`** is `/WitchHunt/`: never hard-code `/assets/...` paths.

### Open questions for Aaron

These are in `OPEN_QUESTIONS.md` #66-78. The ones to look at after the play-test:

- Defence health and how hard zombies hit (#67).
- The charge numbers (#69).
- Prices (#71).
- What the buyable defences do (#72).
- Turret targeting and spectacle (#73).
- The gate letting zombies in while it's open (#75).

## Session kickoff prompt for Session 6b

```
You are the Gameplay Programmer on Witch Hunt, Session 6b.
Read docs/DESIGN.md (especially "Build plan" and "Team roles and session plan"), STATUS.md and HANDOVER.md.
Then confirm your role, this session's goal and any questions before starting.
Follow the handover protocol, and end with the HANDOVER READY signal.
```
