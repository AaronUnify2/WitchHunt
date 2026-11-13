// Game: owns every system, runs the main loop and handles phases.
//
// App states: 'boot' (tap-to-start screen), 'running', 'suspended'
// (left fullscreen; waiting for a tap to resume). The day/night phase
// comes from the Clock; Game turns each change into 'phase:<name>'.

import * as THREE from 'three';
import { config as defaultConfig } from '../config.js';
import { EventBus } from './EventBus.js';
import { Rng } from './Rng.js';
import { Clock } from './Clock.js';
import { Input } from './Input.js';
import { Display } from './Display.js';
import { shortPadName } from './GamepadInput.js';
import { Renderer } from '../render/Renderer.js';
import { DynamicResolution } from '../render/DynamicResolution.js';
import { Sky } from '../render/Sky.js';
import { Atmosphere } from '../render/Atmosphere.js';
import { installAtmosphereShader } from '../render/atmosphereShader.js';
import { World } from '../world/World.js';
import { SpatialGrid } from '../world/SpatialGrid.js';
import { Player } from '../player/Player.js';
import { Flashlight } from '../player/Flashlight.js';
import { Combat } from '../combat/Combat.js';
import { ZombieDirector } from '../ai/ZombieDirector.js';
import { Witch } from '../ai/Witch.js';
import { Hut } from '../world/Hut.js';
import { Explosives } from '../combat/Explosives.js';
import { FinalBattle } from '../encounters/FinalBattle.js';
import { RunEndScreen } from '../ui/RunEndScreen.js';
import { NoReturnNotice } from '../ui/NoReturnNotice.js';
import { InspectCard } from '../ui/InspectCard.js';
import { WeaponCross } from '../ui/WeaponCross.js';
import { lootGate } from '../combat/loot.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { PaperNote } from '../ui/PaperNote.js';
import { WatchQueue } from '../story/WatchQueue.js';
import { Objectives } from '../story/Objectives.js';
import { StormShelter } from '../encounters/StormShelter.js';
import { Outpost } from '../encounters/Outpost.js';
import { HomeStop } from '../story/HomeStop.js';
import { WitchEscape } from '../story/WitchEscape.js';
import { createStats, loadStats } from './runStats.js';
import { Station } from '../base/Station.js';
import { Vehicles } from '../world/Vehicles.js';
import { NightWatch } from '../base/NightWatch.js';
import { zoneOf } from '../base/stationLayout.js';
import { Subtitles } from '../ui/Subtitles.js';
import { Dialogue } from '../story/Dialogue.js';
import { FamilyTalk } from '../story/FamilyTalk.js';
import { TrailCams } from '../story/TrailCams.js';
import { Cutscenes } from '../story/Cutscenes.js';
import { Lore } from '../story/Lore.js';
import { daylightLevel } from '../ai/detection.js';
import { DebugOverlay } from '../debug/DebugOverlay.js';
import { DebugMenu, DEBUG } from '../debug/DebugMenu.js';
import { ModelViewer } from '../debug/ModelViewer.js';
import { StartScreen } from '../ui/StartScreen.js';
import { Toast } from '../ui/Toast.js';
import { MapUi, noMapIn } from '../ui/MapUi.js';
import { StoryProgress } from '../story/StoryProgress.js';
import { Gates } from '../world/Gates.js';
import { Campsite } from '../encounters/Campsite.js';
import { GasStation } from '../encounters/GasStation.js';
import { Quad } from '../world/Quad.js';
import { Ute } from '../world/Ute.js';
import { AlienQuad } from '../world/AlienQuad.js';
import { Dozer } from '../world/Dozer.js';
import { DozerCampSite } from '../world/DozerCampSite.js';
import { CordonDozer } from '../encounters/CordonDozer.js';
import { BugZapper } from '../encounters/BugZapper.js';
import { BigfootCave } from '../encounters/BigfootCave.js';
import { MegaNight } from '../encounters/MegaNight.js';
import { Mothership } from '../encounters/Mothership.js';
import { CrashedUfoSite } from '../world/CrashedUfoSite.js';
import { CarArmorySite } from '../world/CarArmorySite.js';
import { CarArmory } from '../encounters/CarArmory.js';
import { UteChase } from '../encounters/UteChase.js';
import { LandClearing } from '../world/LandClearing.js';
import { VehicleHud } from '../ui/VehicleHud.js';
import { FirstDay } from '../story/FirstDay.js';
import { RoadNorth } from '../world/RoadNorth.js';
import { Interiors } from '../world/Interiors.js';
import { InteriorHud } from '../ui/InteriorHud.js';
import { MetaStore } from '../meta/MetaStore.js';
import { DemoMode } from '../demo/DemoMode.js';
import { PlaceBeyond } from '../encounters/PlaceBeyond.js';
import { Flyer } from '../ai/Flyer.js';
import { Moths } from '../ai/Moths.js';
import { DeepForest } from '../ai/DeepForest.js';
import { CrashedPlane } from '../encounters/CrashedPlane.js';
import { JunieTaken } from '../encounters/JunieTaken.js';
import { OldChurchSite } from '../world/OldChurchSite.js';
import { OldChurch } from '../encounters/OldChurch.js';
import { StairsSite } from '../world/StairsSite.js';
import { Stairs } from '../encounters/Stairs.js';
import { MiloBarnSite } from '../world/MiloBarnSite.js';
import { MiloBarn } from '../encounters/MiloBarn.js';
import { RailwayCuttingSite } from '../world/RailwayCuttingSite.js';
import { Dynamite } from '../combat/Dynamite.js';
import { Chainsaw } from '../combat/Chainsaw.js';
import { RailwayCutting } from '../encounters/RailwayCutting.js';
import { SawmillSite } from '../world/SawmillSite.js';
import { Sawmill } from '../encounters/Sawmill.js';
import { HollerSite } from '../world/HollerSite.js';
import { Holler } from '../encounters/Holler.js';
import { MineshaftSite } from '../world/MineshaftSite.js';
import { Mineshaft } from '../encounters/Mineshaft.js';
import { MineRide } from '../encounters/MineRide.js';
import { MineFight } from '../encounters/MineFight.js';
import { Beetles } from '../ai/Beetles.js';
import { Comms } from '../story/Comms.js';
import { Caller } from '../story/Caller.js';
import { RadioStatus } from '../ui/RadioStatus.js';
import { startFromOutpostCleared, startFromLater, STORY_POINTS } from '../debug/storyStart.js';
import { CrashSite } from '../world/CrashSite.js';
import { SaveStore } from './SaveStore.js';
import {
  SAVE_VERSION,
  validSave,
  packBits,
  unpackBits,
  saveClock,
  loadClock,
  savePlayer,
  loadPlayer,
  saveStation,
  loadStation,
  saveVehicles,
  loadVehicles,
  saveSigils,
  saveRevisits,
  loadRevisits,
} from './saveData.js';

const MS_PER_SECOND = 1000;

export class Game {
  constructor(cfg = defaultConfig) {
    this.cfg = cfg;
    this.state = 'boot';
  }

  init(root) {
    const cfg = this.cfg;
    // Session 10: the ground mist in every fogged material. First, before
    // any material is made (it hooks their onBeforeCompile).
    installAtmosphereShader();
    this.bus = new EventBus();
    this.bus.init();
    // M6: a saved run is offered if the URL asks for no other map.
    this.saves = new SaveStore(cfg.save);
    // M9.2: what this device remembers (the opening seen), and a choice
    // made on the menu before the reload a new map needs.
    this.meta = new MetaStore(cfg.meta);
    this.pendingChoice = this.meta.takePendingChoice();
    const saved = this.saves.load();
    const urlSeed = seedFromUrl(cfg.rng);
    this.pendingSave = validSave(saved) && (urlSeed === null || String(urlSeed) === String(saved.seed)) ? saved : null;
    this.seed = this.pendingSave ? this.pendingSave.seed : resolveSeed(cfg.rng);
    this.rng = new Rng(this.seed);
    this.clock = new Clock(cfg.clock, this.bus);
    this.clock.init();
    this.display = new Display(cfg.display, this.bus);
    this.display.init();

    this.initWorld(root);
    this.initUi(root);
    // Session 21 (M10.2): interiors (the storm shelter's room first): loaded on the way in, the world simulating on outside.
    this.interiorHud = new InteriorHud(cfg.clock);
    this.interiorHud.init(root);
    this.interiors = new Interiors(cfg, this.bus);
    this.interiors.init({ scene: this.scene, player: this.player, combat: this.combat, sky: this.sky, atmosphere: this.atmosphere, flashlight: this.flashlight, sfx: this.combat.sfx, hud: this.interiorHud });
    this.initDialogue(root);
    this.initDirector();
    this.hut = new Hut(this.cfg, this.bus); // M7 step 4
    this.hut.init(this.scene, this.world, this.colliders);
    this.crashSite = new CrashSite(this.cfg); // Session 24: the crashed plane's set
    this.crashSite.init(this.scene, this.world, this.colliders);
    this.churchSite = new OldChurchSite(this.cfg); // Session 26: the old church's set
    this.churchSite.init(this.scene, this.world, this.colliders);
    this.stairsSite = new StairsSite(this.cfg); // Session 26: the stairs in the woods
    this.stairsSite.init(this.scene, this.world, this.colliders);
    this.dozerCampSite = new DozerCampSite(this.cfg); // build queue item 1: the clearing crew's camp on the cordon strip
    this.dozerCampSite.init(this.scene, this.world, this.colliders);
    this.ufoSite = new CrashedUfoSite(this.cfg); // build queue item 5: the crashed UFO and its beam
    this.ufoSite.init(this.scene, this.world, this.colliders);
    this.armorySite = new CarArmorySite(this.cfg); // build queue item 6: the Car Armory's compound
    this.armorySite.init(this.scene, this.world, this.colliders);
    this.barnSite = new MiloBarnSite(this.cfg); // Milo's barn (an optional encounter)
    this.barnSite.init(this.scene, this.world, this.colliders);
    this.cuttingSite = new RailwayCuttingSite(this.cfg); // Session 27: the railway cutting (an optional encounter)
    this.cuttingSite.init(this.scene, this.world, this.colliders);
    this.sawmillSite = new SawmillSite(this.cfg); // Session 28: the sawmill (an optional encounter)
    this.sawmillSite.init(this.scene, this.world, this.colliders);
    this.hollerSite = new HollerSite(this.cfg); // Session 29: the moonshiners' holler (an optional encounter)
    this.hollerSite.init(this.scene, this.world, this.colliders);
    this.mineSite = new MineshaftSite(this.cfg); // Session 30: the abandoned mineshaft (an optional encounter)
    this.mineSite.init(this.scene, this.world, this.colliders);
    this.initWitch();
    this.initStation(root);
    this.initVehicles();
    this.initNightWatch(root);
    this.initExplosives();
    this.initFinalBattle(root);
    this.initStory(root);
    this.initProgress();
    // Session 16 (Aaron): papers read in close-up (Earl's note, his diary).
    this.paper = new PaperNote(this.bus);
    this.paper.init(root, this.combat.sfx);
    this.lore.paper = this.paper; // Session 17 (Aaron): papers handed in are read again from the ledger
    // Session 20 (Aaron): special items get an inspect card (watch, read, or keep for later).
    this.card = new InspectCard(this.bus);
    this.card.init(root, this.combat.sfx);
    // Session 25 (Aaron): Tom carries every gun; D-pad down (nothing to watch) brings up the weapon cross.
    this.weaponCross = new WeaponCross(cfg.weapons);
    this.weaponCross.init(root, { weapons: this.combat.weapons, inventory: this.combat.inventory, notify: (text) => this.toast.show(text), sfx: this.combat.sfx });
    // Session 20 (Aaron): the pause menu: Resume, Save and quit, Settings (greyed).
    this.pauseMenu = new PauseMenu({
      resume: () => this.resumeFromPause(),
      saveAndQuit: () => this.saveAndQuit(),
      canSave: () => this.saveRefusal(),
    });
    this.pauseMenu.init(root);
    // Session 22 (Aaron): Demo mode, from the main menu (the station on its own; demo/DemoMode.js).
    this.demo = new DemoMode(cfg, this.bus);
    this.demo.init(root, this);
    // Session 16 (Aaron): tapes and feeds wait for D-pad down.
    this.watch = new WatchQueue(this.bus);
    this.watch.init(root);
    this.initFirstDay();
    this.initExperimental(root);
    // Session 21 (M10.2): the end of the road north (the barrier, the brush the dozer clears, the cave's mouth).
    this.roadNorth = new RoadNorth(cfg, this.bus);
    this.roadNorth.init({ world: this.world, colliders: this.colliders, player: this.player, progress: this.progress, notify: (text) => this.toast.show(text), sfx: this.combat.sfx, fx: this.combat.fx, clearing: this.clearing, dozer: this.dozer });
    this.combat.promptSources.push(this.roadNorth.hud);
    this.initSpikes();
    this.initSouth(root); // Session 26: Junie taken, the radio's reach
    // Session 16 (Aaron): what to do next, on the map and the minimap.
    this.objectives = new Objectives(cfg, this.bus);
    this.objectives.init(this);
    this.initViewer(root);
    // M7 step 6: the run's stats and its end (victory or defeat).
    this.stats = createStats();
    this.victoryTimer = -1;
    this.runEnd = new RunEndScreen(cfg.ending, this.bus, (id, opts) => this.cutscenes.play(id, opts));
    // Session 9 (#130): both charges on the hut warn there's no going back.
    this.noReturn = new NoReturnNotice(cfg.ending, this.bus);
    this.noReturn.init(root);
    this.runEnd.init(root);
    this.showMenu();
    this.addOverlayStats();
    this.addDebugMenuItems();
    this.applyQuality(this.startQuality());
    this.director.setDrawDistance(this.drawDistance);
    this.wireEvents();

    this.fastForward = 1; // debug (M6)
    this.loop = this.loop.bind(this);
    this.lastTime = null;
    this.rafId = requestAnimationFrame(this.loop);
  }

