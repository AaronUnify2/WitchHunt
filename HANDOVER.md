# Handover

## Just finished: Session 4, Lead Engineer, M3 (The map)

**Status: built and pushed; the performance gate (walking end to end on the tablet) is waiting on Aaron's play-test.** Session 5 starts once it passes.

Aaron's calls before building (rule 10 doesn't strictly apply to core systems, but these shape the game):

- **Map size: 1 km wide by 1.4 km north to south.** "We'll see how it goes"; revisit after play-testing.
- **Off the pathways: slowed, never blocked.** Undergrowth makes cutting through "something the player can choose to do, but it comes at a cost", especially when escaping zombies. No impassable walls.
- **Gentle rolling ground:** yes ("I would be thrilled").
- **Minimap and map screen:** simple but usable now; the final look is Session 19.
- **Runs start at home on the cliff edge, by day.** Debug: skip to night, teleport to any clearing.
- **Builds go to Aaron's tablet by pushing to `main`.**

DESIGN.md "Map" is updated to match.

### What was built

Details in `STATUS.md` ("M3: The map"):

- **Generation:** a seeded map of 22 clearings in north, middle and south bands.
  - Home is against the cliff, with the campsite next to it. The hut is deep in the south, 5-11 pathways from home.
  - The encounters and sigil grounds come from data files.
  - Pathways are a spanning tree plus shortcut loops. They never cross, and north clearings are always a sensible walk from home.
- **Ground:** rolling hills, levelled clearings, dirt pathways, rocks.
- **The cliff:** a tall rock wall the width of the map, with trees on the plateau above it.
- **Forest:** about 88,000 trees and 120,000 bushes across the map, in 48 m chunks.
- **Undergrowth:** slows the player to 0.55× and zombies to 0.75× off the pathways.
- **Distance culling:** for every map piece.
- **Fog of war, minimap and map screen:** the minimap turns with you; D-pad up opens the map screen.
- **Signposts:** one in every clearing, standing in for its encounter or sigil ground.
- **Terrain-aware combat:** zombies, hit boxes, shots, blood and the torch's glare all follow the hills.
- **Debug:** teleports, reveal map, whole-graph map view, new map / same map, skip to night. New overlay lines.
- **Tests:** 168 pass (50 new).

### Unfinished

