// Placeholder zombie sprite atlas, drawn on a canvas at load (the art pass
// replaces it with sprites pre-rendered from lit 3D models). Doom-style:
// one row per facing angle (8 rows, 45 degrees apart: row 0 faces the
// viewer, row 4 shows its back), one column per animation frame (see
// ZOMBIE_FRAMES in ai/Zombie.js). Rows 1-3 face image-right; rows 5-7 are
// their mirror images.

import * as THREE from 'three';
import { ZOMBIE_FRAMES } from '../ai/Zombie.js';

const ROWS = 8;

function css(hex, alpha = 1) {
  return `rgba(${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255},${alpha})`;
}

export function makeZombieAtlas(cfg, rng) {
  const t = cfg.texture;
  const canvas = document.createElement('canvas');
  canvas.width = t.frameWidth * ZOMBIE_FRAMES.count;
  canvas.height = t.frameHeight * ROWS;
  const ctx = canvas.getContext('2d');
  // The same blood spatter on every frame, so it doesn't flicker.
  const spots = Array.from({ length: t.bloodSpots }, () => ({
    x: rng.range(-1, 1),
    y: rng.range(0, 1),
    r: rng.range(1, 3.5),
  }));
  for (let row = 0; row < ROWS; row++) {
    const mirror = row > 4;
    const angle = ((mirror ? ROWS - row : row) * Math.PI) / 4; // 0 front .. pi back
    for (let col = 0; col < ZOMBIE_FRAMES.count; col++) {
      ctx.save();
      ctx.translate(col * t.frameWidth, row * t.frameHeight);
      ctx.beginPath();
      ctx.rect(0, 0, t.frameWidth, t.frameHeight);
      ctx.clip();
      if (mirror) {
        ctx.translate(t.frameWidth, 0);
        ctx.scale(-1, 1);
      }
      drawFrame(ctx, t, angle, col, spots);
      ctx.restore();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Doom-style: crisp pixels up close, smooth mipmaps far away.
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
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

function drawFrame(ctx, t, angle, col, spots) {
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
  drawFigure(ctx, t, angle, pose, spots, w, h);
  ctx.restore();
}

// The figure: legs, arms, torso and head, seen from `angle` (0 = from
// the front, pi/2 = from its left so it faces image-right, pi = from behind).
function drawFigure(ctx, t, angle, pose, spots, w, h) {
  const side = Math.sin(angle); // 1 = full profile, facing image-right
  const front = Math.cos(angle); // 1 = facing the viewer, -1 = back
  const cx = w / 2 + pose.lean * side * 0.5;
  const ground = h - 2;
  const hipY = ground - 56 + pose.bob;
  const shoulderY = hipY - 38;
  const headY = shoulderY - 11;
  const hunch = 5 * side + pose.lunge * side; // head and shoulders forward
  const torsoHalf = 15 * Math.abs(front) + 8 * Math.abs(side);

  const legs = () => {
    ctx.fillStyle = css(t.trousers);
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

  const arms = (behind) => {
    ctx.strokeStyle = css(behind ? t.skinDark : t.skin);
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
      const hx = sx + reach - s * 5 * Math.max(0, front) * (1 - pose.armUp * 0.5);
      const hy = sy + 6 + 6 * Math.max(0, front) - pose.armUp * 26 + (s > 0 ? 2 : -2) * pose.stride;
      const ex = (sx + hx) / 2;
      const ey = (sy + hy) / 2 + 4;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(ex, ey, hx, hy);
      ctx.stroke();
      // Hand
      ctx.fillStyle = css(behind ? t.skinDark : t.skin);
      ctx.beginPath();
      ctx.arc(hx, hy, 3 + Math.max(0, front) * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const torso = () => {
    const top = shoulderY;
    const lean = hunch;
    ctx.fillStyle = css(t.shirt);
    ctx.beginPath();
    ctx.moveTo(cx - torsoHalf + lean, top);
    ctx.lineTo(cx + torsoHalf + lean, top);
    ctx.lineTo(cx + torsoHalf * 0.75, hipY + 4);
    ctx.lineTo(cx - torsoHalf * 0.75, hipY + 4);
    ctx.closePath();
    ctx.fill();
    // Torn hem and blood, painted over the shirt only.
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = css(t.shirtAlt, 0.6);
    ctx.fillRect(cx - torsoHalf, hipY - 6, torsoHalf * 2, 10);
    ctx.fillStyle = css(t.blood, 0.85);
    for (const sp of spots) {
      ctx.beginPath();
      ctx.arc(cx + sp.x * torsoHalf + lean * (1 - sp.y), top + sp.y * (hipY - top), sp.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const head = () => {
    const hx = cx + hunch + pose.lean * side * 0.3;
    const hy = headY + Math.abs(pose.lunge) * 0.3;
    ctx.fillStyle = css(t.skin);
    ctx.beginPath();
    ctx.ellipse(hx, hy, 7 - 1.5 * Math.abs(side), 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hair: a cap on top, the whole back of the head from behind.
    ctx.fillStyle = css(t.hair);
    ctx.beginPath();
    if (front < -0.2) ctx.ellipse(hx, hy, 7, 8, 0, 0, Math.PI * 2);
    else ctx.ellipse(hx - side * 2, hy - 4, 7, 4.5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    if (front > -0.2) {
      // Pale eyes and a dark open mouth, sliding round with the angle.
      ctx.fillStyle = css(t.eyes);
      const ex = hx + side * 3.5;
      const spread = 3 * Math.max(0, front);
      ctx.fillRect(Math.round(ex - spread - 1), Math.round(hy - 2), 2, 2);
      if (spread > 0.5) ctx.fillRect(Math.round(ex + spread - 1), Math.round(hy - 2), 2, 2);
      ctx.fillStyle = css(t.blood);
      ctx.fillRect(Math.round(ex - 2), Math.round(hy + 3), 4, 2);
    }
  };

  arms(true);
  legs();
  torso();
  head();
  arms(false);

  // Simple lighting: lit from the upper left (moonlight), as the trees are.
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
