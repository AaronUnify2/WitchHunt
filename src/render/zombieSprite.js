// The zombie sprite atlas, drawn on a canvas at load. Doom-style: 8 facing
// angles, 45 degrees apart (0 faces the viewer, 4 shows its back), one
// column per animation frame (see ZOMBIE_FRAMES in ai/Zombie.js). Angles
// 1-3 face image-right; 5-7 are their mirror images, so only rows 0-4 are
// stored (Session 13: the shader mirrors the rest, 37% less atlas). One
// block of 5 rows per variant and hairstyle (zombieLook.js atlasBlocks),
// the blocks laid out in a grid (atlasLayout).
//
// Session 13 (#144): a palette swap. The shirt, trousers, hair and skin
// are painted grey (shaded) in the picture, and a second texture, the
// mask, says how much of each texel is shirt (red), trousers (green), hair
// (blue) and skin (alpha). The renderer colours each zombie in with its
// own palette (ZombieRenderer). The forearm is in both the shirt and the
// skin: long sleeves or short, per zombie. The mouth's blood, the eyes and
// kit (the police vest and cap, the army helmet, the Men in Black's suit,
// tie and sunglasses) keep their own colours.
// The blood on the body is the renderer's, different on each zombie.
//
// The figure is drawn five times (the picture, then once per mask
// channel) with the same strokes, so what's in front hides what's behind
// in the mask exactly as in the picture.

import * as THREE from 'three';
import { ZOMBIE_FRAMES } from '../ai/Zombie.js';
import { atlasBlocks, atlasLayout } from './zombieLook.js';

export const ANGLES = 8;
export const ATLAS_ROWS = 5; // stored: angles 0-4

const CHANNELS = ['shirt', 'trousers', 'hair', 'skin']; // the mask's r, g, b, a

// Which mask channels each painted part belongs to.
const PART_CHANNELS = {
  shirt: ['shirt'],
  hem: ['shirt'],
  sleeve: ['shirt'], // the upper arm: always sleeved
  forearm: ['shirt', 'skin'], // sleeved or bare, per zombie
  trousers: ['trousers'],
  hair: ['hair'],
  skin: ['skin'],
};

function css(hex, alpha = 1) {
  return `rgba(${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255},${alpha})`;
}

// A fixed colour darkened (k < 1), for the arm behind the body.
function darken(hex, k) {
  return (Math.round(((hex >> 16) & 255) * k) << 16) | (Math.round(((hex >> 8) & 255) * k) << 8) | Math.round((hex & 255) * k);
}

function grey(level, alpha = 1) {
  const v = Math.round(255 * level);
  return `rgba(${v},${v},${v},${alpha})`;
}

// The atlas: { map (the picture), mask, blocks, layout }. Both textures
// share the layout, so one UV reads both.
export function makeZombieAtlas(cfg) {
  const t = cfg.texture;
  const blocks = atlasBlocks(t);
  const blockW = t.frameWidth * ZOMBIE_FRAMES.count;
  const blockH = t.frameHeight * ATLAS_ROWS;
  const layout = atlasLayout(blocks.length, blockW, blockH, t.atlasMaxSize);

  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // The mask, one channel at a time, written bottom row first (a
  // DataTexture's first row is the bottom, a canvas's the top).
  const maskData = new Uint8Array(layout.width * layout.height * 4);
  CHANNELS.forEach((channel, c) => {
    ctx.clearRect(0, 0, layout.width, layout.height);
    drawAll(ctx, t, blocks, layout, maskPaint(t, channel));
    const src = ctx.getImageData(0, 0, layout.width, layout.height).data;
    const w = layout.width;
    for (let y = 0; y < layout.height; y++) {
      const from = y * w * 4;
      const to = (layout.height - 1 - y) * w * 4;
      // White's share of the texel: its brightness times its coverage (antialiased edges).
      for (let x = 0; x < w; x++) maskData[to + x * 4 + c] = Math.round((src[from + x * 4] * src[from + x * 4 + 3]) / 255);
    }
  });
  const mask = new THREE.DataTexture(maskData, layout.width, layout.height, THREE.RGBAFormat);
  mask.magFilter = THREE.NearestFilter;
  mask.minFilter = THREE.LinearMipmapLinearFilter;
  mask.generateMipmaps = true;
  mask.needsUpdate = true;

  // The picture last, so the canvas keeps it.
  ctx.clearRect(0, 0, layout.width, layout.height);
  drawAll(ctx, t, blocks, layout, basePaint(t));
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  // Doom-style: crisp pixels up close, smooth mipmaps far away.
  map.magFilter = THREE.NearestFilter;
  map.needsUpdate = true;
  return { map, mask, blocks, layout };
}