  initWorld(root) {
    const cfg = this.cfg;
    this.scene = new THREE.Scene();
    this.colliders = new SpatialGrid(cfg.world.colliderCellSize);
    this.world = new World(cfg, this.rng.fork('world'), this.seed);
    this.world.init(this.scene, this.colliders);
    const ground = this.world.ground;

    this.player = new Player(cfg.player, cfg.render, cfg.feedback, this.colliders, ground);
    const spawn = this.world.spawn;
    this.player.setSpawn(spawn.x, spawn.z, spawn.yaw);
    this.player.init();
    this.renderer = new Renderer(cfg.render, cfg.postFX, this.bus, cfg.clock.hoursPerDay);
    this.renderer.init(root, this.scene, this.player.camera);
    this.input = new Input(cfg.input, this.bus);
    this.input.init(this.renderer.canvas);
    this.dynamicResolution = new DynamicResolution(cfg.render.dynamicResolution);

    this.sky = new Sky(cfg.sky, cfg.fog, cfg.clock, this.rng.fork('sky'));
    this.sky.init(this.scene);
    // Session 10: ground mist and fog nights.
    this.atmosphere = new Atmosphere(cfg.fog, cfg.quality.presets, this.seed, this.rng.fork('atmosphere'));
    this.atmosphere.init(this.scene, ground, this.world.map);
    this.flashlight = new Flashlight(cfg.flashlight, this.rng.fork('flashlight'), this.bus);
    this.flashlight.init(this.scene, this.colliders, ground);
    this.combat = new Combat(cfg, this.rng.fork('combat'), this.bus);
    this.combat.init(root, this.scene, this.player, this.colliders, { sky: this.sky, flashlight: this.flashlight }, this.world);
  }

  // Sigils and the night's zombies (M4). After the UI, so it can toast.
  initDirector() {
    this.director = new ZombieDirector(this.cfg, this.rng.fork('director'), this.bus);
    this.director.init(this.scene, this.world, this.combat, this.player, (text) => this.toast.show(text));
    this.combat.promptSources.push(this.director.hud);
  }

  // The witch (M7): rests in her hut by day, roams and plants by night.
  initWitch() {
    this.witch = new Witch(this.cfg, this.rng.fork('witch'), this.bus);
    this.witch.init(this.scene, {
      world: this.world,
      director: this.director,
      player: this.player,
      colliders: this.colliders,
      combat: this.combat,
      clock: this.clock,
      hutBuilding: this.hut,
    });
  }

  // Explosives (M7 step 4): planting charges (at the hut and anywhere),
  // the detonator. Their prompt comes after every other.
  initExplosives() {
    this.explosives = new Explosives(this.cfg, this.bus);
    this.explosives.init(this.scene, {
      combat: this.combat,
      player: this.player,
      hut: this.hut,
      witch: this.witch,
      ground: this.world.ground,
      notify: (text) => this.toast.show(text),
      busy: [this.director.hud, this.station.hud, this.vehicles.hud],
    });
    this.combat.promptSources.push(this.explosives.hud);
    // Session 27: dynamite (combat/Dynamite.js): lit with RT, cooked, thrown; its blast is the explosives'.
    this.dynamite = new Dynamite(this.cfg, this.bus);
    this.dynamite.init(this.scene, { combat: this.combat, player: this.player, explosives: this.explosives, ground: this.world.ground, colliders: this.colliders, notify: (text) => this.toast?.show(text) });
    this.combat.promptSources.unshift(this.dynamite.hud); // the fuse first: nothing else matters while it's lit
    this.bus.on('player:respawned', () => this.dynamite.reset());
    // Session 28: the chainsaw (combat/Chainsaw.js): hold RT; loud, slow, hot, and it dulls.
    this.chainsaw = new Chainsaw(this.cfg, this.bus);
    this.chainsaw.init({ combat: this.combat, player: this.player, enemies: this.combat.enemies, fx: this.combat.fx, notify: (text) => this.toast?.show(text) });
    this.combat.chainsaw = this.chainsaw;
    this.combat.promptSources.unshift(this.chainsaw.hud);
    this.vehicles.explosives = this.explosives; // Session 14: cars go up with the same blast
  }

  // The final battle (M7 step 5): the hut's destruction starts it.
  initFinalBattle(root) {
    this.finalBattle = new FinalBattle(this.cfg, this.bus);
    this.finalBattle.init(this.scene, {
      root,
      witch: this.witch,
      hut: this.hut,
      player: this.player,
      clock: this.clock,
      sky: this.sky,
      world: this.world,
      combat: this.combat,
      skipToNight: () => this.skipToPhase('night'),
      playCutscene: (id, opts) => this.cutscenes.play(id, opts), // M8: its intro
    });
  }

  // The ranger station (M5): fence, doors, turret, ledger, siege.
  initStation(root) {
    this.station = new Station(this.cfg, this.rng.fork('station'), this.bus);
    this.station.init(this.scene, {
      root,
      world: this.world,
      combat: this.combat,
      player: this.player,
      colliders: this.colliders,
      mapUi: this.mapUi,
      notify: (text) => this.toast.show(text),
    });
    // Session 20 (Aaron): kits that don't fit in the healing pool go to the comms room's first aid box.
    this.combat.stashKits = (kind, n) => this.station.state.stashKits(kind, n);
    this.combat.promptSources.push(this.station.hud);
    // Mist may drift inside the fence, but not into the cabin (Aaron).
    const L = this.station.layout;
    const cabin = this.cfg.station.layout.cabin;
    const m = this.cfg.fog.puffs.avoidMargin;
    const cz = L.centre.z + cabin.offsetZ;
    this.atmosphere.mist.avoid = [{ x0: L.centre.x - cabin.width / 2 - m, x1: L.centre.x + cabin.width / 2 + m, z0: cz - cabin.depth / 2 - m, z1: cz + cabin.depth / 2 + m }];
    // While the ledger is open the player's controls go to it; the world carries on.
    const input = () => this.input;
    const still = { x: 0, y: 0 };
    this.lockedInput = {
      isDown: () => false,
      wasPressed: () => false,
      wasReleased: () => false,
      getMove: () => still,
      getLook: () => still,
      get activeDevice() {
        return input().activeDevice;
      },
    };
  }

  // Abandoned vehicles (M5 part 2): searched for loot, batteries pulled.
  // Their prompts come after digging and the station's.
  initVehicles() {
    const L = this.station.layout;
    this.vehicles = new Vehicles(this.cfg, this.rng.fork('vehicles'), this.bus);
    this.vehicles.init(this.scene, {
      world: this.world,
      combat: this.combat,
      player: this.player,
      colliders: this.colliders,
      mapUi: this.mapUi,
      notify: (text) => this.toast.show(text),
      avoid: [{ x: L.centre.x, z: L.centre.z, r: L.radius + this.cfg.vehicles.placement.avoidRadius }],
      fixed: { campsite: [Campsite.carSpot(this.world.map)].filter(Boolean), gasStation: GasStation.carSpots(this.world.map), trail: Campsite.trailWreckSpots(this.world.map), outpost: Outpost.truckSpots(this.world.map) }, // M9.2: the campers' car, by the path in; Session 15b: the forecourt's; Session 16: the bloody wreck on the trail out; Session 17: the outpost's trucks
      busy: [this.director.hud, this.station.hud],
    });
    this.combat.promptSources.push(this.vehicles.hud);
  }

  // Nights at the station (M6): the dusk forecast, attacks resolved
  // while you're away, the alarm.
  initNightWatch(root) {
    this.nightWatch = new NightWatch(this.cfg, this.rng.fork('nights'), this.bus);
    this.nightWatch.init(root, {
      station: this.station,
      director: this.director,
      witch: this.witch,
      combat: this.combat,
      player: this.player,
      clock: this.clock,
      dialogue: this.dialogue,
      interiors: this.interiors, // Plan #6: the forecast waits while Tom's underground
      notify: (text) => this.toast.show(text),
      dismissHint: () => (this.input.activeDevice === 'gamepad' ? 'Press A to dismiss' : 'Press Enter to dismiss'), // Session 25
    });
  }

  // M8: subtitles and the dialogue system (lines, the radio). Early, so
  // every system can ask for a line.
  initDialogue(root) {
    this.subtitles = new Subtitles(this.cfg.subtitles, this.cfg.story, this.combat.sfx);
    this.subtitles.init(root);
    this.dialogue = new Dialogue(this.cfg, this.bus);
    this.dialogue.init({
      subtitles: this.subtitles,
      clock: this.clock,
      // In the cabin, the family hear Tom (and he hears them) without the radio.
      withFamily: () => zoneOf(this.station.layout, this.player.position.x, this.player.position.z) >= 2,
      stateFlags: () => this.storyFlags(),
      notify: (text) => this.toast.show(text),
    });
  }

  // M8: talking to the family face to face, the trail cameras, cutscenes.
  initStory(root) {
    this.familyTalk = new FamilyTalk(this.cfg, this.bus);
    this.familyTalk.init(this.scene, {
      dialogue: this.dialogue,
      subtitles: this.subtitles,
      player: this.player,
      figures: this.station.renderer.family,
      inRoom: () => zoneOf(this.station.layout, this.player.position.x, this.player.position.z) === 3,
    });
    // Its prompt comes first, and the station's wait while it shows.
    this.combat.promptSources.unshift(this.familyTalk.hud);
    this.station.blockers.push(this.familyTalk.hud);
    this.trailCams = new TrailCams(this.cfg, this.rng.fork('trailcams'), this.bus);
    this.trailCams.init(this.scene, {
      world: this.world,
      colliders: this.colliders,
      witch: this.witch,
      clock: this.clock,
      mapUi: this.mapUi,
      player: this.player,
      sfx: this.combat.sfx,
      notify: (text) => this.toast.show(text, this.cfg.ui.toastSeconds * 2),
      teleport: (x, z, yaw) => this.player.teleport(x, z, yaw),
    });
    this.cutscenes = new Cutscenes(this.cfg, this.bus);
    this.cutscenes.init({
      root,
      scene: this.scene,
      renderer: this.renderer,
      postFX: this.renderer.postFX,
      player: this.player,
      clock: this.clock,
      world: this.world,
      station: this.station,
      witch: this.witch,
      hut: this.hut,
      trailCams: this.trailCams,
      dialogue: this.dialogue,
      subtitles: this.subtitles,
      sfx: this.combat.sfx,
      drawDistance: () => this.drawDistance,
      rng: this.rng, // Session 13: the witch's model is built as the game's
      zombieRenderer: this.combat.zombieRenderer, // its atlas, shared
    });
    // Lore hand-ins and the monitors: the ledger's Monitors page.
    this.lore = new Lore(this.cfg, this.bus);
    this.lore.init({ dialogue: this.dialogue, cutscenes: this.cutscenes, ledger: this.station.ledger, notify: (text) => this.toast.show(text) });
    this.station.pageSources.push(() => [this.lore.ledgerPage()]);
  }

  // M9.1: story progress flags, and the cluster's gates that open on them.
  initProgress() {
    this.progress = new StoryProgress(this.cfg, this.bus);
    this.progress.init({ world: this.world, player: this.player, enemies: this.combat.enemies });
    this.station.progress = this.progress; // Session 16: the comms room's first aid box (taken once, a flag)
    this.world.flagSet = (flag) => this.progress.has(flag); // Session 21: secret places' names (the cave)
    // Session 20 (Aaron): items held back until a story flag (flares: the Mothman at the crashed plane).
    lootGate.allows = (item) => {
      const after = this.combat.items[item]?.after;
      return !after || this.progress.has(after);
    };
    // The witch's cluster rule (Session 11): until Tom crosses the cordon
    // she plants only inside the opening cluster (still preferring its
    // sigil ground); then anywhere.
    const cordonZ = this.world.map.cluster.cordonZ;
    const margin = this.cfg.witch.clusterPlantMargin;
    this.director.plantArea = () => (this.progress.has('crossedCordon') ? null : (x, z) => z < cordonZ - margin);
    // Plan #10: her first real night out (night 2), she buries it at the family plot, under camera seven.
    this.director.forceGround = () => this.clock.day === this.cfg.witch.firstNight && !this.progress.has('crossedCordon');
    // Running from her (Aaron): a short leash in the early game.
    const pursuit = this.cfg.witch.pursuit;
    this.witch.pursuitLeash = () => (this.progress.has('crossedCordon') ? pursuit.leashLate : pursuit.leashEarly);
    this.gates = new Gates(this.cfg, this.bus);
    this.gates.init(this.scene, {
      world: this.world,
      colliders: this.colliders,
      player: this.player,
      progress: this.progress,
      notify: (text) => this.toast.show(text),
    });
  }

