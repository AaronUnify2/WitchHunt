// Style pass 2 (Session 19): the shared kit for the places' props.
//
// Every place (the campsite, the gas station, the storm shelter, the
// outpost, the barricades at home) builds its props as plain geometries in
// world space, sorted by colour, and merges them. bakeParts() turns that
// sorted list into ONE geometry with its colours in the vertices (one draw
// call per group, whatever the number of colours), and weathers it as it
// goes, at no cost per frame:
//  - grime: darker and browner toward the ground (or the floor) it stands
//    on, as if splashed and soaked: the bottom `grimeHeight` metres;
//  - mottling: a soft 3D noise over everything, so a long wall or a row of
//    sandbags isn't one flat colour;
//  - each piece a little lighter or darker than its neighbours (planks,
//    bags, tins, boards);
//  - undersides darker (a cheap ambient occlusion);
//  - rust: streaky, running downward, on the colours a place names as
//    metal (look.weather.rust);
//  - the glare rule (Aaron, again and again: pale props glare under the
//    torch): no colour comes out brighter than `maxLuma` (sRGB luma),
//    except the few a place keeps bright on purpose (a glint of keys).
// The numbers: config.props.weather (shared), overridden per place by its
// look.weather.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// sRGB luma of a hex colour (0..1), as the glare rule measures it.
export function lumaOf(hex) {
  const r = ((hex >> 16) & 255) / 255;
  const g = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// A hex colour scaled down (if need be) so its luma is at most max.
export function capLuma(hex, max) {
  const l = lumaOf(hex);
  if (l <= max || l === 0) return hex;
  const k = max / l;
  const r = Math.round(((hex >> 16) & 255) * k);
  const g = Math.round(((hex >> 8) & 255) * k);
  const b = Math.round((hex & 255) * k);
  return (r << 16) | (g << 8) | b;
}

// The weather settings for a place: the shared ones with its own on top.
export function weatherFor(shared, own = {}) {
  return { ...shared, ...own };
}

// ---- noise -------------------------------------------------------------------------------------

function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

const fade = (t) => t * t * (3 - 2 * t);

// Smooth value noise in 3D, 0..1.
export function noise3(x, y, z) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = fade(x - xi);
  const yf = fade(y - yi);
  const zf = fade(z - zi);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
    l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  );
}

// ---- baking ------------------------------------------------------------------------------------

const tmp = new THREE.Color();
const grime = new THREE.Color();
const rust = new THREE.Color();

// parts: Map colour (hex) -> [geometry in world space, non-indexed].
// opts:
//  - weather: the settings (weatherFor()); null bakes flat colours;
//  - baseAt(x, y, z): the ground or floor under a point (grime runs up
//    from it); without it there's no grime;
//  - seed: varies the mottling between places.
// The geometries are disposed. Returns the merged geometry, or null.
export function bakeParts(parts, { weather = null, baseAt = null, seed = 0 } = {}) {
  const geos = [];
  const w = weather;
  const rustSet = new Set(w?.rust ?? []);
  const bright = new Set(w?.keepBright ?? []);
  if (w) {
    grime.setHex(w.grimeTint);
    rust.setHex(w.rustTint);
  }
  let piece = seed * 7919;
  for (const [hex, list] of parts) {
    const base = new THREE.Color(w && !bright.has(hex) ? capLuma(hex, w.maxLuma) : hex);
    const rusty = rustSet.has(hex);
    for (const g of list) {
      piece += 1;
      const pos = g.getAttribute('position');
      const nor = g.getAttribute('normal');
      const n = pos.count;
      const cols = new Float32Array(n * 3);
      // Each piece a touch lighter or darker than the next.
      const own = w ? 1 + (hash3(piece, seed, 11) * 2 - 1) * w.pieceJitter : 1;
      for (let i = 0; i < n; i++) {
        tmp.copy(base);
        if (w) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          const z = pos.getZ(i);
          const s = w.noiseScale;
          const m = noise3(x * s + seed, y * s, z * s);
          let k = own * (1 + (m * 2 - 1) * w.mottle);
          if (nor && nor.getY(i) < -0.5) k *= w.underside;
          if (rusty) {
            // Streaks: the noise stretched tall, so it runs down the metal.
            const r = noise3(x * w.rustScale + 31, y * w.rustScale * 0.22, z * w.rustScale + seed);
            const amt = Math.max(0, (r - (1 - w.rustAmount)) / w.rustAmount);
            tmp.lerp(rust, Math.min(1, amt) * 0.85);
          }
          if (baseAt) {
            const h = y - baseAt(x, y, z);
            if (h < w.grimeHeight) {
              const t = 1 - Math.max(0, h) / w.grimeHeight; // 1 at the base
              const t2 = t * t;
              tmp.lerp(grime, t2 * w.grimeTintAmount);
              k *= 1 - t2 * (1 - w.grime);
            }
          }
          tmp.multiplyScalar(k);
        }
        cols[i * 3] = tmp.r;
        cols[i * 3 + 1] = tmp.g;
        cols[i * 3 + 2] = tmp.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      geos.push(g);
    }
  }
  if (!geos.length) return null;
  const merged = mergeGeometries(geos);
  for (const g of geos) g.dispose();
  return merged;
}

// ---- small shapes shared by the places ---------------------------------------------------------------

// A box with a few height segments (so grime can climb a tall wall rather
// than run the whole height of it), non-indexed, uv-free.
export function segBox(w, h, d, hSeg = 1, wSeg = 1) {
  const g = new THREE.BoxGeometry(w, h, d, wSeg, hSeg, 1);
  const n = g.toNonIndexed();
  g.dispose();
  n.deleteAttribute('uv');
  return n;
}

// A sandbag (or any pillow-shaped thing): a box cut 2 x 1 x 2, its corners
// slumped down to the seam and pulled in, its top plumped; centred on the
// origin, indexed.
export function pillowGeometry(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d, 2, 1, 2);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const ex = Math.abs(p.getX(i)) > w * 0.49;
    const ez = Math.abs(p.getZ(i)) > d * 0.49;
    if (ex && ez) {
      p.setY(i, p.getY(i) * 0.35);
      p.setX(i, p.getX(i) * 0.92);
      p.setZ(i, p.getZ(i) * 0.9);
    } else if (ex || ez) {
      p.setY(i, p.getY(i) * 0.75);
    } else if (p.getY(i) > 0) p.setY(i, p.getY(i) * 1.12);
  }
  g.computeVertexNormals();
  return g;
}

// A sagging strip (a tarp, fabric, a wire run) from a to b (each a
// THREE.Vector3), w wide across, drooping by sag at its middle, seg
// segments. Lies flat (its width along `side`, a unit vector).
export function sagStrip(a, b, w, sag, seg, side) {
  const verts = [];
  const pt = (t, s) => {
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(Math.PI * t) * sag;
    return p.addScaledVector(side, s * w * 0.5);
  };
  for (let i = 0; i < seg; i++) {
    const t0 = i / seg;
    const t1 = (i + 1) / seg;
    const p00 = pt(t0, -1);
    const p01 = pt(t0, 1);
    const p10 = pt(t1, -1);
    const p11 = pt(t1, 1);
    verts.push(...p00.toArray(), ...p10.toArray(), ...p11.toArray(), ...p00.toArray(), ...p11.toArray(), ...p01.toArray());
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.computeVertexNormals();
  return g;
}