- **The performance gate:** walking end to end on the tablet at the frame target (Aaron's play-test below).
- Encounter placement hints (road edge, hillside, off-path) aren't honoured yet (OPEN_QUESTIONS #42).

## Play-test script for Aaron (M3)

**Setup:** open the live build on the tablet with the controller. The overlay is on (the `map` and `world` lines are new). You start at home by day, facing south. Hold **View + D-pad down** for the debug menu.

1. **Look round home:**
   - Turn round (north): the cliff wall, with trees on top.
   - Read the "RANGER STATION" signpost.
   - Good: the cliff reads as rock, not a flat wall.
2. **Minimap:**
   - Turn on the spot.
   - Good: the minimap turns with you, the N on its rim always points north, and the patch round you is revealed.
3. **The walk (the gate):**
   - Press **D-pad up** for the map, then close it with **D-pad up** or **B**.
   - Follow pathways south toward the hut. Choose pathways at junctions, and read the signposts as you pass clearings.
   - Keep an eye on fps the whole way (it's top left).
   - **Report:** fps on the pathways, at clearings, and at the worst moment. Also how long it took and whether you got lost.
4. **Cut through the forest:**
   - Leave a pathway and push through the trees.
   - Good: you're clearly slowed (the overlay's `player` line shows "undergrowth"), and it's tempting to get back on the path.
   - Is the slowdown too much, too little, or right?
5. **The hills:**
   - Good: gentle rises and dips, nothing steep or jittery, and your feet stay on the ground.
6. **At night:**
   - Debug menu: **Skip to night**.
   - Walk a pathway with the torch, then **Spawn 5 zombies** and fight on a slope.
   - Good: the zombies stand on the ground and your shots hit them uphill and downhill. Red dots appear on the minimap.
7. **The map screen:**
   - Debug menu: **Reveal whole map**, then open the map.
   - Then switch to **Map screen: whole graph** to see every pathway.
   - Good: names are readable, and the layout looks like a believable network of trails.
8. **Same seed, same map:**
   - Note the seed (overlay), then **Restart this map**.
   - Good: the same map. **New map** gives a different one.
9. **Size and feel:**
   - Is 1 km × 1.4 km too big, too small or about right?
   - Are the distances between clearings interesting or boring?
10. **Report:** fps over the whole walk (and whether the tablet got warm), anything that looked wrong, and how the map feels.

## Next: Session 5, AI Programmer, M4 (Sigils and zombies)

(After the M3 gate passes.)

**Goal:** sigils, night spawning, five-sigil cap, levels 1-5, variants, speed variance, hordes, mutants, loot, digging, sigil grounds, the detection model and targeting. **Done when** raising the level by debug visibly changes the night.

### Look at first

- `src/world/World.js`: `world.map` and `world.ground`.
  - `map.clearings` carry `kind` ('home', 'hut', 'encounter', 'sigilGround', 'wild'), `key`, `band`, `southness`, `clearingType`, `hopsFromHome`.
  - `map.edges` and `map.paths` are the pathway graph.
- `src/world/mapGraph.js`: `adjacency`, `hopCounts`, `graphDistance`, for "random walk along the pathway graph".
- `src/world/GroundField.js`:
  - `heightAt`, `undergrowthAt`, `openAt`, `clamp`.
  - `rayDistance`, for line of sight over hills in the detection model.
- `src/data/clearingTypes.json`: each type's zombie variant mix (`variants`).
- `src/data/sigilGrounds.json`: the five sigil grounds; add more here.
- `src/ai/EnemyManager.js`:
  - It already sets each zombie's `y` (ground height) and `moveScale` (undergrowth) every frame.
  - `spawnAround()` is the spawn entry point.

### Gotchas and decisions

- **Systems:** follow `init()` / `update(dt)` / `dispose()`, talk through `EventBus`, and use `rng.fork('label')` per system. The map uses `rng.fork('world')`; anything that must match a seed should fork from the game's rng, never `Math.random()`.
- **Draw calls:** 45-67 at night with the torch shadow, anywhere on the map (budget ~100).
  - Forest chunks are one draw each (trees and bushes together).
  - The ground is 128 m chunks; rocks are one instanced mesh per ground chunk.
  - Signposts are one board each, drawn only when near.
- **Anything with a height** (sigils, pickups, props) must stand at `ground.heightAt(x, z)`.
- **Anything a shot or the torch should hit** goes in the collider grid with `r` (blocks movement and shots), optional `vr` (torch glare), `base` and `top` (absolute heights).
- **Rays over the terrain:** `hitscan.rayBlockers` and `collision.nearestHit` take a `ground` argument. Pure tests use flat ground by default.
- **Culling:** use `ChunkCuller` for anything placed across the map, so only nearby pieces draw.
- **The map screen and the debug menu** both stop the action while open (the clock runs on).
- **The fog of war** has `reveal(x, z, radius)` for the lookout tower (M5) and `toBytes()` / `fromBytes()` for saves (M6).
- **Start time:** runs start by day at home (`config.clock.startPhase`), so use **Skip to night** to test spawning.
- **Vite `base`** is `/WitchHunt/`: never hard-code `/assets/...` paths.

### Open questions for Aaron

These are in `OPEN_QUESTIONS.md` #35-50. The main ones:

- Is the undergrowth slowdown right (you 0.55×, zombies 0.75×)?
- What's at the east, west and south edges? (An invisible line in dense forest for now.)
- Should the map screen pause the game, or stay live?
- Plain clearings (about 3 a run) hold nothing: should they?

## Session kickoff prompt for Session 5

```
You are the AI Programmer on Witch Hunt, Session 5.
Read docs/DESIGN.md (especially "Build plan" and "Team roles and session plan"), STATUS.md and HANDOVER.md.
Then confirm your role, this session's goal and any questions before starting.
Follow the handover protocol, and end with the HANDOVER READY signal.
```