  // M9.2: the campsite and the first day (the opening, the tower, home,
  // Night 1's sigil, Dawn 1, Skip intro).
  initFirstDay() {
    this.campsite = new Campsite(this.cfg, this.bus);
    this.campsite.init(this.scene, {
      watch: this.watch,
      card: this.card, // Session 20
      world: this.world,
      combat: this.combat,
      player: this.player,
      colliders: this.colliders,
      vehicles: this.vehicles,
      lore: this.lore,
      dialogue: this.dialogue,
      cutscenes: this.cutscenes,
      progress: this.progress,
      clock: this.clock, // Plan #19
      notify: (text) => this.toast.show(text),
    });
    this.combat.promptSources.push(this.campsite.hud);
    // Session 15b (M9.3 pass 1): the gas station's set.
    this.gasStation = new GasStation(this.cfg, this.bus);
    this.gasStation.init(this.scene, {
      lore: this.lore, // Session 17: Earl's note goes to the ledger once read
      world: this.world,
      player: this.player,
      combat: this.combat,
      colliders: this.colliders,
      vehicles: this.vehicles,
      explosives: this.explosives, // Session 18 (Aaron): the pumps go up
      cutscenes: this.cutscenes,
      dialogue: this.dialogue,
      progress: this.progress,
      paper: this.paper,
      card: this.card, // Session 20
      notify: (text) => this.toast.show(text),
    });
    this.combat.promptSources.push(this.gasStation.hud);
    // Session 15b (M9.3 pass 3): Earl's quad bike, behind the gas station.
    this.quad = new Quad(this.cfg, this.bus);
    this.quad.init({ scene: this.scene, ground: this.world.ground, colliders: this.colliders, player: this.player, combat: this.combat, frame: this.gasStation.frame, notify: (text) => this.toast.show(text) });
    this.combat.promptSources.push(this.quad.hud);
    this.mapUi.setQuad(this.quad); // Session 16 (Aaron): on the maps, in case Tom loses it
    this.vehicles.busy?.push(this.quad.hud);
    this.explosives.busy?.push?.(this.quad.hud);
    this.station.blockers.push(this.quad.hud);
    // Session 16 (M9.3): the Pruitts' storm shelter.
    this.shelter = new StormShelter(this.cfg, this.bus);
    this.shelter.init(this.scene, {
      watch: this.watch, // Session 17: Earl's tapes wait for D-pad down
      world: this.world,
      player: this.player,
      combat: this.combat,
      director: this.director,
      cutscenes: this.cutscenes,
      dialogue: this.dialogue,
      progress: this.progress,
      lore: this.lore,
      paper: this.paper,
      card: this.card, // Session 20
      interiors: this.interiors, // Session 21: the room below is an interior
      clock: this.clock, // Plan #9: Day 2's dusk waits for Tom to go down the hatch
      notify: (text) => this.toast.show(text),
    });
    this.combat.promptSources.push(this.shelter.hud);
    this.vehicles.busy?.push(this.shelter.hud);
    this.station.blockers.push(this.shelter.hud);
    // Session 17 (M9.4): the overrun military outpost.
    this.outpost = new Outpost(this.cfg, this.bus);
    this.outpost.init(this.scene, {
      hint: (pad, key) => this.hints.show(this.input.activeDevice === 'gamepad' ? pad : key, this.cfg.ui.hintSeconds), // Session 17: the scope's hint
      world: this.world,
      player: this.player,
      combat: this.combat,
      colliders: this.colliders,
      vehicles: this.vehicles,
      explosives: this.explosives,
      clock: this.clock,
      cutscenes: this.cutscenes,
      dialogue: this.dialogue,
      progress: this.progress,
      lore: this.lore,
      paper: this.paper,
      card: this.card, // Session 20
      notify: (text) => this.toast.show(text),
    });
    this.combat.promptSources.push(this.outpost.hud);
    this.vehicles.busy?.push(this.outpost.hud);
    this.station.blockers.push(this.outpost.hud);
    // Session 17 (Aaron): you can't fight the witch yet: escape her (and the outpost waits while she's on you).
    this.witchEscape = new WitchEscape(this.cfg, this.bus);
    this.witchEscape.init({ witch: this.witch, player: this.player, progress: this.progress, dialogue: this.dialogue, alert: this.alert, quad: this.quad, outpost: this.outpost });
    this.outpost.witchBusy = () => this.witchEscape.engaged;
    this.outpost.witch = this.witch; // Plan #18: her pass through the cleared outpost at nightfall
    // Session 18 (Aaron): a stop at home on the ride back from the storm shelter.
    this.homeStop = new HomeStop(this.cfg, this.bus);
    this.homeStop.init({
      player: this.player,
      station: this.station,
      gasStation: this.gasStation,
      progress: this.progress,
      dialogue: this.dialogue,
      combat: this.combat,
      clock: this.clock, // Plan #9: the stop's dusk lines
      hint: (pad, key) => this.hints.show(this.input.activeDevice === 'gamepad' ? pad : key, this.cfg.homeStop.hintSeconds),
    });
    // Plan #10: the trail cams' first report from the family plot speaks and offers the feed (made before these).
    Object.assign(this.trailCams, { progress: this.progress, dialogue: this.dialogue, watch: this.watch, cutscenes: this.cutscenes });
    this.firstDay = new FirstDay(this.cfg, this.bus);
    this.firstDay.init({
      watch: this.watch,
      world: this.world,
      player: this.player,
      combat: this.combat,
      clock: this.clock,
      station: this.station,
      director: this.director,
      campsite: this.campsite,
      vehicles: this.vehicles,
      cutscenes: this.cutscenes,
      dialogue: this.dialogue,
      subtitles: this.subtitles,
      progress: this.progress,
      lore: this.lore,
      meta: this.meta,
      mapUi: this.mapUi,
      drawDistance: () => this.drawDistance,
      notify: (text) => this.toast.show(text),
      // Session 15b: a control prompt in the device's own buttons.
      hint: (pad, key) => this.hints.show(this.input.activeDevice === 'gamepad' ? pad : key, this.cfg.ui.hintSeconds),
      flashlight: this.flashlight,
      save: () => this.autosave(),
    });
  }

  // The experimental vehicles (debug menu only, not yet in the story): the
  // ute with a turret and the alien quad. Each rides like Earl's quad
  // (world/Quad.js) and has its own HUD while ridden (ui/VehicleHud.js).
  initExperimental(root) {
    this.vehicleHud = new VehicleHud();
    this.vehicleHud.init(root);
    const ctx = {
      scene: this.scene,
      ground: this.world.ground,
      colliders: this.colliders,
      player: this.player,
      combat: this.combat,
      witch: this.witch,
      renderer: this.renderer, // the ute's rear-view mirror
      clock: this.clock, // the ute radio's clock
      vhud: this.vehicleHud,
      notify: (text) => this.toast.show(text),
    };
    this.ute = new Ute(this.cfg, this.bus);
    this.ute.init(ctx);
    this.alienQuad = new AlienQuad(this.cfg, this.bus);
    this.alienQuad.init(ctx);
    // The dozer, and what it does to the woods (trees down, trails cut: saved).
    this.clearing = new LandClearing(this.cfg.dozer.clearing, this.cfg.forest, this.bus);
    this.clearing.init(this.scene, { world: this.world, mapUi: this.mapUi, colliders: this.colliders, sfx: this.combat.sfx, fx: this.combat.fx, player: this.player });
    this.dozer = new Dozer(this.cfg, this.bus);
    this.dozer.init({ ...ctx, clearing: this.clearing, vehicles: this.vehicles });
    this.chainsaw.clearing = this.clearing; // Round 2: the chainsaw fells trees
    this.experimental = [this.ute, this.alienQuad, this.dozer];
    // Build queue item 1: the family's plan and the army's dozer (encounters/CordonDozer.js).
    this.cordonDozer = new CordonDozer(this.cfg, this.bus);
    this.cordonDozer.init({ site: this.dozerCampSite, dozer: this.dozer, player: this.player, combat: this.combat, station: this.station, cutscenes: this.cutscenes, dialogue: this.dialogue, subtitles: this.subtitles, progress: this.progress, paper: this.paper, enemies: this.combat.enemies, demo: this.demo, sfx: this.combat.sfx, notify: (text) => this.toast.show(text) });
    this.combat.promptSources.push(this.cordonDozer.hud);
    this.vehicles.busy?.push(this.cordonDozer.hud);
    for (const v of this.experimental) {
      this.combat.promptSources.push(v.hud);
      this.vehicles.busy?.push(v.hud);
      this.explosives.busy?.push?.(v.hud);
      this.station.blockers.push(v.hud);
    }
  }

  // Session 22 (M10.3): the spikes, debug only (the Spikes category).
  initSpikes() {
    const notify = (text) => this.toast.show(text);
    this.placeBeyond = new PlaceBeyond(this.cfg, this.bus);
    this.placeBeyond.init({ world: this.world, player: this.player, interiors: this.interiors, sfx: this.combat.sfx, notify });
    this.flyer = new Flyer(this.cfg, this.bus);
    this.flyer.init({ scene: this.scene, player: this.player, combat: this.combat, sfx: this.combat.sfx, notify, rng: this.rng.fork('flyer') });
    // Build queue item 2: the bug-zapper night at the station (encounters/BugZapper.js).
    this.bugZapper = new BugZapper(this.cfg, this.bus);
    this.bugZapper.init({ player: this.player, combat: this.combat, station: this.station, dozer: this.dozer, flyer: this.flyer, clock: this.clock, cutscenes: this.cutscenes, dialogue: this.dialogue, subtitles: this.subtitles, progress: this.progress, demo: this.demo, sfx: this.combat.sfx, notify, skipToNight: () => { this.skipToPhase('night'); this.nightWatch.forecastDue = false; this.nightWatch.closeForecast?.(); } });
    this.combat.promptSources.push(this.bugZapper.hud);
    this.vehicles.busy?.push(this.bugZapper.hud);
    // Session 25 (Aaron): giant moths to shoot (debug only).
    this.moths = new Moths(this.cfg, this.bus);
    this.moths.init({ scene: this.scene, player: this.player, combat: this.combat, ground: this.world.ground, sfx: this.combat.sfx, notify, rng: this.rng.fork('moths') });
    // Round 2 (Aaron): the deep forest is dangerous on foot: a moth or two finds Tom there.
    this.deepForest = new DeepForest(this.cfg, this.bus);
    this.deepForest.init({ moths: this.moths, player: this.player, ground: this.world.ground, clock: this.clock, interiors: this.interiors, cutscenes: this.cutscenes, rng: this.rng.fork('deepForest') });
    // Session 25: the crashed plane's story beats (the grey, the quick draw, the Mothman).
    this.plane = new CrashedPlane(this.cfg, this.bus);
    this.plane.init({
      scene: this.scene,
      crashSite: this.crashSite,
      player: this.player,
      combat: this.combat,
      ground: this.world.ground,
      colliders: this.colliders,
      cutscenes: this.cutscenes,
      dialogue: this.dialogue,
      progress: this.progress,
      lore: this.lore,
      paper: this.paper,
      card: this.card,
      station: this.station,
      flyer: this.flyer,
      demo: this.demo,
      // He wakes at dawn: the clock runs on through the night he lost (no forecast over his waking).
      skipToDawn: () => {
        this.skipToPhase('dawn');
        this.nightWatch.forecastDue = false;
        this.nightWatch.closeForecast();
      },
      notify,
    });
    this.combat.promptSources.push(this.plane.hud);
    this.vehicles.busy?.push(this.plane.hud);
  }