// The picture: coloured-in parts in grey, the rest in their own colours.
function basePaint(t) {
  return {
    base: true,
    part(name, behind = false) {
      const tone = (behind ? t.tones.behind : 1) * (name === 'hem' ? t.tones.hem : 1);
      return grey(tone);
    },
    fixed(hex, alpha = 1) {
      return css(hex, alpha);
    },
  };
}

// One mask channel: white where a part belongs to it, black elsewhere
// (so a part in front hides the one behind, as in the picture).
function maskPaint(t, channel) {
  return {
    base: false,
    part(name) {
      return PART_CHANNELS[name].includes(channel) ? '#fff' : '#000';
    },
    fixed() {
      return '#000';
    },
  };
}

function drawAll(ctx, t, blocks, layout, paint) {
  const blockW = t.frameWidth * ZOMBIE_FRAMES.count;
  const blockH = t.frameHeight * ATLAS_ROWS;
  blocks.forEach((block, b) => {
    // A bare block is its variant without its hat (an army zombie that's lost its helmet).
    const kit = { ...(t.looks[block.variant] ?? {}), hair: block.hair };
    if (block.bare) kit.hat = undefined;
    const bx = (b % layout.cols) * blockW;
    const by = Math.floor(b / layout.cols) * blockH;
    for (let row = 0; row < ATLAS_ROWS; row++) {
      const angle = (row * Math.PI) / 4; // 0 front .. pi back
      for (let col = 0; col < ZOMBIE_FRAMES.count; col++) {
        ctx.save();
        ctx.translate(bx + col * t.frameWidth, by + row * t.frameHeight);
        ctx.beginPath();
        ctx.rect(0, 0, t.frameWidth, t.frameHeight);
        ctx.clip();
        drawFrame(ctx, t, kit, angle, col, paint);
        ctx.restore();
      }
    }
  });
}

// Pose for each frame column.
function poseFor(col) {
  const F = ZOMBIE_FRAMES;
  const walk = F.walk.indexOf(col);
  if (walk >= 0) return { stride: [1, 0, -1, 0][walk], bob: walk % 2, armUp: 0, lunge: 0, lean: 0, fall: 0 };
  if (col === F.attackWindup) return { stride: 0.4, bob: 0, armUp: 1, lunge: -2, lean: -2, fall: 0 };
  if (col === F.attackStrike) return { stride: -0.6, bob: 0, armUp: -0.6, lunge: 6, lean: 5, fall: 0 };
  if (col === F.stagger) return { stride: 0.2, bob: 1, armUp: 0.3, lunge: -4, lean: -6, fall: 0 };
  const dying = F.dying.indexOf(col);
  return { stride: 0, bob: 0, armUp: 0.2, lunge: 0, lean: -3, fall: (dying + 1) / F.dying.length };
}

function drawFrame(ctx, t, kit, angle, col, paint) {
  const pose = poseFor(col);
  const w = t.frameWidth;
  const h = t.frameHeight;
  ctx.save();
  if (pose.fall > 0) {
    // Topple sideways about the feet and crumple, shrinking to fit the
    // cell; the feet slide right so the body stays in frame. The last
    // frame lies flat on the ground.
    const ground = h - 2;
    const pivotX = w / 2 + pose.fall * w * 0.32;
    ctx.translate(pivotX, ground);
    ctx.rotate(-pose.fall * Math.PI * 0.5);
    const fit = 1 - pose.fall * 0.38;
    ctx.scale(fit, fit);
    ctx.translate(-w / 2, -ground);
  }
  drawFigure(ctx, t, kit, angle, pose, w, h, paint);
  ctx.restore();
}

