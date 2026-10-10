// Uniform grid of static circles (tree trunks, rocks) for fast
// "what's near me?" collision queries.

export class SpatialGrid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.maxRadius = 0;
  }

  key(cx, cz) {
    return `${cx},${cz}`;
  }

  // circle: { x, z, r }
  insert(circle) {
    const k = this.key(Math.floor(circle.x / this.cellSize), Math.floor(circle.z / this.cellSize));
    if (!this.cells.has(k)) this.cells.set(k, []);
    this.cells.get(k).push(circle);
    this.maxRadius = Math.max(this.maxRadius, circle.r);
  }

  // Circles that could overlap a circle at (x, z) with radius r.
  // Fills and returns `out` so callers can reuse one array per frame.
  query(x, z, r, out = []) {
    out.length = 0;
    const reach = r + this.maxRadius;
    const x0 = Math.floor((x - reach) / this.cellSize);
    const x1 = Math.floor((x + reach) / this.cellSize);
    const z0 = Math.floor((z - reach) / this.cellSize);
    const z1 = Math.floor((z + reach) / this.cellSize);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const cell = this.cells.get(this.key(cx, cz));
        if (cell) for (const c of cell) out.push(c);
      }
    }
    return out;
  }

  clear() {
    this.cells.clear();
    this.maxRadius = 0;
  }
}