  // Session 26: after the crashed plane. The radio's reach (story/Comms.js:
  // smashed, or the south past the comms line), and Junie taken.
  initSouth(root) {
    const notify = (text) => this.toast.show(text);
    this.comms = new Comms(this.cfg, this.bus);
    this.comms.init({ progress: this.progress, player: this.player, homeZ: this.station.layout.centre.z, demo: this.demo, deep: () => Boolean(this.mineRide?.below) || Boolean(this.bigfootCave?.inside) }); // Session 31: no radio down the mine
    this.dialogue.comms = this.comms;
    this.radioStatus = new RadioStatus(this.cfg.comms);
    this.radioStatus.init(root);
    this.junieTaken = new JunieTaken(this.cfg, this.bus);
    this.junieTaken.init({
      scene: this.scene,
      player: this.player,
      station: this.station,
      dialogue: this.dialogue,
      subtitles: this.subtitles,
      cutscenes: this.cutscenes,
      watch: this.watch,
      progress: this.progress,
      comms: this.comms,
      plane: this.plane,
      demo: this.demo,
      sfx: this.combat.sfx,
      notify,
    });
    // The Caller: south of the comms line, a voice in the family's (story/Caller.js).
    this.caller = new Caller(this.cfg, this.bus);
    this.caller.init({ dialogue: this.dialogue, subtitles: this.subtitles, comms: this.comms, progress: this.progress, player: this.player, clock: this.clock, sfx: this.combat.sfx, atmosphere: this.atmosphere, demo: this.demo, interiors: this.interiors, stairsAt: () => this.stairsSite?.place ?? null });
    // The old church and the time capsule (encounters/OldChurch.js).
    this.church = new OldChurch(this.cfg, this.bus);
    this.church.init({
      scene: this.scene,
      site: this.churchSite,
      player: this.player,
      combat: this.combat,
      ground: this.world.ground,
      world: this.world,
      cutscenes: this.cutscenes,
      dialogue: this.dialogue,
      subtitles: this.subtitles,
      caller: this.caller,
      progress: this.progress,
      lore: this.lore,
      paper: this.paper,
      card: this.card,
      mapUi: this.mapUi,
      demo: this.demo,
      notify,
    });
    this.combat.promptSources.push(this.church.hud);
    this.vehicles.busy?.push(this.church.hud);
    // The stairs, the place beyond (the Session 22 spike, promoted), Junie home (encounters/Stairs.js).
    this.placeBeyond.dialogue = this.dialogue;
    this.stairs = new Stairs(this.cfg, this.bus);
    this.stairs.init({
      scene: this.scene,
      site: this.stairsSite,
      moths: this.moths, // Session 32: the swarm that keeps the stairs
      quad: this.quad, // Session 33: Junie rides on the back of it
      beyond: this.placeBeyond,
      player: this.player,
      ground: this.world.ground,
      station: this.station,
      cutscenes: this.cutscenes,
      dialogue: this.dialogue,
      subtitles: this.subtitles,
      progress: this.progress,
      interiors: this.interiors,
      demo: this.demo,
      sfx: this.combat.sfx,
      notify,
    });
    this.combat.promptSources.push(this.stairs.hud);
    this.vehicles.busy?.push(this.stairs.hud);
    // Milo's barn (an optional encounter: encounters/MiloBarn.js).
    this.milo = new MiloBarn(this.cfg, this.bus);
    this.milo.init({
      scene: this.scene,
      site: this.barnSite,
      player: this.player,
      combat: this.combat,
      enemies: this.combat.enemies,
      ground: this.world.ground,
      station: this.station,
      cutscenes: this.cutscenes,
      dialogue: this.dialogue,
      subtitles: this.subtitles,
      progress: this.progress,
      lore: this.lore,
      card: this.card,
      clock: this.clock,
      demo: this.demo,
      notify,
    });
    this.combat.promptSources.push(this.milo.hud);
    this.vehicles.busy?.push(this.milo.hud);
    // The railway cutting (an optional encounter: encounters/RailwayCutting.js; Session 27).
    this.cutting = new RailwayCutting(this.cfg, this.bus);
    this.cutting.init({
      scene: this.scene,
      site: this.cuttingSite,
      player: this.player,
      combat: this.combat,
      enemies: this.combat.enemies,
      ground: this.world.ground,
      cutscenes: this.cutscenes,
      caller: this.caller,
      subtitles: this.subtitles,
      progress: this.progress,
      lore: this.lore,
      paper: this.paper,
      card: this.card,
      clock: this.clock,
      dynamite: this.dynamite,
      demo: this.demo,
      notify,
    });
    this.combat.promptSources.push(this.cutting.hud);
    this.vehicles.busy?.push(this.cutting.hud);
    // The sawmill (an optional encounter: encounters/Sawmill.js; Session 28).
    this.sawmill = new Sawmill(this.cfg, this.bus);
    this.sawmill.init({
      scene: this.scene,
      site: this.sawmillSite,
      player: this.player,
      combat: this.combat,
      enemies: this.combat.enemies,
      ground: this.world.ground,
      cutscenes: this.cutscenes,
      dialogue: this.dialogue,
      subtitles: this.subtitles,
      progress: this.progress,
      lore: this.lore,
      paper: this.paper,
      card: this.card,
      clock: this.clock,
      chainsaw: this.chainsaw,
      demo: this.demo,
      notify,
    });
    this.combat.promptSources.push(this.sawmill.hud);
    this.vehicles.busy?.push(this.sawmill.hud);
    // The moonshiners' holler (an optional encounter: encounters/Holler.js; Session 29).
    this.holler = new Holler(this.cfg, this.bus);
    this.holler.init({
      scene: this.scene,
      site: this.hollerSite,
      player: this.player,
      combat: this.combat,
      enemies: this.combat.enemies,
      explosives: this.explosives,
      ground: this.world.ground,
      cutscenes: this.cutscenes,
      dialogue: this.dialogue,
      subtitles: this.subtitles,
      progress: this.progress,
      lore: this.lore,
      paper: this.paper,
      card: this.card,
      clock: this.clock,
      demo: this.demo,
      notify,
    });
    this.combat.promptSources.push(this.holler.hud);
    this.vehicles.busy?.push(this.holler.hud);
    // The abandoned mineshaft (an optional encounter: encounters/Mineshaft.js; Session 30).
    this.mineshaft = new Mineshaft(this.cfg, this.bus);
    this.mineRide = new MineRide(this.cfg, this.bus); // the cage, the mine below, the turret cart
    this.mineRide.init({
      scene: this.scene,
      site: this.mineSite,
      interiors: this.interiors,
      world: this.world,
      player: this.player,
      combat: this.combat,
      enemies: this.combat.enemies,
      progress: this.progress,
      flashlight: this.flashlight,
      vhud: this.vehicleHud,
      hud: this.mineshaft.hud,
      notify,
      // Session 31: the bottom (encounters/MineBottom.js).
      lore: this.lore,
      paper: this.paper,
      card: this.card,
      dynamite: this.dynamite,
      explosives: this.explosives,
      cutscenes: this.cutscenes,
    });
    // What comes at him down there (encounters/MineFight.js): miners, the mine's own beetles, the moths.
    this.mineBeetles = new Beetles(this.cfg, this.bus);
    this.mineBeetles.init(this.scene, { player: this.player, combat: this.combat, colliders: null, ground: this.world.ground });
    this.mineFight = new MineFight(this.cfg, this.bus);
    // Build queue item 3: the Bigfoot cave (encounters/BigfootCave.js). Its beetles are the mine's (the pool for interiors).
    this.bigfootCave = new BigfootCave(this.cfg, this.bus);
    this.bigfootCave.init({ scene: this.scene, world: this.world, roadNorth: this.roadNorth, interiors: this.interiors, player: this.player, combat: this.combat, station: this.station, beetles: this.mineBeetles, flashlight: this.flashlight, cutscenes: this.cutscenes, dialogue: this.dialogue, subtitles: this.subtitles, progress: this.progress, demo: this.demo, sfx: this.combat.sfx, notify });
    this.combat.promptSources.push(this.bigfootCave.hud);
    this.vehicles.busy?.push(this.bigfootCave.hud);
    // Build queue item 4: the missing quad and the mega night (encounters/MegaNight.js).
    this.megaNight = new MegaNight(this.cfg, this.bus);
    this.megaNight.init({ scene: this.scene, ground: this.world.ground, player: this.player, quad: this.quad, station: this.station, enemies: this.combat.enemies, world: this.world, combat: this.combat, clock: this.clock, dialogue: this.dialogue, subtitles: this.subtitles, progress: this.progress, demo: this.demo, sfx: this.combat.sfx, notify, skipToNight: () => { this.skipToPhase('night'); this.nightWatch.forecastDue = false; this.nightWatch.closeForecast?.(); }, skipToDawn: () => { this.skipToPhase('dawn'); this.nightWatch.forecastDue = false; this.nightWatch.closeForecast?.(); } });
    // Build queue item 5: the crashed UFO and the mothership (encounters/Mothership.js).
    this.mothership = new Mothership(this.cfg, this.bus);
    this.mothership.init({ scene: this.scene, world: this.world, site: this.ufoSite, interiors: this.interiors, player: this.player, combat: this.combat, station: this.station, megaNight: this.megaNight, alienQuad: this.alienQuad, flashlight: this.flashlight, dialogue: this.dialogue, subtitles: this.subtitles, progress: this.progress, demo: this.demo, sfx: this.combat.sfx, notify });
    this.combat.promptSources.push(this.mothership.hud);
    this.vehicles.busy?.push(this.mothership.hud);
    this.bus.on('station:shipCore', () => this.dialogue.play('ship.fitted.ellen'));
    // Build queue item 6: the Car Armory and Sheriff (encounters/CarArmory.js).
    this.carArmory = new CarArmory(this.cfg, this.bus);
    this.carArmory.init({ scene: this.scene, site: this.armorySite, player: this.player, combat: this.combat, explosives: this.explosives, enemies: this.combat.enemies, ground: this.world.ground, lore: this.lore, dialogue: this.dialogue, subtitles: this.subtitles, progress: this.progress, demo: this.demo, sfx: this.combat.sfx, notify });
    this.combat.promptSources.push(this.carArmory.hud);
    this.vehicles.busy?.push(this.carArmory.hud);
    // Build queue item 7: the ute chase and the garage (encounters/UteChase.js).
    this.uteChase = new UteChase(this.cfg, this.bus);
    this.uteChase.init({ scene: this.scene, ground: this.world.ground, colliders: this.colliders, armory: this.carArmory, ute: this.ute, player: this.player, combat: this.combat, enemies: this.combat.enemies, station: this.station, dialogue: this.dialogue, subtitles: this.subtitles, progress: this.progress, demo: this.demo, sfx: this.combat.sfx, notify });
    this.combat.promptSources.push(this.uteChase.hud);
    this.vehicles.busy?.push(this.uteChase.hud);
    this.mineFight.init({ enemies: this.combat.enemies, beetles: this.mineBeetles, moths: this.moths, combat: this.combat, player: this.player, notify, rng: this.rng.fork('mine') });
    this.mineRide.fight = this.mineFight;
    this.mineshaft.init({
      scene: this.scene,
      site: this.mineSite,
      ride: this.mineRide,
      player: this.player,
      combat: this.combat,
      enemies: this.combat.enemies,
      cutscenes: this.cutscenes,
      dialogue: this.dialogue,
      comms: this.comms,
      subtitles: this.subtitles,
      progress: this.progress,
      lore: this.lore,
      paper: this.paper,
      card: this.card,
      clock: this.clock,
      demo: this.demo,
      notify,
    });
    this.combat.promptSources.push(this.mineshaft.hud);
    this.vehicles.busy?.push(this.mineshaft.hud);
    // Someone who isn't there says nothing (Junie, taken).
    this.dialogue.absent = (speaker) => speaker === 'junie' && this.junieTaken.away;
    this.combat.promptSources.push(this.junieTaken.hud);
    this.station.blockers.push(this.junieTaken.hud);
  }

  // M9.2: the main menu over its live feed, or "Tap to begin" after the
  // reload a new map needed.
  showMenu() {
    this.cutscenes.play('menu.feed', { skippable: false });
    if (this.pendingChoice && !this.pendingSave) {
      this.startScreen.show('begin');
      return;
    }
    this.pendingChoice = null;
    this.startScreen.showMenu({
      save: this.pendingSave ? saveLabel(this.pendingSave, this.cfg.clock) : '',
      skipIntro: this.meta.introSeen,
    });
  }

  // Session 13: the debug model viewer (the Models category).
  initViewer(root) {
    this.viewer = new ModelViewer(this.cfg, this.bus);
    this.viewer.init({
      root,
      scene: this.scene,
      renderer: this.renderer,
      player: this.player,
      clock: this.clock,
      flashlight: this.flashlight,
      ground: this.world.ground,
      station: this.station,
      viewModel: this.combat.viewModel,
      rng: this.rng,
      cutscenes: this.cutscenes,
      closeMenu: () => this.debugMenu.close(),
      drawDistance: () => this.drawDistance,
    });
  }

  // M8: flags about the world now, for lines' conditions (DESIGN.md
  // "Dialogue system": base damaged, zombie level 4+).
  storyFlags() {
    const flags = [...(this.progress?.flags.list() ?? [])]; // M9.1: story progress, by name
    if (this.director.effectiveLevel >= 4) flags.push('zombieLevel4');
    for (const b of this.station.state.barriers()) {
      if (b.kind !== 'barricade' && b.health < b.max) {
        flags.push('baseDamaged');
        break;
      }
    }
    return flags;
  }

  initUi(root) {
    const cfg = this.cfg;
    this.mapUi = new MapUi(cfg, this.world, this.bus);
    this.mapUi.init(root);
    this.bus.on('map:refused', ({ text }) => this.toast.show(text)); // Session 33: no map in the place beyond or the mine
    this.toast = new Toast(cfg.ui);
    this.toast.init(root);
    // Session 15b (Aaron): control prompts in their own slot under the toast
    // (a later toast replaced them); their time doesn't run in a cutscene.
    this.hints = new Toast(cfg.ui);
    this.hints.init(root);
    this.hints.el.className = 'toast hint hidden';
    // Session 17 (Aaron): ESCAPE THE WITCH, early in the run (story/WitchEscape.js).
    this.alert = new Toast(cfg.ui);
    this.alert.init(root);
    this.alert.el.className = 'toast alert hidden';
    this.overlay = new DebugOverlay(cfg.debug, this);
    this.overlay.init(root);
    this.debugMenu = new DebugMenu(cfg.debug.menu, this.input, this.bus);
    this.debugMenu.init(root);
    this.startScreen = new StartScreen((choice) => this.onStartChoice(choice));
    this.startScreen.init(root);
  }

  addOverlayStats() {
    this.overlay.addStat('quality', () => {
      const dr = this.dynamicResolution;
      return `${this.qualityName}  cap ${this.frameCap || 'off'}  dynres ${dr.enabled ? 'on' : 'off'} (${dr.min}-${dr.max})  draw ${this.drawDistance}m`;
    });
    this.overlay.addStat('player', () => {
      const p = this.player;
      const brush = p.undergrowth > 0.05 ? `  undergrowth ${Math.round(p.undergrowth * 100)}%` : '';
      return `${p.stance}  ${p.speed.toFixed(1)} m/s  stamina ${Math.round(p.stamina.value)}  at ${p.position.x.toFixed(0)}, ${p.position.z.toFixed(0)}  height ${p.position.y.toFixed(1)}${brush}`;
    });
    this.overlay.addStat('map', () => {
      const p = this.player.position;
      const w = this.world;
      const { clearing, distance } = w.nearestClearing(p.x, p.z);
      const where = distance <= clearing.radius ? `in ${w.clearingName(clearing)}` : `${Math.round(distance)}m from ${w.clearingName(clearing)}`;
      return `${where} (${clearing.band}, south ${clearing.southness.toFixed(2)})  ${w.map.clearings.length} clearings ${w.map.edges.length} paths  ${this.mapUi.overlayLine()}`;
    });
    this.overlay.addStat('world', () => {
      const f = this.flashlight;
      const w = this.world;
      const torch = f.on ? `on ${Math.round(f.glareFactor * 100)}% (surface ${f.surfaceDistance.toFixed(1)}m)` : 'off';
      const k = (n) => `${Math.round(n / 1000)}k`;
      return `${k(w.forest.treeCount)} trees ${k(w.forest.bushCount)} bushes (${w.forest.visibleChunks} chunks drawn)  built ${Math.round(w.buildMs)}ms  torch ${torch}`;
    });
    this.overlay.addStat('combat', () => this.combat.overlayLine());
    this.overlay.addStat('zombies', () => this.combat.zombieOverlayLine());
    this.overlay.addStat('lod', () => this.combat.enemies.lodLine());
    this.overlay.addStat('sigils', () => this.director.overlayLines().sigils);
    this.overlay.addStat('witch', () => this.witch.overlayLine());
    this.overlay.addStat('final', () => this.finalBattle.overlayLine());
    this.overlay.addStat('station', () => this.station.overlayLine());
    this.overlay.addStat('nights', () => this.nightWatch.overlayLine());
    this.overlay.addStat('atmosphere', () => this.atmosphere.overlayLine(this.clock));
    this.overlay.addStat('vehicles', () => this.vehicles.overlayLine());
    this.overlay.addStat('progress', () => `${this.progress.overlayLine()}  ${this.gates.overlayLine()}  ${this.interiors.overlayLine()}`);
    this.overlay.addStat('firstDay', () => `${this.firstDay.overlayLine()}  ${this.campsite.overlayLine()}  ${this.gasStation.overlayLine()}  ${this.shelter.overlayLine()}  ${this.quad.overlayLine()}`);
    this.overlay.addStat('experimental', () => `${this.experimental.map((v) => v.overlayLine()).join('  ')}  ${this.roadNorth.overlayLine()}`);
    this.overlay.addStat('outpost', () => `${this.outpost.overlayLine()}  ${this.witchEscape.overlayLine()}  ${this.homeStop.overlayLine()}`);
    this.overlay.addStat('demo', () => `${this.demo.overlayLine()}  ${this.placeBeyond.overlayLine()}  ${this.flyer.overlayLine()}  ${this.moths.overlayLine()}  ${this.plane.overlayLine()}  ${this.junieTaken.overlayLine()}  ${this.comms.overlayLine()}  ${this.caller.overlayLine()}  ${this.church.overlayLine()}  ${this.stairs.overlayLine()}  ${this.milo.overlayLine()}  ${this.cutting.overlayLine()}  ${this.sawmill.overlayLine()}  ${this.holler.overlayLine()}`);
    this.overlay.addStat('story', () => `${this.dialogue.overlayLine()}  trail ${this.trailCams.overlayLine()}  cutscene ${this.cutscenes.overlayLine()}  viewer ${this.viewer.overlayLine()}`);
  }