// A point on the quadratic curve a -> b (control c) at k.
function quadAt(a, c, b, k) {
  const u = 1 - k;
  return { x: u * u * a.x + 2 * u * k * c.x + k * k * b.x, y: u * u * a.y + 2 * u * k * c.y + k * k * b.y };
}

// The figure: legs, arms, torso and head, seen from `angle` (0 = from
// the front, pi/2 = from its left so it faces image-right, pi = from behind).
// kit: the variant's look (vest, hat) and this block's hairstyle.
function drawFigure(ctx, t, kit, angle, pose, w, h, paint) {
  const side = Math.sin(angle); // 1 = full profile, facing image-right
  const front = Math.cos(angle); // 1 = facing the viewer, -1 = back
  const fromBehind = front < -0.2;
  const cx = w / 2 + pose.lean * side * 0.5;
  const ground = h - 2;
  const hipY = ground - 56 + pose.bob;
  const shoulderY = hipY - 38;
  const headY = shoulderY - 11;
  const hunch = 5 * side + pose.lunge * side; // head and shoulders forward
  const torsoHalf = 15 * Math.abs(front) + 8 * Math.abs(side);
  const hx = cx + hunch + pose.lean * side * 0.3; // the head's centre
  const hy = headY + Math.abs(pose.lunge) * 0.3;

  const legs = () => {
    ctx.fillStyle = paint.part('trousers');
    for (const s of [-1, 1]) {
      const swing = pose.stride * s * 9 * side;
      const lift = pose.stride * s * 4 * Math.abs(front);
      const x = cx + s * 5 * Math.abs(front) + swing * 0.5;
      ctx.beginPath();
      ctx.moveTo(x - 4, hipY);
      ctx.lineTo(x + 4, hipY);
      ctx.lineTo(x + 3 + swing, ground - Math.max(0, lift));
      ctx.lineTo(x - 4 + swing, ground - Math.max(0, lift));
      ctx.closePath();
      ctx.fill();
    }
  };

  // Each arm: the sleeved upper half, the forearm (sleeved or bare, per
  // zombie) and the hand.
  const arms = (behind) => {
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    for (const s of [-1, 1]) {
      // Shoulder; in profile the far arm sits behind the body.
      const far = side > 0.3 ? s < 0 : side < -0.3 ? s > 0 : false;
      if (behind !== (far || front < -0.2)) continue;
      const sx = cx + hunch * 0.6 + s * torsoHalf * 0.85 * Math.max(Math.abs(front), 0.25);
      const sy = shoulderY + 3;
      const reach = 34 * side + pose.lunge * side; // arms held out in front
      // Seen from the front the arms reach toward the viewer: hands in
      // front of the chest, foreshortened.
      const handX = sx + reach - s * 5 * Math.max(0, front) * (1 - pose.armUp * 0.5);
      const handY = sy + 6 + 6 * Math.max(0, front) - pose.armUp * 26 + (s > 0 ? 2 : -2) * pose.stride;
      const a = { x: sx, y: sy };
      const c = { x: (sx + handX) / 2, y: (sy + handY) / 2 + 4 };
      const b = { x: handX, y: handY };
      const elbow = quadAt(a, c, b, 0.5);
      // The halves of the curve: control points halfway along each leg.
      ctx.strokeStyle = paint.part('sleeve', behind);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo((a.x + c.x) / 2, (a.y + c.y) / 2, elbow.x, elbow.y);
      ctx.stroke();
      ctx.strokeStyle = paint.part('forearm', behind);
      ctx.beginPath();
      ctx.moveTo(elbow.x, elbow.y);
      ctx.quadraticCurveTo((c.x + b.x) / 2, (c.y + b.y) / 2, b.x, b.y);
      ctx.stroke();
      // Hand
      ctx.fillStyle = paint.part('skin', behind);
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3 + Math.max(0, front) * 1.2, 0, Math.PI * 2);
      ctx.fill();
      // Men in Black: the suit's sleeve over it, the white cuff showing at the wrist.
      if (kit.jacket !== undefined) {
        ctx.strokeStyle = paint.fixed(behind ? darken(kit.jacket, t.tones.behind) : kit.jacket);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        for (let k = 0.1; k < 0.83; k += 0.1) {
          const q = quadAt(a, c, b, k);
          ctx.lineTo(q.x, q.y);
        }
        ctx.stroke();
      }
    }
  };

  const torso = () => {
    const top = shoulderY;
    const lean = hunch;
    ctx.fillStyle = paint.part('shirt');
    ctx.beginPath();
    ctx.moveTo(cx - torsoHalf + lean, top);
    ctx.lineTo(cx + torsoHalf + lean, top);
    ctx.lineTo(cx + torsoHalf * 0.75, hipY + 4);
    ctx.lineTo(cx - torsoHalf * 0.75, hipY + 4);
    ctx.closePath();
    ctx.fill();
    // The torn hem, painted over the shirt only.
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = paint.part('hem');
    ctx.fillRect(cx - torsoHalf, hipY - 6, torsoHalf * 2, 10);
    ctx.restore();
    if (kit.jacket !== undefined) suit(top, lean);
    // Army: webbing, two straps down from the shoulders to a belt.
    if (kit.webbing !== undefined) {
      ctx.strokeStyle = paint.fixed(kit.webbing);
      ctx.lineWidth = 3;
      ctx.lineCap = 'butt';
      const wTop = top + 2;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + s * torsoHalf * 0.55 + lean, wTop);
        ctx.lineTo(cx + s * torsoHalf * 0.3 + lean * 0.3, hipY - 2);
        ctx.stroke();
      }
      ctx.fillStyle = paint.fixed(kit.webbing);
      ctx.fillRect(cx - torsoHalf * 0.78, hipY - 3, torsoHalf * 1.56, 4); // the belt
    }
    // Police: a bulletproof vest over the chest.
    if (kit.vest !== undefined) {
      const vTop = top + 3;
      const vBottom = hipY - 6;
      const vHalf = torsoHalf * 0.82;
      ctx.fillStyle = paint.fixed(kit.vest);
      ctx.beginPath();
      ctx.moveTo(cx - vHalf + lean, vTop);
      ctx.lineTo(cx + vHalf + lean, vTop);
      ctx.lineTo(cx + vHalf * 0.8 + lean * 0.3, vBottom);
      ctx.lineTo(cx - vHalf * 0.8 + lean * 0.3, vBottom);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = paint.fixed(kit.vest, 0.6);
      ctx.fillRect(cx - vHalf * 0.8 + lean * 0.5, (vTop + vBottom) / 2, vHalf * 1.6, 2); // a strap
    }
  };

  // Men in Black: the black suit jacket over the white shirt (the shirt's
  // part, so its blood shows), hanging open down the front: the shirt and
  // tie at the collar, the body armour's plate in the gap below. From
  // behind, a rip across the back shows the shirt.
  const suit = (top, lean) => {
    const bottom = hipY + 4;
    const centre = (y) => cx + lean * (1 - (y - top) / (bottom - top));
    const half = (y) => torsoHalf * (1 - 0.25 * ((y - top) / (bottom - top)));
    ctx.fillStyle = paint.fixed(kit.jacket);
    ctx.beginPath();
    ctx.moveTo(cx - torsoHalf + lean, top);
    ctx.lineTo(cx + torsoHalf + lean, top);
    ctx.lineTo(cx + torsoHalf * 0.75, bottom);
    ctx.lineTo(cx - torsoHalf * 0.75, bottom);
    ctx.closePath();
    ctx.fill();
    if (fromBehind) {
      const rx = centre(top + 13) - 3;
      const ry = top + 13;
      ctx.fillStyle = paint.part('shirt');
      ctx.beginPath();
      [[-8, -5], [-4, -4], [-1, -2], [3, -1], [7, 2], [8, 4], [4, 3], [1, 2], [-3, 0], [-6, -1], [-9, -3]].forEach(([x, y], i) => (i ? ctx.lineTo(rx + x, ry + y) : ctx.moveTo(rx + x, ry + y)));
      ctx.closePath();
      ctx.fill();
      return;
    }
    // The opening: centred down the front, round toward its front edge in profile.
    const ox = (y) => centre(y) + side * 0.55 * half(y);
    const vw = 2 + 6 * Math.max(0, front);
    const vBottom = top + 22;
    ctx.fillStyle = paint.fixed(kit.plate);
    ctx.beginPath();
    ctx.moveTo(ox(top + 12) - vw * 0.7, top + 12);
    ctx.lineTo(ox(top + 12) + vw * 0.7, top + 12);
    ctx.lineTo(ox(bottom - 2) + vw * 0.6, bottom - 2);
    ctx.lineTo(ox(bottom - 2) - vw * 0.6, bottom - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = paint.part('shirt');
    ctx.beginPath();
    ctx.moveTo(ox(top) - vw, top);
    ctx.lineTo(ox(top) + vw, top);
    ctx.lineTo(ox(vBottom), vBottom);
    ctx.closePath();
    ctx.fill();
    // The tie: a knot at the collar, then down into the plate.
    const tx = ox(top) + side * 0.5;
    ctx.fillStyle = paint.fixed(kit.tie);
    ctx.fillRect(Math.round(tx - 1.5), top, 3, 3);
    ctx.beginPath();
    ctx.moveTo(tx - 1, top + 3);
    ctx.lineTo(tx + 1, top + 3);
    ctx.lineTo(ox(top + 17) + 1.6, top + 16);
    ctx.lineTo(ox(top + 18), top + 18);
    ctx.lineTo(ox(top + 17) - 1.6, top + 16);
    ctx.closePath();
    ctx.fill();
  };

  // Hair that hangs behind the head (long hair, a ponytail): behind the
  // body from the front and in profile, over the back from behind.
  const hangingHair = () => {
    ctx.fillStyle = paint.part('hair');
    if (kit.hair === 'long') {
      const bottom = shoulderY + 12;
      if (fromBehind) {
        ctx.beginPath();
        ctx.ellipse(hx, hy, 8, 8.5, 0, Math.PI, Math.PI * 2);
        ctx.lineTo(hx + 8, bottom - 3);
        ctx.quadraticCurveTo(hx, bottom + 3, hx - 8, bottom - 3);
        ctx.closePath();
        ctx.fill();
      } else {
        // A curtain behind the head, showing past it at the sides.
        const back = -side * 3;
        const half = 8.5 - Math.abs(side) * 2;
        ctx.beginPath();
        ctx.moveTo(hx + back - half, hy - 4);
        ctx.lineTo(hx + back + half, hy - 4);
        ctx.lineTo(hx + back + half + 1, bottom - 6 + Math.abs(side) * 4);
        ctx.lineTo(hx + back - half - 1, bottom - 6 + Math.abs(side) * 4);
        ctx.closePath();
        ctx.fill();
      }
    } else if (kit.hair === 'ponytail') {
      // Tied at the back of the head, hanging to the shoulders.
      const tx = hx - side * 6;
      const ty = hy - 1;
      ctx.beginPath();
      if (fromBehind || Math.abs(side) < 0.3) {
        ctx.ellipse(tx, ty + 9, 3, 9, 0, 0, Math.PI * 2);
      } else {
        ctx.moveTo(tx, ty - 2);
        ctx.quadraticCurveTo(tx - side * 6, ty + 2, tx - side * 5, ty + 16);
        ctx.lineTo(tx - side * 2, ty + 16);
        ctx.quadraticCurveTo(tx - side * 2, ty + 4, tx, ty + 3);
        ctx.closePath();
      }
      ctx.fill();
    }
  };

  const head = () => {
    ctx.fillStyle = paint.part('skin');
    ctx.beginPath();
    ctx.ellipse(hx, hy, 7 - 1.5 * Math.abs(side), 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hair on the head: a cap on top (the whole back of the head from
    // behind); balding, only round the sides and back.
    ctx.fillStyle = paint.part('hair');
    ctx.beginPath();
    if (kit.hair === 'balding') {
      if (fromBehind) ctx.ellipse(hx, hy + 1, 7, 6.5, 0, -0.15, Math.PI + 0.15);
      else {
        for (const s of [-1, 1]) {
          if (s * side > 0.5) continue; // the far side is hidden by the head
          ctx.ellipse(hx + s * (5.5 - Math.abs(side) * 2) - side * 2, hy - 0.5, 2, 3.5, 0, 0, Math.PI * 2);
        }
      }
    } else if (fromBehind) {
      ctx.ellipse(hx, hy, 7, 8, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(hx - side * 2, hy - 4, 7, 4.5, 0, Math.PI, Math.PI * 2);
    }
    ctx.fill();
    // Long hair: locks down past the cheeks, seen from the front.
    if (kit.hair === 'long' && !fromBehind) {
      for (const s of [-1, 1]) {
        if (s * side > 0.5) continue;
        const x = hx + s * (6 - Math.abs(side) * 2) - side * 2.5;
        ctx.beginPath();
        ctx.moveTo(x - 2, hy - 5);
        ctx.lineTo(x + 2, hy - 5);
        ctx.lineTo(x + 1.5 + s, hy + 9);
        ctx.lineTo(x - 2 + s, hy + 9);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (!fromBehind) {
      // Pale eyes and a dark open mouth, sliding round with the angle.
      const ex = hx + side * 3.5;
      const spread = 3 * Math.max(0, front);
      if (kit.shades !== undefined) {
        // Men in Black: sunglasses, and their arm back to the ear in profile.
        ctx.fillStyle = paint.fixed(kit.shades);
        const left = Math.round(ex - spread - 2);
        const right = Math.round(ex + (spread > 0.5 ? spread + 2 : 1.5));
        ctx.fillRect(left, Math.round(hy - 3), right - left, 3);
        if (Math.abs(side) > 0.3) {
          const ear = hx - side * 3;
          ctx.fillRect(Math.round(Math.min(ex, ear)), Math.round(hy - 3), Math.round(Math.abs(ex - ear)), 1);
        }
      } else {
        ctx.fillStyle = paint.fixed(t.eyes);
        ctx.fillRect(Math.round(ex - spread - 1), Math.round(hy - 2), 2, 2);
        if (spread > 0.5) ctx.fillRect(Math.round(ex + spread - 1), Math.round(hy - 2), 2, 2);
      }
      ctx.fillStyle = paint.fixed(t.blood);
      ctx.fillRect(Math.round(ex - 2), Math.round(hy + 3), 4, 2);
    }
    // Police cap or army helmet.
    if (kit.hat === 'cap') {
      ctx.fillStyle = paint.fixed(kit.hatColor);
      ctx.beginPath();
      ctx.ellipse(hx - side, hy - 5, 7.5, 4, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(hx - 7.5 - side, hy - 6, 15, 2);
      if (!fromBehind) ctx.fillRect(Math.round(hx + side * 6 - 4), hy - 5, 8 + Math.abs(side) * 3, 2); // the peak
    } else if (kit.hat === 'helmet') {
      ctx.fillStyle = paint.fixed(kit.hatColor);
      ctx.beginPath();
      ctx.ellipse(hx - side, hy - 3, 9, 7.5, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(hx - 9.5 - side, hy - 4, 19, 2); // the rim
    }
  };

  if (!fromBehind) hangingHair();
  arms(true);
  legs();
  torso();
  if (fromBehind) hangingHair();
  head();
  arms(false);

  // Simple lighting: lit from the upper left (moonlight), as the trees
  // are. The picture only: the mask says what a texel is, not how lit.
  if (!paint.base) return;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const shade = ctx.createLinearGradient(0, 0, w, 0);
  shade.addColorStop(0, 'rgba(255,255,255,0.08)');
  shade.addColorStop(0.5, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
