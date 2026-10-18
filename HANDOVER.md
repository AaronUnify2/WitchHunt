# Handover

## Just finished: Session 13, Graphics Engineer / Technical Artist: characters and the deferred art

**Status: done.** Everything is pushed to `main`, which Aaron play-tests from. 462 tests pass and the build is clean.

**How we worked (agreed with Aaron at the start):** a short written proposal in the chat, then a version pushed to `main` for him to react to in-game, one step at a time. He play-tested along the way and his notes were folded in as we went.

### What was done

26 steps. Details are in `STATUS.md` (Session 13). The open points are in `OPEN_QUESTIONS.md` (#161-170).

1. **A debug model viewer** (debug menu → **Models**): any model in any pose, under any light.
2. **The zombies** stay sprites (Aaron), with per-zombie variety from a palette swap, still one draw call:
   - blood per zombie;
   - skin tones nearer the region;
   - army camo and helmet loss;
   - Men in Black zombies;
   - Earl Pruitt;
   - trucker caps for the citizens.
3. **3D characters:**
   - the mutant;
   - the witch;
   - the family;
   - the grey alien and the cowboy drift;
   - the giant beetle;
   - the armed Men in Black (pistol, SMG, sniper rifle, posed by IK).

   Cutscenes now use the real models.
4. **The vehicles:** four types (sedan, pickup, sheriff's car, M35), with per-vehicle wear.
5. **The station's interior:** lit, with static on the monitors and a woodstove.
6. **The witch's hut:** a taken settler's cabin; its wreck burns.

**Decided with Aaron (also in OPEN_QUESTIONS, Session 13):**
- The zombies stay sprites, because hordes must stay cheap.
- The family talk with the bob, no mouth.
- The grey alien is the cowboy Martians' species, with the cowboyness dialled back.
- The witch never shows a face and never bends at the hips.
- The mutant has a fist, not claws.
- The living Men in Black are the cutscenes' 3D model with minimal changes.
- Earl is a zombie at the shelter.
- Four vehicle types only, and the police car is the sheriff's.
- The station is lit.
- The hut is a taken cabin, its chair rocks when you're near, and the hand-prints are pale ash.
- Exploding cars come later (DESIGN.md "Ideas for later").

### Unfinished

Nothing in scope. Still to come, by design:
- **The AI** for the grey alien (M10), the beetles (M9.4) and the armed Men in Black (M11). Their renderers take an entity list; see each file's header for its states.
- **The army helmet coming off** (M9.4): set `z.helmetOff = true` and the sprite swaps to the bare-headed block.
- **Earl Pruitt at the storm shelter** (M9.3): `enemies.spawnZombie(x, z, { variant: 'earl' })`. His loot table is empty, so the combination is the encounter's to give.
- **Models for Bigfoot and the Mothman**, needed before M10. Build them with the same approach: the figure kit or their own model files, a renderer, and a model viewer entry.

### Play-test script for Aaron (Session 13)

On the tablet with the controller. The debug menu is View + D-pad down; the model viewer is the **Models** category.

1. **The model viewer.**
   - Step through every model: D-pad left/right changes model, up/down changes pose, Y changes variant, X changes light, and A plays, slows or pauses. Menu re-rolls the looks.
   - **Tell me:** anything that reads wrong under the torch or by day.
2. **The zombies.**
   - Let a night's horde come, or spawn some from the debug menu. Look for variety (no two alike), the army in camo, Men in Black zombies in the crowd mix (viewer only for now), and blood that differs per zombie.
   - In the viewer, check *Army (helmet lost)* and *Earl Pruitt*.
3. **The station at night.**
   - Walk in: warm light, the stove flickering, static on the monitors, the family in the comms room.
   - Charge the fence and see the light come up from 60%.
   - Let a siege break in and watch whether zombies snag on the furniture (#165).
4. **The cars.** Walk a road at night with the torch: each car worn differently (rust, mud, blood, a cracked or smashed window).
   - Search one, lift a bonnet, and set off a sheriff's car alarm (the light bar flashes).
   - **Tell me:** whether the wear is right (#166).
5. **The hut.** Teleport there (*Teleport: witch's hut*).
   - Walk up: the rocking chair starts by itself. Then blow it up (*Hut & explosives*): the burning ruin and its firelight.
   - **Tell me:** whether the hand-prints and flames are toned down too far (#170).
6. **The armed Men in Black** (viewer, *Man in Black, armed*): each weapon (Y) through every pose. Recoil strength (#167).
7. **The torch up close** (#161): pale models blow out at point-blank range. Is that worth a game-wide fix in a style pass?

## Next: Session 14, Lead Engineer: the cluster on the map (M9.1)

**Goal (DESIGN.md "Build plan", M9 part 9.1, and "Team roles and session plan", Session 14):**
- **The fixed opening sub-graph,** placed first and identical every run: the station, campsite, storm shelter, gas station and military outpost (DESIGN.md "Fixed opening cluster").
- **The road** through the cluster.
- **The cordon:** it blocks Tom only, with torn gaps for the dead.
- **The gates** on each path, opening in order.
- **Story progress flags,** saved.
- **The witch's cluster rule:** she plants only inside the cluster until the crossing.
- **The flare gun** and its lure.
- **The storm shelter's fixed camera** (#153).
- **Done when:** the same cluster on every seed, and the gates open in order.

Workshop first (rule 10) where it's content: the road's look, the cordon, the gates.

### Look at first

- **Map generation:** `world/MapGenerator.js`, `world/mapGraph.js`, `world/mapGeometry.js`, `src/data/encounters.json`, `src/data/clearingTypes.json`.
- **Station placement:** `base/stationLayout.js`.
- **Vehicles on the new road:** `world/vehiclePlacement.js`, the placement table in `src/data/vehicles.json`.
- **The witch's planting:** `ai/Witch.js` and how she picks sigil grounds.
- **Saving the new flags:** `core/saveData.js`, `core/Game.js` `autosave()`.

### Gotchas and decisions from Session 13

- **Vehicle sizes changed with the models:**
  - sedan 4.48 × 1.78, 1.45 tall;
  - pickup 5.4 × 1.98, 1.86 tall;
  - police 4.72 × 1.82, 1.6 tall;
  - army truck 6.5 × 2.3, 2.72 tall.

  Placement reads `type.size`, so roadblock rows and gaps follow automatically. A type with a `model` in `vehicles.json` draws from `render/vehicleModels.js`; its lids still hinge on the data's boxes.
- **The station's furniture is solid** (`layout.cabin.furniture`). It's kept clear of the zombies' way in from the front door to the comms door. Moving the doors or the cabin means checking that route.
- **Zombie variants `mib` and `earl`** are in `config.zombies.variants` but in no clearing type's spawn mix, so they only appear when spawned by name. Keep `earl` out of random mixes.
- **Lights:** never add or remove them while playing, because a recompile stutters on the tablet. The station adds two point lights and the hut one firelight; all are made once at load, and their intensity changes instead.
- **The model viewer** is the quickest way to check any new model or prop: add an entry in `debug/viewerModels.js`, and `tests/modelViewer.test.js` builds every entry and plays every pose.
- **Headless renders:** drive `game.update(1/30)` with the render loop cancelled (`window.game` in dev). The software GPU runs at about 10 fps, so judge frame rates only on Aaron's tablet.
- **Vite `base` is `/WitchHunt/`. The live build deploys from `main`;** push each step there so Aaron can play-test it.

### Open questions for Aaron

- **#161-170 (Session 13):**
  - the torch on pale models;
  - the witch's eyes in feeds;
  - her planting pose;
  - the station's brightness;
  - the furniture and sieges;
  - the cars' wear;
  - the Men in Black's recoil and armour;
  - the zombie Men in Black's toughness;
  - Earl's spawn;
  - the toned-down looks.
- **From before:**
  - #155-160 (the looks, the family face to face, clips holding the world still, sightings, idle lines, the camera's lamp);
  - #143 (which encounters give the SMG, the heat-scope rifle and the auto shotgun);
  - #136 (an item that tags the witch);
  - #137 (fog nights and gameplay);
  - #140-141 (the settings screen, Session 28).

## Session kickoff prompt for the next session

```
You are the Lead Engineer on Witch Hunt, Session 14: the cluster on the map (M9.1): the fixed opening sub-graph placed first, the road, the cordon, the gates, story progress flags, the witch's cluster rule, the flare gun. Session 13 (Graphics Engineer / Technical Artist) built the characters and the deferred art (zombie variety, the 3D characters, the vehicles, the station's interior, the hut) and a debug model viewer.
Read docs/DESIGN.md (especially "Map", "Fixed opening cluster", "Build plan" and "Team roles and session plan"), STATUS.md, OPEN_QUESTIONS.md and HANDOVER.md.
Then confirm your role, this session's goal and any questions before starting. Workshop content with Aaron first (rule 10), and push each step to main so he can play-test it.
Follow the handover protocol, and end with the HANDOVER READY signal.
```