  // Each system adds its tools to its category (DEBUG in DebugMenu.js).
  addDebugMenuItems() {
    const menu = this.debugMenu;
    const cfg = this.cfg;
    // Aaron (after Session 26): begin playing from the outpost cleared (debug/storyStart.js).
    const start = menu.category(DEBUG.start);
    const jump = (explored) => () => {
      startFromOutpostCleared(this, { explored });
      this.debugMenu.close();
    };
    start.addItem('Outpost cleared: the compound still to explore', jump(false));
    start.addItem('Outpost cleared and explored: the checkpoint next', jump(true));
    // Session 33: later points (the plane, Junie), each on top of the outpost explored.
    const later = (point) => () => {
      startFromLater(this, point);
      this.debugMenu.close();
    };
    // Aaron, Nov 12: "a continue story option for each main story encounter".
    for (const s of STORY_POINTS) start.addItem(`Continue story: ${s.label}`, later(s.id));
    const time = menu.category(DEBUG.time);
    time.addItem(() => `Skip to next phase (now ${this.clock.phase})`, () => this.clock.skipPhase());
    time.addItem('Skip to night', () => this.skipToPhase('night'));
    // M6: fast-forward runs the whole world faster (not just the clock), so
    // a night's marches and attacks can be watched in a minute or two.
    time.addItem(
      () => `Fast-forward: x${this.fastForward} (zombies, marches and the clock)`,
      () => (this.fastForward = nextInList(cfg.debug.fastForwardSteps, this.fastForward)),
    );
    this.addMapDebugItems(menu);
    this.director.addDebugItems(menu);
    this.combat.addDebugItems(menu);
    this.dynamite.addDebugItems(menu, DEBUG.player); // Session 27
    this.chainsaw.addDebugItems(menu, DEBUG.player); // Session 28
    this.witch.addDebugItems(menu, (text) => this.toast.show(text));
    this.addHutDebugItems(menu);
    this.station.addDebugItems(menu);
    this.nightWatch.addDebugItems(menu);
    this.vehicles.addDebugItems(menu);
    this.mapUi.addDebugItems(menu);
    this.atmosphere.addDebugItems(menu, (text) => this.toast.show(text));
    this.cutscenes.addDebugItems(menu);
    this.viewer.addDebugItems(menu);
    this.dialogue.addDebugItems(menu);
    this.trailCams.addDebugItems(menu);
    this.lore.addDebugItems(menu);
    this.firstDay.addDebugItems(menu);
    this.campsite.addDebugItems(menu);
    this.gasStation.addDebugItems(menu);
    this.shelter.addDebugItems(menu);
    this.outpost.addDebugItems(menu);
    this.quad.addDebugItems(menu);
    for (const v of this.experimental) v.addDebugItems(menu); // the ute with a turret, the alien quad
    this.roadNorth.addDebugItems(menu); // Session 21
    this.placeBeyond.addDebugItems(menu); // Session 22: the spikes
    this.flyer.addDebugItems(menu);
    this.moths.addDebugItems(menu);
    this.plane.addDebugItems(menu);
    this.junieTaken.addDebugItems(menu); // Session 26
    this.caller.addDebugItems(menu);
    this.church.addDebugItems(menu);
    this.stairs.addDebugItems(menu);
    this.cordonDozer.addDebugItems(menu);
    this.bugZapper.addDebugItems(menu);
    this.bigfootCave.addDebugItems(menu);
    this.megaNight.addDebugItems(menu);
    this.mothership.addDebugItems(menu);
    this.carArmory.addDebugItems(menu);
    this.uteChase.addDebugItems(menu);
    this.milo.addDebugItems(menu);
    this.cutting.addDebugItems(menu);
    this.sawmill.addDebugItems(menu);
    this.holler.addDebugItems(menu);
    this.mineshaft.addDebugItems(menu);
    const display = menu.category(DEBUG.display);
    display.addItem('Toggle debug overlay', () => this.overlay.toggle());
    display.addItem(
      () => `Quality: ${this.qualityName}`,
      () => this.applyQuality(nextInList(Object.keys(cfg.quality.presets), this.qualityName)),
    );
    display.addItem(
      () => `Frame cap: ${this.frameCap || 'off'}`,
      () => this.setFrameCap(nextInList(cfg.quality.frameCapSteps, this.frameCap)),
    );
    display.addItem(
      () => `Dynamic resolution: ${this.dynamicResolution.enabled ? 'on' : 'off'}`,
      () => this.dynamicResolution.setEnabled(!this.dynamicResolution.enabled),
    );
    // Session 10: the optional retro pixel filter (a Quality setting once
    // there's a settings screen, Session 19).
    display.addItem(
      () => `Retro pixel filter: ${this.renderer.retro ? 'on' : 'off'}`,
      () => this.renderer.setRetro(!this.renderer.retro),
    );
  }

  // M7 step 4: the hut and explosives.
  addHutDebugItems(menu) {
    const hut = menu.category(DEBUG.hut);
    const ex = () => this.explosives;
    hut.addItem(
      () => `Give 2 charges (carrying ${this.combat.inventory.charges}, planted ${ex().placed.length})`,
      () => this.toast.show(ex().give(2) > 0 ? 'Charges given: the detonator is on the weapon cross (D-pad down) to plant anywhere' : 'You can only have two out at once'),
    );
    hut.addItem('Teleport: to the hut door', () => {
      const d = this.hut.door;
      this.player.teleport(d.x + Math.sin(this.hut.facing) * 4, d.z + Math.cos(this.hut.facing) * 4, this.hut.facing);
      this.toast.show(this.hut.destroyed ? 'The hut is a wreck' : "At the witch's hut");
    });
    hut.addItem('Plant both charges on the hut now', () => {
      if (this.hut.destroyed) return this.toast.show('The hut is already destroyed');
      ex().placed = ex().placed.filter((c) => !c.onHut);
      this.combat.inventory.charges = 0;
      for (const a of [0.6, -0.6]) {
        const f = this.hut.facing + a;
        const w = this.hut.wallPoint(this.hut.x + Math.sin(f) * 10, this.hut.z + Math.cos(f) * 10);
        ex().placed.push({ x: w.x, z: w.z, y: this.world.ground.heightAt(w.x, w.z), onHut: true });
      }
      this.bus.emit('hut:armed'); // the point of no return's radio call and pop-up
    });
    hut.addItem('Set off every planted charge now', () => this.toast.show(`${ex().detonate()} charge(s) went off`));
    hut.addItem(() => `Destroy the hut now: starts the final battle (${this.hut.destroyed ? 'destroyed' : 'standing'})`, () => this.hut.destroy());
    hut.addItem('Final battle: teleport to the hut and start it', () => {
      const h = this.hut;
      this.player.teleport(h.x + Math.sin(h.facing) * 14, h.z + Math.cos(h.facing) * 14, h.facing);
      this.hut.destroy();
    });
  }

  // Teleports, the map screen's debug view, and new or repeated seeds.
  addMapDebugItems(menu) {
    const clearings = this.world.map.clearings;
    this.teleportIndex = 0;
    const label = () => {
      const c = clearings[this.teleportIndex];
      return `Teleport: next clearing (${this.teleportIndex + 1}/${clearings.length} ${this.world.clearingName(c)})`;
    };
    const teleport = menu.category(DEBUG.teleport);
    const run = menu.category(DEBUG.run);
    teleport.addItem(label, () => {
      this.teleportIndex = (this.teleportIndex + 1) % clearings.length;
      this.teleportTo(clearings[this.teleportIndex]);
    });
    teleport.addItem('Teleport: home', () => this.teleportTo(this.world.home));
    teleport.addItem("Teleport: witch's hut", () => this.teleportTo(this.world.hut));
    // M9.1: the cordon's checkpoint, from the cluster's side, facing it.
    teleport.addItem('Teleport: the checkpoint (cordon)', () => {
      const cp = this.world.cordon.layout.checkpoint;
      this.player.teleport(cp.x, cp.z - 8, Math.PI);
      this.toast.show('At the checkpoint');
    });
    // Session 21 (M10.2): the story spine's places in order, the seed's optional encounters, the railway.
    const spine = clearings.filter((c) => c.spine).sort((a, b) => (a.beat ?? 0) - (b.beat ?? 0));
    this.spineIndex = -1;
    teleport.addItem(
      () => `Teleport: next story place (${spine.length ? this.world.clearingName(spine[(this.spineIndex + 1) % spine.length]) : 'none'})`,
      () => {
        if (!spine.length) return;
        this.spineIndex = (this.spineIndex + 1) % spine.length;
        this.teleportTo(spine[this.spineIndex]);
      },
    );
    const optional = clearings.filter((c) => c.optional);
    this.optionalIndex = -1;
    teleport.addItem(
      () => `Teleport: next optional encounter (${optional.length} this run${optional.length ? `: ${this.world.clearingName(optional[(this.optionalIndex + 1) % optional.length])}` : ''})`,
      () => {
        if (!optional.length) return;
        this.optionalIndex = (this.optionalIndex + 1) % optional.length;
        this.teleportTo(optional[this.optionalIndex]);
      },
    );
    const rail = this.world.railway;
    if (rail) {
      this.crossingIndex = -1;
      teleport.addItem(
        () => `Teleport: next railway crossing (${rail.crossings.length})`,
        () => {
          if (!rail.crossings.length) return;
          this.crossingIndex = (this.crossingIndex + 1) % rail.crossings.length;
          const c = rail.crossings[this.crossingIndex];
          this.player.teleport(c.x - c.tx * 10, c.z - c.tz * 10, Math.atan2(-c.tx, -c.tz));
          this.toast.show('By a crossing on the 1903 line');
        },
      );
      for (const [i, name] of [[0, 'west'], [1, 'east']]) {
        teleport.addItem(`Teleport: the railway's ${name} tunnel`, () => {
          const t = this.world.map.railway.tunnels[i];
          const x = t.x + t.facing * 16;
          this.player.teleport(x, t.z, t.facing > 0 ? Math.PI / 2 : -Math.PI / 2);
          this.toast.show(`At the ${name} end of the 1903 line`);
        });
      }
    }
    // M9.1: every story progress flag (the gates open and shut with them).
    this.progress.addDebugItems(menu.category(DEBUG.progress));
    run.addItem(() => `New map (seed now ${this.seed})`, () => this.newRun());
    run.addItem('Restart this map (same seed, deletes the save)', () => {
      this.saves.clear();
      reloadWithSeed(this.seed);
    });
    // M6: the save slot.
    run.addItem('Save now (as the dawn autosave does)', () => this.toast.show(this.autosave() ? 'Game saved' : this.pastNoReturn ? 'No saving after the hut is destroyed' : 'Could not save (storage blocked?)'));
    run.addItem('Delete the save', () => {
      this.saves.clear();
      this.toast.show('Save deleted');
    });
  }

  // Land a few metres from a clearing's centre, facing it.
  teleportTo(clearing) {
    const off = this.cfg.debug.teleportOffset;
    this.player.teleport(clearing.x, clearing.z + off, 0);
    this.toast.show(`Teleported to ${this.world.clearingName(clearing)}`);
  }

  skipToPhase(name) {
    for (let i = 0; i < this.cfg.clock.phases.length && this.clock.phase !== name; i++) this.clock.skipPhase();
  }

  // Session 22: the preset this device's demo test (or demo panel) chose, else the config's.
  startQuality() {
    const kept = this.meta.get(this.cfg.demo.metaQualityKey);
    return this.cfg.quality.presets[kept] ? kept : this.cfg.quality.preset;
  }

  // Apply a quality preset to every system it touches.
  applyQuality(name) {
    const q = this.cfg.quality.presets[name];
    const dr = this.dynamicResolution;
    if (this.qualityName === undefined) {
      dr.init({ scale: this.cfg.render.renderScale, min: q.renderScaleMin, max: q.renderScaleMax, targetFps: this.cfg.render.targetFps });
    } else {
      dr.setBounds(q.renderScaleMin, q.renderScaleMax);
    }
    this.qualityName = name;
    this.renderer.setScale(dr.scale);
    this.renderer.setPostFX(q.postFX, q.bloom);
    this.presetDrawDistance = q.drawDistance;
    this.sky.setDrawDistance(q.drawDistance);
    this.setViewDistance(q.drawDistance);
    this.atmosphere.setQuality(q);
    this.world.terrain.setTwoSizes(q.groundTwoSizes ?? true);
    this.world.forest.nearTrunks.setDistance(q.treeTrunks ?? 0);
    this.flashlight.setShadow(q.flashlightShadow, q.shadowMapSize);
    this.setFrameCap(q.frameCap);
  }

