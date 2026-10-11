# Handover

## Just finished: Session 6b, Gameplay Programmer, M5 part 2 (vehicles and batteries)

**Status: done. Aaron play-tested the vehicles on the tablet over three rounds (all his look fixes are in) and confirmed the rest: the campsite battery fitted at the fence box, looting and alarms are "a lot of fun", the map markers look good, fights among cars work, the turret rests facing the gate and covers the east end. M5 is complete.**

### Aaron's M5 part 1 verdict (first thing this session)

- **"Night at the station is great gameplay."** No fps drop, the tablet didn't get warm. He's been using the siege-wave debug (10 zombies at once): "if zombies trickled in one at a time it would be boring". That's for M6/M7 (see below).
- Prices and defences "pretty balanced so far"; he'll calibrate in a proper playthrough.
- The turret is great. The ledger is good. Nothing stuck.
- **Fixed:** the idle turret pointed at the cabin. It now rests facing the gate, and swings back there 2 s after its last target.
- **Fixed:** he asked whether the turret could reach every panel. **It couldn't.** Everything was in range, but the cabin hid the east fence 3 (the panel that starts torn down) and part of the east fence 2, on every seed. The pad moved to 3 m east and 17 m south of the fence's centre, and the range went 42 → 45 m. A test now checks every panel.

### Aaron's calls for the vehicles (rule 10)

- **Four types:** car, pickup truck, police car, army truck. Special one-off vehicles may come with later scenes.
- **About 45 a map**, about **60% with a battery**.
- Pulling a battery is **just a noise**, and **pulling the battery kills the alarm**.
- Vehicles on the maps **if it looks good without crowding them**.
- The hold times as proposed. The debug battery stays.

### What was built

Details are in `STATUS.md` ("M5 part 2"):

- **Vehicles** (`src/data/vehicles.json`, `src/world/vehiclePlacement.js`, `src/world/Vehicles.js`, `src/render/VehicleRenderer.js`):
  - Placeholder boxes in faded paint, tilted to the slope, sometimes on a flat tyre.
  - Seeded placement:
    - verge cars along the pathways, some nosed into the trees;
    - roadblock rows at roadside clearings and checkpoints;
    - army trucks at the outpost, cars at the gas station;
    - one sure car with a battery and no alarm at the campsite next to home.
  - 35-59 a map, about 46 on average.
- **Three hold-X spots, each usable once per run:**
  - The driver's door and the boot: search for loot, from a table per type.
  - The bonnet: lift it, then pull the battery. Pulling makes a 22 m noise.
- **Alarms:** a quarter of the vehicles with a battery have one.
  - Opening the door or the boot sets it off: it wails, flashes the lamps and calls zombies from 65 m.
  - It stops when the battery is pulled. After 60 s it runs the battery flat.
