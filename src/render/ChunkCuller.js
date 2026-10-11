// Shows only the map pieces (forest chunks, ground chunks, rocks, cliff
// sections, signposts) within the draw distance, so a map of hundreds of
// meshes draws like a small scene. Pieces are filed in a grid by their
// centre; visibility is recomputed when the camera has moved a few metres
// or the draw distance changes, looking only at nearby grid cells.

export class ChunkCuller {
  constructor(cellSize, refreshDistance) {
    this.cellSize = cellSize;
    this.refreshDistance = refreshDistance;
    this.cells = new Map();
    this.maxRadius = 0;
    this.visible = [];
    this.lastX = Infinity;
    this.lastZ = Infinity;
    this.drawDistance = Infinity;
    this.dirty = true;
  }

  // object: anything with `visible`. (x, z, radius): a circle that covers it.
  add(object, x, z, radius) {
    const key = this.key(Math.floor(x / this.cellSize), Math.floor(z / this.cellSize));
    if (!this.cells.has(key)) this.cells.set(key, []);
    this.cells.get(key).push({ object, x, z, radius });
    this.maxRadius = Math.max(this.maxRadius, radius);
    object.visible = false;
    this.dirty = true;
  }

  key(cx, cz) {
    return `${cx},${cz}`;
  }

  setDrawDistance(distance) {
    this.drawDistance = distance;
    this.dirty = true;
  }

  update(x, z) {
    if (!this.dirty && Math.hypot(x - this.lastX, z - this.lastZ) < this.refreshDistance) return;
    this.dirty = false;
    this.lastX = x;
    this.lastZ = z;
    for (const item of this.visible) item.object.visible = false;
    this.visible.length = 0;
    // Pad by the refresh distance so nothing pops in before the next refresh.
    const reach = this.drawDistance + this.refreshDistance;
    const span = reach + this.maxRadius;
    const x0 = Math.floor((x - span) / this.cellSize);
    const x1 = Math.floor((x + span) / this.cellSize);
    const z0 = Math.floor((z - span) / this.cellSize);
    const z1 = Math.floor((z + span) / this.cellSize);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const cell = this.cells.get(this.key(cx, cz));
        if (!cell) continue;
        for (const item of cell) {
          if (Math.hypot(item.x - x, item.z - z) - item.radius > reach) continue;
          item.object.visible = true;
          this.visible.push(item);
        }
      }
    }
  }

  get visibleCount() {
    return this.visible.length;
  }

  get count() {
    let n = 0;
    for (const cell of this.cells.values()) n += cell.length;
    return n;
  }
}