  // Session 10b: looking through the heat scope (the semi-auto rifle) turns
  // the world cold and the living white-hot. Switched as the scope view
  // takes over from the gun, and back as you lower it.
  updateThermal() {
    const w = this.combat.weapons;
    // M8: never through a cutscene. Session 13: the model viewer's heat scope light.
    const scoped = !!w.weapon.thermal && w.scoped >= this.cfg.viewModel.scopeHideAt && this.combat.alive && !this.cutscenes.active && !this.viewer.active;
    const on = scoped || this.viewer.thermal;
    const t = this.cfg.viewModel.thermal;
    if (scoped) {
      // The witch's glow fades up close, like the zombies' (Aaron).
      const p = this.player.camera.position;
      const d = Math.hypot(this.witch.x - p.x, this.witch.z - p.z);
      const k = Math.max(0, Math.min(1, (d - t.nearMetres) / (t.farMetres - t.nearMetres)));
      this.witch.renderer.setThermal(true, t.witchNearGlow + (1 - t.witchNearGlow) * k * k * (3 - 2 * k));
    }
    if (on === !!this.thermal) return;
    this.thermal = on;
    this.sky.setThermal(on ? t.world : null);
    this.renderer.postFX.setThermal(on, t.tint);
    // Bloom smeared the glowing zombies into blobs (Aaron): off through the scope.
    this.renderer.postFX.setBloom(on ? t.bloom : this.cfg.quality.presets[this.qualityName].bloom);
    this.combat.zombieRenderer.setThermal(on, t);
    this.combat.mutantRenderer.setThermal(on, t);
    this.flyer.renderer.setThermal(on, t); // Session 24: the Mothman
    this.moths.renderer.setThermal(on, t); // Session 25
    this.viewer.setThermal(on, t);
    this.station.renderer.setThermal(on, t); // Session 13: the family
    if (!on) this.witch.renderer.setThermal(false);
    this.atmosphere.thermal = on;
    const torch = this.flashlight;
    torch.light.visible = torch.on && !on;
    torch.spill.visible = torch.on && !on;
  }

  // How far everything is drawn: the preset's distance, or less while a
  // fog night is in (Session 10). Visual only.
  setViewDistance(distance) {
    this.drawDistance = distance;
    this.world.setDrawDistance(distance);
    this.director?.setDrawDistance(distance);
    this.witch?.setDrawDistance(distance);
    this.combat.setDrawDistance(distance);
    this.station?.renderer.setDrawDistance(distance);
    this.player.setFar(distance + this.cfg.render.farMargin);
  }

  setFrameCap(cap) {
    this.frameCap = cap;
    this.dynamicResolution.setTarget(cap || this.cfg.render.targetFps);
  }

