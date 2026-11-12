// Owns the fog of war, the minimap and the full-screen map, and the
// images they share. Game calls update() every frame. The map screen
// opens and closes with the 'map' action (D-pad up / M); B also closes it.
// Emits 'map:opened' and 'map:closed'.

import { FogOfWar } from '../world/FogOfWar.js';
import { drawMapImage, makeFogCanvas } from './mapImage.js';
import { Minimap } from './Minimap.js';
import { MapScreen } from './MapScreen.js';
import { DEBUG } from '../debug/DebugMenu.js';

// Session 33 (Aaron: the maps kept showing the forest in the place beyond; "black it out"; the mine too):
// the words for "no map here" inside interior `id`, or null where the maps work. noneIn: config.maps.noneIn.
export function noMapIn(noneIn, id) {
  return (id && noneIn?.[id]) || null;
}

export class MapUi {
  constructor(cfg, world, bus) {
    this.cfg = cfg;
    this.world = world;
    this.bus = bus;
  }

  init(root) {
    const { world } = this;
    const geo = world.ground.geo;
    this.fog = new FogOfWar(this.cfg.fogOfWar, geo);
    const shared = {
      ground: world.ground,
      map: world.map,
      fog: this.fog,
      mapCanvas: drawMapImage(world.ground, world.map, world.typeColors),
      fogCanvas: makeFogCanvas(this.fog),
      nameOf: (c) => world.clearingName(c),
      sigilMarker: this.cfg.sigilMarker,
      witchMarker: this.cfg.witchMarker,
    };
    this.shared = shared; // the experimental dozer repaints mapCanvas where it carves
    this.minimap = new Minimap(this.cfg.minimap);
    this.minimap.init(root, shared);
    this.screen = new MapScreen(this.cfg.mapScreen);
    this.screen.init(root, shared);
  }

  // Vehicles (M5 part 2) show on both maps once seen up close.
  // Session 21 (Aaron): off by default (style.show false): they cluttered the map.
  setVehicles(list, style) {
    for (const view of [this.minimap, this.screen]) {
      view.vehicles = style?.show === false ? null : list;
      view.vehicleStyle = style;
    }
  }

  // M8: the trail cameras show on both maps (the family's network, so
  // always known). now(): game seconds, for the leads' blinking.
  setTrailCams(list, style, now) {
    for (const view of [this.minimap, this.screen]) {
      view.trailCams = list;
      view.trailCamStyle = style;
      view.trailCamTime = now;
    }
  }

  // Session 16: what to do next ({ text, at } or null), on both maps.
  setObjective(o) {
    this.minimap.objective = o;
    this.screen.objective = o;
  }

  // Session 16: the quad bike on both maps (its x, z, heading, riding).
  setQuad(quad) {
    this.minimap.quad = quad;
    this.screen.quad = quad;
  }

  get isOpen() {
    return this.screen.isOpen;
  }

  // Called when the game starts: the HUD's minimap appears.
  start() {
    this.minimap.show(true);
  }

  // canToggle: false while the debug menu is open or the game isn't running.
  // sigils: drawn on both maps when given (debug only; normally the player
  // has to find them).
  // tierColors (M6 debug): colour zombie dots by simulation tier and show
  // them all, fog or not; null for the normal red dots.
  // witch (M7 debug): { x, z, state } drawn on both maps, or null.
  update(dt, input, player, enemies, canToggle, sigils = null, tierColors = null, witch = null) {
    // Session 33: this.dark (set by Game each frame: noMapIn) blacks the minimap out, refuses the full map
    // with its words, and stops the fog of war lifting from the forest far overhead.
    const dark = this.dark ?? null;
    this.minimap.dark = Boolean(dark);
    if (dark && !this.screen.isOpen) {
      if (canToggle && input.wasPressed('map')) this.bus.emit('map:refused', { text: dark });
    } else if (canToggle && (input.wasPressed('map') || (this.screen.isOpen && input.wasPressed('menuBack')))) {
      this.screen.toggle();
      this.minimap.show(!this.screen.isOpen);
      this.bus.emit(this.screen.isOpen ? 'map:opened' : 'map:closed');
    }
    if (!dark) this.fog.update(player.position.x, player.position.z);
    this.minimap.update(dt, player, enemies, sigils, tierColors, witch);
    this.screen.update(dt, player, enemies, `seen ${Math.round(this.fog.revealedFraction * 100)}%`, sigils, tierColors, witch);
  }

  // ---- debug tools ----------------------------------------------------------

  addDebugItems(menu) {
    const map = menu.category(DEBUG.teleport);
    map.addItem('Map: reveal it all', () => this.fog.revealAll());
    map.addItem(
      () => `Map screen: ${this.screen.showGraph ? 'whole graph (debug)' : 'fog of war'}`,
      () => (this.screen.showGraph = !this.screen.showGraph),
    );
  }

  overlayLine() {
    return `seen ${(this.fog.revealedFraction * 100).toFixed(1)}%`;
  }

  dispose() {
    this.screen.dispose();
    this.minimap.dispose();
  }
}
