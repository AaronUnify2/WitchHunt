// Owns the fog of war, the minimap and the full-screen map, and the
// images they share. Game calls update() every frame. The map screen
// opens and closes with the 'map' action (D-pad up / M); B also closes it.
// Emits 'map:opened' and 'map:closed'.

import { FogOfWar } from '../world/FogOfWar.js';
import { drawMapImage, makeFogCanvas } from './mapImage.js';
import { Minimap } from './Minimap.js';
import { MapScreen } from './MapScreen.js';

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
    };
    this.minimap = new Minimap(this.cfg.minimap);
    this.minimap.init(root, shared);
    this.screen = new MapScreen(this.cfg.mapScreen);
    this.screen.init(root, shared);
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
  update(dt, input, player, enemies, canToggle, sigils = null) {
    if (canToggle && (input.wasPressed('map') || (this.screen.isOpen && input.wasPressed('menuBack')))) {
      this.screen.toggle();
      this.minimap.show(!this.screen.isOpen);
      this.bus.emit(this.screen.isOpen ? 'map:opened' : 'map:closed');
    }
    this.fog.update(player.position.x, player.position.z);
    this.minimap.update(dt, player, enemies, sigils);
    this.screen.update(dt, player, enemies, `seen ${Math.round(this.fog.revealedFraction * 100)}%`, sigils);
  }

  // ---- debug tools ----------------------------------------------------------

  addDebugItems(menu) {
    menu.addItem('Reveal whole map', () => this.fog.revealAll());
    menu.addItem(
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