- **Solid:** zombies and the player slide round vehicles, and shots stop on them.
- **On the minimap and map screen** once you've been within 40 m: a small steel-blue oblong, grey once there's nothing left in it.
- **"Try again"** restocks every vehicle.
- **Debug:** teleport to the nearest unsearched vehicle, show all on the map, restock. A new `vehicles` overlay line.
- **3 draw calls** for the whole fleet: one instanced cube mesh, one lamp mesh, one shadow pass. At home: 71 by day, against 68 without vehicles.
- **Tests:** 283 pass (13 new: 12 for vehicles, 1 for the turret's view of the fence).

### Aaron's look at the vehicles (follow-ups, all in)

- Taller cabs, doors below the windows, round wheels with hubs.
- A sloped windscreen and rear window (a wedge mesh), so they read as cars.
- Laid-back windscreens with painted pillars, door panels up to the bonnet line, a taller ute front. Aaron called the cars complete.
- Doors and boots open only a crack once searched, with a dark hollow behind. Each door's window swings with it.
- A passenger door: either front door searches the cab, once.
- Every police car has a battery and an alarm, and a shot into a car with an alarm sets it off.
- Debug: **Vehicles: teleport to the nearest alarm**.

### Unfinished

Nothing in scope. Vehicle state isn't saved (saving is M6/M12), but each vehicle keeps its own flags ready for it.

## Play-test script for Aaron (M5 part 2) (done: kept for the record)

**Setup:**

- Open the live build on the tablet with the controller. The overlay has a new `vehicles` line.
- The debug menu is **View + D-pad down**. The vehicle items start with "Vehicles:".

1. **The first battery:**
   - From home, walk to the Abandoned campsite next door. A car or pickup is parked there.
   - Hold X at the driver's door ("search the car" or "search the cab"). The door swings open and the loot shows bottom right.
   - Hold X at the front: "lift the bonnet", then "pull the battery".
   - **Good:** creak, ratchet clicks, a clunk, "+1 battery (1 carried)", and the battery shows in the kits line.
   - Take it home and fit it at the fence box.
2. **The look:**
   - Walk a pathway or two. Use **Vehicles: teleport to the nearest unsearched** to hop between them.
   - Good:
     - They read as abandoned cars against the forest, by day and at night with the torch.
     - Not too bright under the torch.
     - Roadblocks in roadside clearings, army trucks at checkpoints and the outpost.
3. **An alarm:**
   - **Vehicles: teleport to the nearest alarm** takes you to one (the campsite's never has one, and only about a quarter of cars with a battery do). Open its door or boot, or shoot it.
   - Good:
     - A toast, a wail, and the lamps flash (best seen at night).
     - Zombies nearby come for it.
     - Lift the bonnet and pull the battery: "The alarm dies".
   - Try leaving one ringing for a minute: it runs the battery flat.
4. **The maps:**
   - After visiting a few, open the map screen (D-pad up).
   - Good: small blue oblongs where you've been near vehicles, and grey ones you've emptied. Readable, and not crowding the map.
5. **Fights round cars:**
   - At night (**Skip to night**, spawn some zombies), fight beside a roadblock.
   - Good: zombies slide round the cars and don't get stuck, and the cars stop your shots.
6. **The turret fixes:**
   - Install it (**Station: give the turret**). It should rest facing the gate, not the cabin.
   - Run a siege wave and watch the east end (by the cliff): it should shoot zombies clawing there.
7. **Report:**
   - fps in a roadblock clearing at night.
   - Hold times, loot amounts, how often you find batteries and alarms, how loud the alarm is.
   - Whether the map markers help.
   - Anything stuck, floating or sunk into the ground.

## Next: Session 7, Lead Engineer, M6 (simulation LOD and nights)

**Goal (DESIGN.md M6):** active, nearby and abstract tiers; simulated nights while you're away; the dusk forecast; the alarm; dawn autosave. **Done when** the full map stays alive at the frame target on the tablet, and leaving home at night resolves fairly. **M6 is a performance gate** (check on the tablet).

### Look at first

- **`STATUS.md` "What M6 needs next"**.
- **Aaron's note:** "if zombies trickled in one at a time it would be boring." He's played nights with the siege-wave debug (10 at once). Think about how the night's zombies reach the station in groups, with the tiers and the night resolver.
- **The station's numbers for the night resolver:**
  - `StationState`: `security`, `charge`, `nightDrainPerSecond()`, and each barrier's health.
  - `turretMath.js`: `turretSecurity()`, `ammoCoverage()`.
  - `config.station.security`.
- **To save:**
  - Per vehicle: `searched`, `bonnetUp`, `hasBattery`, `flat`, `alarmArmed`, `seen` (`src/world/Vehicles.js`). Placement rebuilds from the seed.
  - The station's barriers, charge, turret and buyables (`StationState`).
  - The inventory's `batteries` and `scrap`.

### Gotchas and decisions

- **Systems:** follow `init()` / `update(dt)` / `dispose()`, talk through `EventBus`, and use `rng.fork('label')` per system. Vehicles fork their placement and loot from `rng.fork('vehicles')`.
- **Prompt order:** `combat.promptSources` shows the first with a prompt (digging, then the station, then vehicles). Vehicles also skip their own prompts while digging or the station has one, so two holds never run at once.
- **Colliders** share one grid: trees, rocks, signs, the station's wall pieces, and vehicles. Pieces are kept small (fence ≤2.4 m, vehicle ≤1.2 m) because the grid widens every query by the largest radius.
- **`StationState.init()` replaces every barrier on "try again".** Look barriers up by id.
- **Headless Chromium runs about 5× slower than real time.** Wait in game time (`station.time`, `vehicles.time`), not real time. The map screen pauses game time.
- **Vite HMR reloads the page** when a source file changes mid-test. Don't edit while a browser check runs.
- **Vite `base`** is `/WitchHunt/`: never hard-code `/assets/...` paths.

### Declined by Aaron

- **No vehicles across pathways** (real roadblocks): "we're just tempting fate with having the AI encounter roadblocks." Keep vehicles on verges and inside clearings, clear of the pathway's middle.

### Open questions for Aaron

These are in `OPEN_QUESTIONS.md` #80-88 (vehicles) and #66-79 (the station). After the play-test, look at:

- Loot amounts (#81).
- The alarm, and whether running flat should kill the battery (#83, #84).
- The map markers (#86).

## Session kickoff prompt for Session 7

```
You are the Lead Engineer on Witch Hunt, Session 7.
Read docs/DESIGN.md (especially "Build plan" and "Team roles and session plan"), STATUS.md and HANDOVER.md.
Then confirm your role, this session's goal and any questions before starting.
Follow the handover protocol, and end with the HANDOVER READY signal.
```