  wireEvents() {
    const { bus } = this;
    this.unsubscribers = [
      bus.on('clock:phaseChanged', ({ to, day }) => bus.emit(`phase:${to}`, { day })),
      bus.on('input:gamepadConnected', ({ id }) => {
        const name = shortPadName(id);
        this.startScreen.setControllerStatus(name);
        this.toast.show(`Controller connected: ${name}`);
      }),
      bus.on('input:gamepadDisconnected', () => {
        this.startScreen.setControllerStatus(null);
        this.toast.show('Controller disconnected. Reconnect it, or use keyboard and mouse.');
      }),
      bus.on('display:fullscreenChanged', ({ fullscreen }) => this.onFullscreenChanged(fullscreen)),
      bus.on('render:contextLost', () => this.toast.show('Graphics context lost. Reload the page.')),
      // Permadeath (M6): a new run on a fresh map (M12 brings the run summary).
      bus.on('run:newRequested', () => this.newRun()),
      // M6: autosave at each dawn; the save goes when the run ends (permadeath).
      bus.on('phase:dawn', () => {
        if (this.cfg.save.autosaveAtDawn && this.state === 'running' && this.combat.alive && this.autosave()) {
          // Plan #11: and what the night cost.
          const report = this.nightWatch?.dawnReport?.() ?? '';
          this.toast.show(`Dawn: night ${this.clock.day} survived. Game saved${report ? `\n${report}` : ''}`, report ? this.cfg.ui.toastSeconds * 2 : undefined);
        }
        // Plan #11: the first dawn the fence box is flat, Wyatt says so.
        if (this.state === 'running' && this.clock.day > 1 && this.station.state.charge <= 0 && !this.dialogue.heard?.has('nights.boxFlat')) this.dialogue.play('nights.boxFlat');
      }),
      bus.on('player:died', () => {
        this.saves.clear();
        this.endRun('defeat', 'YOU DIED', this.deathReason());
      }),
      bus.on('station:overrun', () => this.saves.clear()),
      // Session 9 (Aaron, #130): destroying the hut is a true point of no
      // return. The save goes, and nothing saves again this run.
      bus.on('hut:destroyed', () => {
        this.pastNoReturn = true;
        this.saves.clear();
      }),
      bus.on('player:overrun', ({ reason }) => this.endRun('defeat', 'THE STATION FELL', reason)),
      bus.on('player:respawned', () => this.runEnd.hide()), // debug "try again"
      // M7: killing the witch wins the run. She bursts apart, the dead
      // collapse where they stand, and after a moment the ending plays.
      bus.on('witch:killed', () => {
        this.saves.clear();
        this.combat.enemies.collapseAll();
        this.victoryTimer = this.cfg.ending.victoryDelay;
      }),
      // The run's stats (the summary).
      bus.on('enemy:killed', () => this.stats.kills++),
      bus.on('sigil:dug', () => this.stats.sigilsDug++),
      bus.on('witch:planted', () => this.stats.sigilsPlanted++),
      bus.on('witch:interrupted', () => this.stats.ritualsBroken++),
      bus.on('witch:hurt', ({ damage }) => (this.stats.witchDamage += damage)),
      bus.on('witch:attacking', () => this.stats.witchEncounters++),
    ];

    // Re-lock the mouse when the canvas is clicked (desktop only).
    this.onCanvasClick = () => {
      if (this.state === 'running' && !this.debugMenu.isOpen && !this.station.ledger.isOpen && !this.paper.isOpen && !this.card.isOpen && !this.weaponCross.isOpen && !this.pauseMenu.isOpen && !this.demo.panel?.isOpen && hasFinePointer()) {
        this.input.requestPointerLock();
      }
    };
    this.renderer.canvas.addEventListener('click', this.onCanvasClick);

    // Session 20: losing the mouse lock mid-game (Esc, on desktop) pauses, unless
    // something that let go of it on purpose is up.
    this.onPointerLockChange = () => {
      if (document.pointerLockElement || !hasFinePointer() || !this.canPause()) return;
      if (this.demo.active) this.demo.panel.open('keyboardMouse');
      else this.pauseMenu.open('keyboardMouse');
    };
    document.addEventListener('pointerlockchange', this.onPointerLockChange);

    // Don't let a hidden tab produce one huge frame on return.
    this.onVisibility = () => {
      this.lastTime = null;
    };
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  // Nights survived: one for every dawn reached (day N is followed by night N).
  get nightsSurvived() {
    return this.clock.day - 1 + (this.clock.phase === 'dawn' ? 1 : 0);
  }

  // M7 step 6: the run's over. kind: 'victory' | 'defeat'.
  endRun(kind, title, reason) {
    if (this.demo.active) return this.demo.onDied(); // Session 22: back on your feet in the yard
    if (this.runEnd.isOpen) return;
    this.subtitles.clear();
    this.runEnd.show(kind, title, reason, this.stats, this.nightsSurvived);
  }

  deathReason() {
    if (this.finalBattle.active) return 'She killed you on the blood night.';
    return `You died on ${this.clock.phase === 'night' || this.clock.phase === 'dusk' ? 'night' : 'day'} ${this.clock.day}.`;
  }

  // The menu's choice (M6, M9.2): continue the saved run (put it back,
  // then start); a New Run (the opening) or Skip intro (Dawn 1) on this
  // map if it's fresh, else on a fresh map after a reload ("Tap to begin");
  // 'begin' carries on with the choice from before the reload; 'resume'
  // is back from leaving fullscreen.
  onStartChoice(choice) {
    if (choice === 'demo') {
      this.startDemo();
      return;
    }
    if (choice === 'new' || choice === 'skip') {
      if (this.pendingSave) {
        this.meta.setPendingChoice(choice);
        this.newRun();
        return;
      }
      this.start(choice);
      return;
    }
    if (choice === 'begin') {
      this.start(this.pendingChoice ?? 'new');
      return;
    }
    if (choice === 'continue' && this.pendingSave) {
      this.applySave(this.pendingSave);
      this.pendingSave = null;
      this.start('continue');
      return;
    }
    this.start();
  }

  // Session 22 (Aaron): Demo mode on whatever map is loaded (the station is the same on every seed).
  // Nothing it does is saved: the save store is swapped for one that keeps
  // nothing, so a saved run is still there to Continue after it.
  startDemo() {
    this.saves = { save: () => true, clear: () => {}, load: () => null };
    this.pendingSave = null;
    this.start('demo');
    this.demo.begin();
    // No touch controls yet (Aaron, Session 22: their own session): say so on a touch-only device with no controller.
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    if (!hasFinePointer() && pads.length === 0) this.toast.show(this.cfg.demo.needsControls, this.cfg.ui.toastSeconds * 3);
  }

  // ---- the pause menu (Session 20) ---------------------------------------------------------------

  // Nothing else up: the run's going, Tom's alive, no menu, map, ledger, paper, card or cutscene.
  canPause() {
    return (
      this.state === 'running' &&
      this.combat.alive &&
      !this.pauseMenu.isOpen &&
      !this.demo.panel?.isOpen &&
      !this.debugMenu.isOpen &&
      !this.mapUi.isOpen &&
      !this.station.ledger.isOpen &&
      !this.paper.isOpen &&
      !this.card.isOpen && !this.weaponCross.isOpen &&
      !this.noReturn.isOpen &&
      !this.runEnd.isOpen &&
      !this.cutscenes.active &&
      !this.viewer.active
    );
  }

  resumeFromPause() {
    this.combat.weapons.holdFire(); // the click on Resume mustn't fire
    if (hasFinePointer()) this.input.requestPointerLock();
  }

  // Why saving isn't allowed now (null: it is). The opening (Day 1 and
  // Night 1) is scripted and isn't saved; nothing saves past the point of no return.
  saveRefusal() {
    if (this.pastNoReturn) return 'no saving after the hut is destroyed';
    if (this.clock.day === 1 && this.clock.phase !== 'dawn') return 'saving starts at dawn after night 1'; // dawn 1 is still day 1
    return null;
  }

  // Aaron (Session 20): Continue puts Tom back at a safe point (home, in the
  // cabin), the clock and everything else as they were. Then back to the
  // main menu: the page reloads on the same seed and offers Continue.
  saveAndQuit() {
    if (this.saveRefusal()) return false;
    const data = this.collectSaveOutside();
    const safe = this.station.safePoint();
    data.player.x = safe.x;
    data.player.z = safe.z;
    data.player.yaw = safe.yaw;
    if (!this.saves.save(data)) {
      this.toast.show('Could not save (storage blocked?)');
      return false;
    }
    if (document.pointerLockElement) document.exitPointerLock?.();
    reloadWithSeed(this.seed);
    return true;
  }

  // A new run: the save goes, and the page reloads on a fresh map.
  newRun() {
    this.saves.clear();
    reloadWithSeed(Math.floor(Math.random() * this.cfg.rng.randomSeedMax));
  }

  // ---- saving (M6; core/saveData.js) -------------------------------------------

  collectSave() {
    return {
      version: SAVE_VERSION,
      seed: this.seed,
      savedAt: Date.now(),
      clock: saveClock(this.clock),
      player: savePlayer(this.player, this.combat),
      fog: packBits(this.mapUi.fog.toBytes()),
      station: saveStation(this.station.state),
      vehicles: saveVehicles(this.vehicles.list),
      sigils: saveSigils(this.director.sigils.list),
      revisits: saveRevisits(this.director.revisits),
      witch: this.witch.saveState(), // M7: her wounds and traps (optional: older saves have none)
      explosives: this.explosives.saveState(), // M7: charges carried and planted
      dynamite: this.dynamite.saveState(), // Session 27: sticks carried (optional: older saves have none)
      chainsaw: this.chainsaw.saveState(), // Session 28: the chain's edge (optional)
      stats: { ...this.stats }, // M7: for the run summary
      story: this.dialogue.saveState(), // M8: lines heard, milestones (optional: older saves have none)
      lore: this.lore.saveState(), // M8: lore carried and handed in, the monitors' clips
      progress: this.progress.saveState(), // M9.1: story progress flags (the gates follow them)
      campsite: this.campsite.saveState(), // M9.2: what's been searched, the wave (optional: older saves have none)
      gasStation: this.gasStation.saveState(), // Session 15b (M9.3): its beats (optional)
      shelter: this.shelter.saveState(), // Session 16 (M9.3): the storm shelter's beats (optional)
      outpost: this.outpost.saveState(), // Session 17 (M9.4): the outpost's beats (optional)
      quad: this.quad.saveState(), // Session 15b: where the quad bike was left (optional)
      ute: this.ute.saveState(), // build queue item 7: where the ute stands (optional; null until it's in the world)
      megaNight: this.megaNight.saveState(), // build queue item 4: the scorched ring's place (optional)
      dozer: this.dozer.saveState(), // build queue item 1: where the dozer stands (optional; null until it's in the world)
      clearing: this.clearing.saveState(), // the experimental dozer: the trees it felled, the trails it cut (optional)
      homeStop: this.homeStop.saveState(), // Session 18 (optional)
      roadNorth: this.roadNorth.saveState(), // Session 21: the brush in front of the cave (optional)
    };
  }

  // collectSave(), with Tom outside the interior he's in, if he's in one
  // (Session 21: a save made inside comes back outside its entrance).
  collectSaveOutside() {
    const data = this.collectSave();
    const out = this.interiors.saveSpot();
    if (out) {
      data.player.x = out.x;
      data.player.z = out.z;
      if (out.yaw !== undefined) data.player.yaw = out.yaw;
    }
    return data;
  }

  autosave() {
    if (this.pastNoReturn) return false;
    this.progress.settle(); // Session 23: dawn's own flags (day2, shelterCall) go into the dawn save
    return this.saves.save(this.collectSaveOutside());
  }

  // Put a saved run back (the world is already built from its seed).
  applySave(d) {
    loadClock(this.clock, d.clock);
    loadPlayer(this.combat, d.player);
    this.player.teleport(d.player.x, d.player.z, d.player.yaw);
    const fog = this.mapUi.fog;
    fog.fromBytes(unpackBits(d.fog, fog.cells.length));
    loadStation(this.station.state, d.station);
    this.station.syncColliders();
    loadVehicles(this.vehicles.list, d.vehicles);
    for (const v of this.vehicles.list) {
      if (v.wrecked) this.vehicles.renderer.setBurnt(v, this.cfg.vehicles.damage.burnt); // Session 14
      this.vehicles.renderer.refresh(v);
    }
    this.director.removeAll();
    for (const s of d.sigils) {
      const sigil = this.director.plant({ ...s });
      if (!sigil) continue;
      sigil.raised = s.raised;
      sigil.hold = s.hold ?? 0; // M9.2
      sigil.known = Boolean(s.known);
      sigil.firstSigil = Boolean(s.firstSigil);
    }
    loadRevisits(this.director.revisits, d.revisits ?? []);
    this.witch.loadState(d.witch);
    this.explosives.loadState(d.explosives);
    this.dynamite.loadState(d.dynamite);
    this.chainsaw.loadState(d.chainsaw);
    this.stats = loadStats(d.stats);
    this.dialogue.loadState(d.story);
    this.lore.loadState(d.lore);
    this.progress.loadState(d.progress);
    if (this.clock.phase === 'dawn') this.progress.replay('dawn', this.clock.day); // Session 23: a dawn save made before dawn's flags ran
    this.campsite.loadState(d.campsite);
    this.gasStation.loadState(d.gasStation);
    this.shelter.loadState(d.shelter);
    this.outpost.loadState(d.outpost);
    this.outpost.checkCall();
    this.quad.loadState(d.quad);
    this.clearing.loadState(d.clearing);
    this.homeStop.loadState(d.homeStop);
    this.roadNorth.loadState(d.roadNorth);
    this.plane.reset(); // Session 25: the crashed plane, as its flags say (a fight that was on starts again)
    this.comms.reset(); // Session 26: which side of the comms line Tom's on, the radio as the flags say
    this.caller.reset();
    this.junieTaken.reset();
    this.church.reset();
    this.stairs.reset();
    this.dozer.loadState(d.dozer); // build queue item 1: where the dozer stood
    this.cordonDozer.reset();
    this.bugZapper.reset();
    this.bigfootCave.reset();
    this.megaNight.loadState(d.megaNight); // build queue item 4: where the quad stood
    this.megaNight.reset();
    this.mothership.reset();
    this.carArmory.reset();
    this.ute.loadState(d.ute); // build queue item 7: where the ute stood
    this.uteChase.reset();
    this.milo.reset();
    this.cutting.reset(); // Session 27
    this.sawmill.reset(); // Session 28
    this.holler.reset(); // Session 29
    this.mineshaft.reset(); // Session 30
    this.toast.show(`Continuing: ${saveLabel(d, this.cfg.clock)}`);
  }

  // Called from the start screen's tap: a user gesture, so fullscreen
  // and pointer lock are allowed here. Pointer lock first, because the
  // fullscreen request uses up the gesture.
  // mode (M9.2): 'new' plays the opening, 'skip' starts at Dawn 1,
  // 'continue' a saved run; none when resuming.
  start(mode = null) {
    if (hasFinePointer()) this.input.requestPointerLock();
    this.display.enter();
    this.combat.start();
    this.mapUi.start();
    const firstStart = this.state === 'boot';
    this.state = 'running';
    if (!firstStart) return;
    if (this.cutscenes.current?.id === 'menu.feed') this.cutscenes.stop(false);
    this.bus.emit('game:started', { seed: this.seed });
    this.firstDay.begin(mode ?? 'new');
    // Session 21 (Aaron): after Skip intro the quad waits just outside the station's gate, to ride to the gas station.
    if (mode === 'skip') this.parkQuadAtStation();
  }

  // Just outside the gate, off the path, nose south (config.quad.skipParked: metres south of the gate and to its side).
  parkQuadAtStation() {
    const gate = this.station.layout.gate.mid;
    const c = this.station.layout.centre;
    const k = this.cfg.quad.skipParked;
    const len = Math.hypot(gate.x - c.x, gate.z - c.z) || 1;
    const ox = (gate.x - c.x) / len;
    const oz = (gate.z - c.z) / len;
    const x = gate.x + ox * k.out - oz * k.side;
    const z = gate.z + oz * k.out + ox * k.side;
    this.quad.place(x, z, Math.atan2(-ox, -oz));
  }

  onFullscreenChanged(fullscreen) {
    if (fullscreen || this.state !== 'running') return;
    if (!this.cfg.display.resumeScreenOnFullscreenExit) return;
    this.state = 'suspended';
    this.startScreen.show('resume');
  }

  loop(now) {
    this.rafId = requestAnimationFrame(this.loop);
    if (this.lastTime !== null && this.frameCap > 0) {
      const minFrameMs = MS_PER_SECOND / this.frameCap - this.cfg.loop.frameCapToleranceMs;
      if (now - this.lastTime < minFrameMs) return;
    }
    const dt = this.lastTime === null ? 0 : Math.min((now - this.lastTime) / MS_PER_SECOND, this.cfg.loop.maxFrameDt);
    this.lastTime = now;

    const t0 = performance.now();
    this.update(dt);
    const t1 = performance.now();
    // M8: a CCTV feed's low frame rate holds the last picture between its frames.
    if (!this.cutscenes.holdFrame(dt)) this.renderer.render(dt);
    const t2 = performance.now();
    this.overlay.recordFrame(dt, t1 - t0, t2 - t1);
    if (this.dynamicResolution.update(dt)) this.renderer.setScale(this.dynamicResolution.scale);
  }

  update(dt) {
    this.input.update(dt);
    if (this.state !== 'running') this.startScreen.update(this.input); // M9.2: the menu on the controller
    if (this.input.wasPressed('debugOverlay')) this.overlay.toggle();
    if (this.input.wasPressed('debugMenu')) this.debugMenu.toggle();

    const running = this.state === 'running';
    // The debug menu and the map screen stop the action. The map screen
    // pauses the clock too (Aaron, M4); the debug menu lets it run on.
    // The point-of-no-return pop-up (Session 9) holds the game until it's closed.
    // M8: a cutscene pauses the clock (Aaron) and, unless it's in the moment
    // (first person), holds the world still; A / Enter skips it.
    const cs = this.cutscenes;
    cs.update(dt, this.input, !this.debugMenu.isOpen);
    // Session 13: the model viewer holds the world and the clock still and
    // takes the controls. (Open at the start of the frame counts, so the
    // press that closes it doesn't also reach the game.)
    const viewer = this.viewer;
    const viewing = viewer.active;
    viewer.update(dt, this.input, !this.debugMenu.isOpen);
    // Session 20: the pause menu holds the world and the clock. Menu / Esc opens it
    // when nothing else is up (Esc closes the ledger, a paper or a card first).
    const pm = this.pauseMenu;
    const wasPaused = pm.isOpen;
    // Session 22: in Demo mode, Menu / Esc opens the demo panel instead (it holds the world the same way).
    const dp = this.demo.panel;
    const wasPanel = Boolean(dp?.isOpen);
    if (!wasPaused && !wasPanel && this.input.wasPressed('pause') && this.canPause()) {
      if (this.demo.active) dp.open(this.input.activeDevice);
      else pm.open(this.input.activeDevice);
      this.input.swallowHeld?.();
    }
    pm.update(this.input, !wasPaused);
    dp?.update(this.input, !wasPanel);
    // Session 25 (Aaron): the weapon cross: D-pad down (V / G on a keyboard) when there's nothing
    // waiting to watch (that comes first). It holds the world like the pause menu.
    const wx = this.weaponCross;
    const wasCross = wx.isOpen;
    const crossPress = this.input.wasPressed('weaponCross') || (this.input.wasPressed('watch') && this.watch.queue.length === 0);
    if (!wasCross && crossPress && this.canPause() && !pm.isOpen && !dp?.isOpen && !this.player.riding) {
      wx.open(this.input.activeDevice);
      this.input.swallowHeld?.();
    }
    wx.update(this.input, !wasCross);
    const held = viewing || viewer.active || wasPaused || pm.isOpen || wasPanel || Boolean(dp?.isOpen) || wasCross || wx.isOpen;
    // Session 16: a paper in close-up holds the game too (open at the start of the frame counts).
    const reading = this.paper.isOpen || this.card.isOpen || this.weaponCross.isOpen;
    this.paper.update(dt, this.input);
    this.card.update(dt, this.input); // Session 20: after the paper's (a card can open one)
    // Session 23: after the card's (the safe's rifle can come with one), and never over a cutscene.
    const noticeOpen = this.noReturn.update(dt, this.input, running && !this.debugMenu.isOpen && !this.mapUi.isOpen && !cs.active && !held) || reading || this.paper.isOpen || this.card.isOpen || this.weaponCross.isOpen;
    const playing = running && !this.debugMenu.isOpen && !this.mapUi.isOpen && !noticeOpen && !cs.freezesWorld && !held;
    // Session 19 (Aaron: the dead stood frozen in the shelter's sweep): a cutscene marked "unseen" lets the world
    // run on while it plays, but nothing notices Tom (detection.playerSenses).
    // Session 21 (Aaron: rode the quad into the shelter's horde as the sweep began and died in it): every
    // cutscene now: the dead keep moving, but none can notice or hurt Tom, and the quad brakes to a stop.
    this.combat.unseen = Boolean(cs.active);
    // Session 25 (Aaron: the shelter's dead came for the quad as its sweep played): no noise
    // carries while a cutscene plays, and as one starts the dead chasing Tom from afar forget him.
    const dead = this.combat.enemies;
    if (cs.active && !this.wasCutscene) dead.forgetPlayer(this.player.position, this.cfg.detection.cutsceneForgetBeyond ?? 10);
    dead.quiet = Boolean(cs.active);
    this.wasCutscene = Boolean(cs.active);
    this.combat.shielded = Boolean(cs.active);
    if (this.player.riding) {
      this.player.riding.halting = Boolean(cs.active);
      if (cs.active && cs.freezesWorld) this.player.riding.speed = 0; // held still: it doesn't drive on afterwards
    }
    const locked = this.station.ledger.isOpen;
    const controls = locked ? this.lockedInput : this.input;
    // Debug fast-forward (M6): the whole world (clock, zombies, marches,
    // the station) steps this many times a frame; you move and act in the
    // first step only. Drawn once.
    const steps = playing ? this.fastForward : 1;
    for (let i = 0; i < steps; i++) this.step(dt, running, playing, i === 0);
    // Session 15b (Aaron): Tom's gun hides in a cutscene (it floated in the
    // campsite's sweep). After the step, so one starting this frame hides it too.
    this.combat.viewModel.root.visible = !cs.active && !viewer.active && !this.player.riding;
    this.combat.viewModel.digging = Boolean(this.director.digging?.active || this.shelter.digging || this.church?.digging); // Session 15b: the dig's animation (Session 16: the shelter's hatch too)
    if (playing) {
      this.flashlight.platform = this.player.platform;
      const glare = this.combat.glareExtras(this.player.position);
      if (this.stairs.glareCircle) glare.push(this.stairs.glareCircle); // Session 33: Junie close in the beam dims it, as the dead do
      this.flashlight.update(dt, controls, this.player.camera, glare);
    } else if (viewer.active) {
      this.flashlight.update(dt, this.lockedInput, viewer.camera, []); // held from the viewer's camera
    }
    // M9.2: the sigils the family have seen go in (Night 1's) are on the map; the debug view shows all.
    const known = this.director.sigils.list.filter((s) => s.known);
    const sigilsOnMap = this.director.showOnMap ? this.director.sigils.list : known.length ? known : null;
    const enemies = this.combat.enemies;
    const tierColors = enemies.showTiers ? this.cfg.zombies.lod.tierColors : null;
    const witchOnMap = this.witch.showOnMap ? this.witch : null;
    this.mapUi.dark = noMapIn(this.cfg.maps.noneIn, this.interiors.id);
    this.mapUi.update(dt, controls, this.player, enemies.living, running && !this.debugMenu.isOpen && this.combat.alive && !locked && !cs.active && !held, sigilsOnMap, tierColors, witchOnMap);
    // M8: a cutscene draws from its own camera, at its own hour (the grade and sky).
    // Session 13: the model viewer draws from its own camera, at its light's hour.
    const camera = viewer.active ? viewer.camera : cs.ownCamera ? cs.camera : this.player.camera;
    const hour = viewer.active ? (viewer.hour ?? this.clock.hourOfDay) : (cs.hour ?? this.clock.hourOfDay);
    // Session 21: inside an interior its own light (not for a cutscene's or the viewer's own camera, out in the world).
    if (this.state === 'running') this.interiors.update(dt, this.clock);
    // Session 31: unless the cutscene's camera is in there with him (data "indoors": the mine's last scene).
    const indoors = this.interiors.inside && !viewer.active && (!cs.ownCamera || cs.current?.data.indoors) ? this.interiors.inside : null;
    this.sky.interior = indoors?.light ?? null;
    this.atmosphere.inside = Boolean(indoors);
    this.atmosphere.preUpdate(this.clock, this.sky);
    this.sky.update(dt, hour, camera);
    this.updateThermal();
    this.atmosphere.setViewport(this.renderer.canvas.height, camera.fov);
    this.atmosphere.update(dt, camera, this.sky, this.flashlight);
    this.renderer.postFX.setTime(hour, this.sky.blood); // Session 10: the colour grade
    const view = this.atmosphere.viewDistance(this.presetDrawDistance, this.sky.fog.far);
    if (view !== this.drawDistance) this.setViewDistance(view);
    this.world.update(dt, camera.position);
    this.hut.update(dt, camera.position, this.drawDistance);
    this.crashSite.update(camera.position, this.drawDistance);
    this.churchSite.update(camera.position, this.drawDistance);
    this.cuttingSite.update(camera.position, this.drawDistance);
    this.sawmillSite.update(camera.position, this.drawDistance);
    this.hollerSite.update(camera.position, this.drawDistance);
    this.mineSite.update(camera.position, this.drawDistance);
    this.stairsSite.update(camera.position, this.drawDistance);
    this.dozerCampSite.update(camera.position, this.drawDistance);
    this.ufoSite.update(camera.position, this.drawDistance);
    this.armorySite.update(camera.position, this.drawDistance);
    this.barnSite.update(camera.position, this.drawDistance);

    // M7 step 6: the run's clock, and the ending after she dies.
    if (playing && this.combat.alive) this.stats.seconds += dt;
    if (this.victoryTimer >= 0 && playing) {
      this.victoryTimer -= dt;
      if (this.victoryTimer < 0) {
        this.combat.victory();
        this.endRun('victory', 'THE WITCH IS DEAD', `You killed her on ${this.finalBattle.state === 'idle' ? 'the pathways' : 'the blood night'}, night ${this.clock.day}.`);
      }
    }
    this.runEnd.update(dt, this.input);
    this.debugMenu.update(dt);
    // Session 17 (Aaron): the radio holds while a linesAfter cutscene plays (the dogfight); the rest talk as they play.
    const csSpeaks = this.cutscenes.active && this.cutscenes.speaksDuring(this.cutscenes.current.data);
    if (!this.cutscenes.active || csSpeaks) this.subtitles.update(dt);
    document.body.classList.toggle('cs-quiet', this.cutscenes.active && !csSpeaks);
    // Session 17 (Aaron): the quad's engine is cut while a cutscene plays (the quad starts it again after).
    if (this.combat.sfx) {
      this.combat.sfx.engineMuted = this.cutscenes.active;
      if (this.cutscenes.active) this.combat.sfx.engine(false);
    }
    this.toast.update(dt);
    if (!this.cutscenes.active) this.hints.update(dt);
    this.alert.update(dt);
    this.demo.update(dt, running && !held && !this.debugMenu.isOpen && !this.mapUi.isOpen && this.combat.alive);
    if (this.state === 'running' && this.demo.active) this.mapUi.setObjective(null); // Session 22: no story to point at
    else if (this.state === 'running') {
      this.objectives.update(dt, !this.cutscenes.active && !this.mapUi.isOpen && !this.station.ledger.isOpen && !this.debugMenu.isOpen && !this.paper.isOpen && !this.card.isOpen && !this.weaponCross.isOpen && this.combat.alive);
      this.mapUi.setObjective(this.objectives.current);
    }
    this.watch.update(dt, this.input, this.state === 'running' && !this.pauseMenu.isOpen && !this.cutscenes.active && !this.mapUi.isOpen && !this.station.ledger.isOpen && !this.debugMenu.isOpen && !this.paper.isOpen && !this.card.isOpen && !this.weaponCross.isOpen && !this.noReturn.isOpen && this.combat.alive);
    this.radioStatus.update(this.comms.state, this.state === 'running' && !this.demo.active); // Session 26
    // Session 26: the Caller, never over a cutscene, a paper, a card or a menu.
    const worldUp = this.state === 'running' && !this.pauseMenu.isOpen && !this.cutscenes.active && !this.mapUi.isOpen && !this.station.ledger.isOpen && !this.debugMenu.isOpen && !this.paper.isOpen && !this.card.isOpen && !this.weaponCross.isOpen && !this.noReturn.isOpen;
    if (!this.demo.active) this.caller.update(worldUp ? dt : 0, worldUp && this.combat.alive);
    this.overlay.update(dt);
  }

  // One step of the world. first: the player's controls work (later
  // fast-forward steps have them locked).
  step(dt, running, playing, first) {
    const ledgerPause = this.station.ledger.isOpen && this.cfg.ledger.pausesClock;
    if (running && !this.mapUi.isOpen && !this.noReturn.isOpen && !this.paper.isOpen && !this.card.isOpen && !this.weaponCross.isOpen && !this.pauseMenu.isOpen && !ledgerPause) this.clock.update(dt);
    const daylight = daylightLevel(this.clock.phase, this.clock.phaseProgress);
    // The ledger takes the controls while it's open (the world carries on).
    const cinematic = this.finalBattle.cinematic || this.cutscenes.locksControls;
    const locked = this.station.ledger.isOpen || !first || cinematic;
    const input = first && !cinematic ? this.input : this.lockedInput;
    const controls = locked ? this.lockedInput : this.input;
    // Session 25: A closes the night's forecast (before the player reads it as a jump).
    if (first && !locked && !this.demo.active) this.nightWatch.handleDismiss(controls);
    if (first && playing && this.combat.alive) this.player.update(dt, controls);
    // Session 15b: on the quad bike the gun's slung (no firing, no charges, no digging), and the witch is faster.
    const riding = Boolean(this.player.riding);
    this.combat.update(dt, riding ? this.lockedInput : input, playing, daylight, locked || riding);
    this.director.update(dt, riding ? this.lockedInput : controls, playing, this.clock.phase, this.player.camera.position, daylight);
    this.witch.speedScale = riding ? (this.player.riding.qc?.witchSpeedScale ?? this.cfg.quad.witchSpeedScale) : 1;
    // Session 22: no witch in Demo mode (she stays in her hut, far off).
    if (!this.demo.active) this.witch.update(dt, playing, this.player.camera.position, first && !riding ? controls : this.lockedInput);
    this.explosives.update(dt, first && !riding ? controls : this.lockedInput, playing && first && !locked && !riding);
    this.dynamite.update(dt, first && !riding ? controls : this.lockedInput, playing && first && !locked && !riding);
    this.chainsaw.update(dt, first && !riding ? controls : this.lockedInput, playing && first && !locked && !riding); // Session 28
    this.combat.viewModel.saw = this.chainsaw.view;
    if (playing) this.finalBattle.update(dt, this.player.camera.position);
    // M8: the family (before the station, whose prompts wait while theirs shows).
    if (first) this.familyTalk.update(dt, controls, playing && this.combat.alive && !locked);
    this.dialogue.update(dt, playing);
    this.trailCams.update(dt, playing);
    this.station.update(dt, input, playing, this.clock.phase, this.player.camera.position, daylight);
    this.vehicles.update(dt, input, playing && !locked);
    if (!this.demo.active) this.nightWatch.update(dt, this.clock.phase, playing); // Session 22: the demo sends its own
    this.progress.update(dt, playing && first);
    this.gates.update(dt, playing && first && !locked);
    // M9.2: the campsite's search points wait while another prompt shows.
    const busy = this.director.hud.prompt || this.station.hud.prompt || this.vehicles.hud.prompt || this.familyTalk.hud.prompt || (this.player.riding && this.player.riding.hud?.prompt);
    const rideFree = !locked && !this.holler?.traps?.held && !(this.director.hud.prompt || this.station.hud.prompt || this.vehicles.hud.prompt || this.familyTalk.hud.prompt || this.campsite.hud.prompt || this.gasStation.hud.prompt || this.shelter.hud.prompt || this.outpost.hud.prompt || this.bigfootCave?.hud.prompt || this.bugZapper?.hud.prompt || this.mothership?.hud.prompt); // (build queue: a story prompt beside a parked vehicle comes first)
    this.quad.update(dt, controls, playing && first, rideFree && !(this.player.riding && this.player.riding !== this.quad) && !this.experimental.some((v) => v.hud.prompt), daylight);
    let offered = Boolean(this.quad.hud.prompt) && !this.player.riding;
    for (const v of this.experimental) {
      v.update(dt, controls, playing && first, rideFree && !offered, daylight);
      offered ||= Boolean(v.hud.prompt) && !v.riding;
    }
    this.campsite.update(dt, controls, playing && first, !locked && !busy);
    this.gasStation.update(dt, controls, playing && first, !locked && !busy);
    this.shelter.update(dt, controls, playing && first, !locked && !busy && !this.player.riding);
    this.outpost.update(dt, controls, playing && first, !locked && !busy && !this.player.riding);
    const story = first && !this.demo.active; // Session 22: Demo mode has no story
    if (story) this.firstDay.update(dt, playing);
    if (story) this.witchEscape.update(dt, playing && this.combat.alive);
    if (story) this.homeStop.update(dt, playing && this.combat.alive);
    if (first) this.roadNorth.update(dt, playing && this.combat.alive);
    if (first) this.flyer.update(dt, playing && this.combat.alive); // Session 22: the flyer spike
    if (first && !this.demo.active) this.deepForest.update(dt, playing && this.combat.alive); // Round 2: moths in the deep forest
    if (first && !this.demo.active) this.moths.update(dt, playing && this.combat.alive); // Session 25: the giant moths
    if (first) this.plane.update(dt, controls, playing && this.combat.alive, !locked && !this.player.riding); // Session 25: the crashed plane
    if (first) this.comms.update(); // Session 26: the radio's reach
    if (story) this.junieTaken.update(dt, controls, playing && this.combat.alive, !locked && !busy && !this.player.riding); // Session 26
    if (story) this.church.update(dt, controls, playing && this.combat.alive, !locked && !busy && !this.player.riding);
    if (story) this.stairs.update(dt, controls, playing && this.combat.alive, !locked && !busy && !this.player.riding);
    if (story) this.cordonDozer.update(dt, controls, playing && this.combat.alive, !locked && !busy);
    if (story) this.bugZapper.update(dt, controls, playing && this.combat.alive, !locked && !busy);
    if (story) this.bigfootCave.update(dt, controls, playing && this.combat.alive, !locked && !busy);
    if (story) this.megaNight.update(dt, playing && this.combat.alive);
    if (story) this.mothership.update(dt, controls, playing && this.combat.alive, !locked && !busy);
    if (story) this.carArmory.update(dt, controls, playing && this.combat.alive, !locked && !busy);
    if (story) this.uteChase.update(dt, controls, playing && this.combat.alive, !locked && !busy);
    if (story) this.milo.update(dt, controls, playing && this.combat.alive, !locked && !busy && !this.player.riding); // Milo's barn
    if (story) this.cutting.update(dt, controls, playing && this.combat.alive, !locked && !busy && !this.player.riding); // Session 27: the railway cutting
    if (story) this.sawmill.update(dt, controls, playing && this.combat.alive, !locked && !busy && !this.player.riding); // Session 28: the sawmill
    if (story) this.holler.update(dt, controls, playing && this.combat.alive, !locked && !busy && !this.player.riding); // Session 29: the moonshiners' holler
    if (story) this.mineshaft.update(dt, controls, playing && this.combat.alive, !locked && !busy && !this.player.riding); // Session 30: the abandoned mineshaft
  }

  get phase() {
    return this.clock.phase;
  }

  dispose() {
    cancelAnimationFrame(this.rafId);
    for (const off of this.unsubscribers ?? []) off();
    this.renderer.canvas.removeEventListener('click', this.onCanvasClick);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.startScreen.dispose();
    this.debugMenu.dispose();
    this.overlay.dispose();
    this.toast.dispose();
    this.mapUi.dispose();
    this.nightWatch.dispose();
    this.lore.dispose();
    this.firstDay.dispose();
    this.campsite.dispose();
    this.gasStation.dispose();
    this.shelter.dispose();
    this.outpost.dispose();
    this.quad.dispose();
    for (const v of this.experimental) v.dispose();
    this.clearing.dispose();
    this.vehicleHud.dispose();
    this.gates.dispose();
    this.progress.dispose();
    this.viewer.dispose();
    this.cutscenes.dispose();
    this.trailCams.dispose();
    this.familyTalk.dispose();
    this.dialogue.dispose();
    this.subtitles.dispose();
    this.vehicles.dispose();
    this.station.dispose();
    this.runEnd.dispose();
    this.noReturn.dispose();
    this.paper.dispose();
    this.card.dispose();
    this.weaponCross.dispose();
    this.pauseMenu.dispose();
    this.demo.dispose();
    this.flyer.dispose();
    this.moths.dispose();
    this.plane.dispose();
    this.junieTaken.dispose();
    this.church.dispose();
    this.churchSite.dispose();
    this.cuttingSite.dispose();
    this.sawmillSite.dispose();
    this.hollerSite.dispose();
    this.mineSite.dispose();
    this.stairs.dispose();
    this.milo.dispose();
    this.cutting.dispose();
    this.sawmill.dispose();
    this.holler.dispose();
    this.mineshaft.dispose();
    this.mineBeetles.dispose();
    this.stairsSite.dispose();
    this.dozerCampSite.dispose();
    this.ufoSite.dispose();
    this.armorySite.dispose();
    this.barnSite.dispose();
    this.radioStatus.dispose();
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.watch.dispose();
    this.finalBattle.dispose();
    this.explosives.dispose();
    this.dynamite.dispose();
    this.chainsaw.dispose();
    this.witch.dispose();
    this.hut.dispose();
    this.crashSite.dispose();
    this.director.dispose();
    this.combat.dispose();
    this.flashlight.dispose();
    this.world.dispose();
    this.atmosphere.dispose();
    this.sky.dispose();
    this.dynamicResolution.dispose();
    this.player.dispose();
    this.input.dispose();
    this.renderer.dispose();
    this.display.dispose();
    this.clock.dispose();
    this.rng.dispose();
    this.bus.dispose();
  }
}

// The ?seed= in the URL, or null.
function seedFromUrl(rngConfig) {
  const raw = new URLSearchParams(window.location.search).get(rngConfig.seedUrlParam);
  if (raw === null || raw === '') return null;
  const asNumber = Number(raw);
  return Number.isFinite(asNumber) ? asNumber : String(raw);
}

// "dawn after night 3" (or "day 3, dusk" for a debug save) for the Continue button.
function saveLabel(d, clockCfg) {
  const phase = clockCfg.phases[d.clock.phaseIndex]?.name ?? '';
  return phase === 'dawn' ? `dawn after night ${d.clock.day}` : `day ${d.clock.day}, ${phase}`;
}

// URL ?seed= beats config.rng.defaultSeed; otherwise roll a fresh seed.
// (Math.random is fine here: it only picks the seed, never gameplay.)
function resolveSeed(rngConfig) {
  const fromUrl = new URLSearchParams(window.location.search).get(rngConfig.seedUrlParam);
  const raw = fromUrl ?? rngConfig.defaultSeed;
  if (raw === null || raw === '') return Math.floor(Math.random() * rngConfig.randomSeedMax);
  const asNumber = Number(raw);
  return Number.isFinite(asNumber) ? asNumber : String(raw);
}

// Reload the page on a given map seed (debug).
function reloadWithSeed(seed) {
  const url = new URL(window.location.href);
  url.searchParams.set(defaultConfig.rng.seedUrlParam, seed);
  window.location.href = url.toString();
}

// The item after `current` in `list`, wrapping round.
function nextInList(list, current) {
  return list[(list.indexOf(current) + 1) % list.length];
}

function hasFinePointer() {
  return window.matchMedia('(pointer: fine)').matches;
}
