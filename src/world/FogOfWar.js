// Fog of war (pure): a low-resolution grid over the map of which areas
// have been seen. Cells are revealed by walking near them (reveal radius)
// or by a reveal from somewhere else (the station's lookout tower, M5).
// The minimap and map screen draw only revealed areas. The grid is plain
// bytes so it saves easily (M6).

export class FogOfWar {
  // bounds: { xMin, xMax, zMin, zMax } in metres.
  constructor(fogConfig, bounds) {
    this.cfg = fogConfig;
    this.bounds = bounds;
    this.cellSize = fogConfig.cellSize;
    this.nx = Math.ceil((bounds.xMax - bounds.xMin) / this.cellSize);
    this.nz = Math.ceil((bounds.zMax - bounds.zMin) / this.cellSize);
    this.cells = new Uint8Array(this.nx * this.nz);
    this.revealedCount = 0;
    this.version = 0; // goes up whenever a cell is revealed (UI redraws on change)
    this.lastX = Infinity;
    this.lastZ = Infinity;
  }

  // Follow the player: reveal round them once they've moved revealStep.
  update(x, z) {
    if (Math.hypot(x - this.lastX, z - this.lastZ) < this.cfg.revealStep) return false;
    this.lastX = x;
    this.lastZ = z;
    return this.reveal(x, z, this.cfg.revealRadius);
  }

  // Reveal every cell whose centre is within `radius` of (x, z). Returns
  // true if anything new was revealed.
  reveal(x, z, radius) {
    const s = this.cellSize;
    const i0 = Math.max(0, Math.floor((x - radius - this.bounds.xMin) / s));
    const i1 = Math.min(this.nx - 1, Math.floor((x + radius - this.bounds.xMin) / s));
    const j0 = Math.max(0, Math.floor((z - radius - this.bounds.zMin) / s));
    const j1 = Math.min(this.nz - 1, Math.floor((z + radius - this.bounds.zMin) / s));
    let changed = false;
    for (let j = j0; j <= j1; j++) {
      const cz = this.bounds.zMin + (j + 0.5) * s;
      for (let i = i0; i <= i1; i++) {
        const idx = j * this.nx + i;
        if (this.cells[idx]) continue;
        const cx = this.bounds.xMin + (i + 0.5) * s;
        if (Math.hypot(cx - x, cz - z) > radius) continue;
        this.cells[idx] = 1;
        this.revealedCount++;
        changed = true;
      }
    }
    if (changed) this.version++;
    return changed;
  }

  revealAll() {
    this.cells.fill(1);
    this.revealedCount = this.cells.length;
    this.version++;
  }

  isRevealed(x, z) {
    const i = Math.floor((x - this.bounds.xMin) / this.cellSize);
    const j = Math.floor((z - this.bounds.zMin) / this.cellSize);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return false;
    return this.cells[j * this.nx + i] === 1;
  }

  // Fraction of the map seen (0..1).
  get revealedFraction() {
    return this.revealedCount / this.cells.length;
  }

  // For saving (M6).
  toBytes() {
    return this.cells.slice();
  }

  fromBytes(bytes) {
    if (bytes.length !== this.cells.length) return false;
    this.cells.set(bytes);
    this.revealedCount = this.cells.reduce((sum, v) => sum + v, 0);
    this.version++;
    return true;
  }
}
