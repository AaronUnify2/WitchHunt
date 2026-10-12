// Tiling value-noise textures, made in code (Session 10). Each channel is
// its own seeded noise, so one texture read gives the shader several
// independent patterns (cheaper than computing noise per pixel).

import * as THREE from 'three';

// A tiling value-noise function on a size x size grid with `cells` cells
// across: f(x, y) in 0..1 for pixel coordinates.
export function valueNoise(size, cells, rng) {
  const g = new Float32Array(cells * cells);
  for (let i = 0; i < g.length; i++) g[i] = rng.next();
  const at = (i, j) => g[((j % cells) + cells) % cells * cells + (((i % cells) + cells) % cells)];
  return (x, y) => {
    const fx = (x / size) * cells;
    const fy = (y / size) * cells;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return top + (bottom - top) * sy;
  };
}

// channels: one entry per channel (1 to 4), each a list of octaves
// [{ cells, weight }]. Returns a repeating, linearly filtered DataTexture.
export function makeNoiseTexture(size, channels, rng) {
  const formats = [THREE.RedFormat, THREE.RGFormat, null, THREE.RGBAFormat];
  const stride = channels.length === 3 ? 4 : channels.length; // no RGB format: pad to RGBA
  const data = new Uint8Array(size * size * stride);
  channels.forEach((octaves, c) => {
    const fns = octaves.map((o) => ({ f: valueNoise(size, o.cells, rng), w: o.weight }));
    const total = octaves.reduce((sum, o) => sum + o.weight, 0);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let v = 0;
        for (const { f, w } of fns) v += f(x, y) * w;
        data[(y * size + x) * stride + c] = Math.round((v / total) * 255);
      }
    }
  });
  if (stride === 4 && channels.length === 3) for (let i = 3; i < data.length; i += 4) data[i] = 255;
  const texture = new THREE.DataTexture(data, size, size, formats[stride - 1], THREE.UnsignedByteType);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}
