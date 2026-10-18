// The model viewer's catalogue (Session 13): every character model the
// debug model viewer can show, in every pose. Each entry builds its own
// copy of the model with the game's own renderer, so what you see is what
// the game draws, lit by the same world.
//
// An entry: { id, name, note, height(cfg, variant) (metres, for framing),
// startDistance(cfg, variant) (optional: metres out the camera starts, or
// null for the usual), variants: [names] or null, poses: [{ id, name }],
// create(ctx) }.
// ctx: { scene, cfg, rng (the game's), station }.
// create returns { objects: [Object3D] (for the triangle count),
// update(dt, s), setThermal(on, t), dispose(), reroll() (optional: new
// random looks) }, where s is
// { x, y, z (the feet), facing (radians; the model faces +z at 0), pose
// (an id), poseTime (seconds since the pose was picked, slowed or paused
// with the viewer), variant (an index), camera }. dt is the viewer's
// (0 while paused).
//
// New models add an entry here as they're built, so they can be judged
// in the viewer before they go into the game.

import * as THREE from 'three';
import { ZombieRenderer } from '../render/ZombieRenderer.js';
import { MutantRenderer } from '../render/MutantRenderer.js';
import { WitchRenderer } from '../render/WitchRenderer.js';
import { FamilyRenderer } from '../render/FamilyRenderer.js';
import { ZOMBIE_FRAMES } from '../ai/Zombie.js';
import { hash01 } from '../render/zombieLook.js';
import { buildActor } from '../story/Cutscenes.js';
import { loopTime } from './viewerOrbit.js';

const title = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const VIEWER_MODELS = [
  {
    id: 'zombie',
    name: 'Zombie',
    note: 'Sprites drawn in code, each coloured in with its own look (#144). Menu / R: new looks.',
    height: (cfg) => cfg.zombies.height,
    // The crowd is seen from further out.
    startDistance: (cfg, variant) => (variant >= cfg.zombies.texture.variantOrder.length ? cfg.modelViewer.crowd.distance : null),
    variants: (cfg) => [...cfg.zombies.texture.variantOrder.map(title), `Crowd of ${cfg.modelViewer.crowd.size * cfg.modelViewer.crowd.size}`],
    poses: [
      { id: 'walk', name: 'Walk' },
      { id: 'idle', name: 'Stand' },
      { id: 'attack', name: 'Attack (wind-up and strike)' },
      { id: 'hit', name: 'Hit (flash and stagger)' },
      { id: 'stagger', name: 'Stagger' },
      { id: 'rise', name: 'Rise from the ground' },
      { id: 'dying', name: 'Dying' },
      { id: 'corpse', name: 'Corpse' },
    ],
    create: zombieModel,
  },
  {
    id: 'mutant',
    name: 'Mutant',
    note: 'A skinned giant built in code (Session 13): one draw call each. The weak spot is the glowing sac on its back.',
    height: (cfg) => cfg.mutant.height,
    variants: null,
    poses: [
      { id: 'walk', name: 'Walk' },
      { id: 'charge', name: 'Charge' },
      { id: 'idle', name: 'Stand' },
      { id: 'attack', name: 'Attack (wind-up and slam)' },
      { id: 'hit', name: 'Hit (flash)' },
      { id: 'stagger', name: 'Stagger' },
      { id: 'rise', name: 'Rise from the ground' },
      { id: 'dying', name: 'Dying' },
      { id: 'corpse', name: 'Corpse' },
      { id: 'dormant', name: 'Dormant (the gas station)' },
      { id: 'wake', name: 'Waking (unfolds to full height)' },
    ],
    create: mutantModel,
  },
  {
    id: 'witch',
    name: 'The witch',
    note: 'Still only a silhouette (Session 13: rags that flutter, wide sleeves, claws, hair, a gnarled crown).',
    height: (cfg) => cfg.witch.look.height,
    variants: null,
    poses: [
      { id: 'still', name: 'Hovering still' },
      { id: 'glide', name: 'Gliding' },
      { id: 'flee', name: 'Fleeing' },
      { id: 'plant', name: 'Planting (contorted, the ritual)' },
      { id: 'ready', name: 'Facing you, claws out' },
      { id: 'hex', name: 'Throwing a hex' },
      { id: 'swipe', name: 'Swipe' },
      { id: 'summon', name: 'Summoning' },
      { id: 'flinch', name: 'Hit (flinch)' },
      { id: 'rising', name: 'Rising from the wreck' },
      { id: 'dying', name: 'Dying (writhing, then bursting apart)' },
    ],
    create: witchModel,
  },
  {
    id: 'family',
    name: 'The family',
    note: 'Built in code (Session 13, #148): one draw call each. Their heads turn to look at you.',
    height: () => 1.7,
    variants: () => ['Ellen', 'Wyatt', 'Junie', 'All three'],
    poses: [
      { id: 'stand', name: 'Stand (their own idle; they look at you)' },
      { id: 'talk', name: 'Talking (the bob)' },
      { id: 'walk', name: 'Walk (cutscenes)' },
      { id: 'kneel', name: 'Kneel (cutscenes)' },
      { id: 'down', name: 'Down (cutscenes)' },
    ],
    create: familyModel,
  },
  {
    id: 'standIns',
    name: 'Cutscene stand-ins',
    note: "Cutscenes' box figures (M8). Each is swapped for its real model.",
    height: (cfg, variant) => Object.values(cfg.cutscenes.figures)[variant]?.height ?? 1.8,
    variants: (cfg) => Object.keys(cfg.cutscenes.figures).map(title),
    poses: [
      { id: 'stand', name: 'Stand' },
      { id: 'kneel', name: 'Kneel' },
      { id: 'down', name: 'Down (fallen)' },
    ],
    create: standInModel,
  },
];

// The variant names for an entry (it may have none: []).
export function variantNames(entry, cfg) {
  return entry.variants ? entry.variants(cfg) : [];
}

// ---- the zombie: its own copy of the billboard renderer ------------------------------------------

// One zombie of each variant, or a crowd (config.modelViewer.crowd) of
// mixed looks to judge the variety by. Every look is re-rolled with
// "new look" (the viewer's reroll).
function zombieModel(ctx) {
  const zc = ctx.cfg.zombies;
  const vc = ctx.cfg.modelViewer;
  const crowd = vc.crowd;
  const order = zc.texture.variantOrder;
  const renderer = new ZombieRenderer(zc);
  renderer.init(ctx.scene, crowd.size * crowd.size);
  const F = ZOMBIE_FRAMES;
  const zombies = Array.from({ length: crowd.size * crowd.size }, (_, i) => ({ active: true, kind: 'zombie', tier: 'active', x: 0, y: 0, z: 0, sink: 0, frame: 0, facing: 0, flash: 0, lit: 0, variant: 'citizen', lookSeed: i + 1, offset: hash01(i, 1) }));
  let seedBase = 1;
  let walked = 0;
  // A crowd member's variant, by the crowd's mix.
  const crowdVariant = (i) => {
    let u = hash01(seedBase + i, 2);
    for (const v of order) {
      u -= crowd.mix[v] ?? 0;
      if (u < 0) return v;
    }
    return order[0];
  };
  return {
    objects: [renderer.mesh],
    renderer, // for debugging its uniforms
    update(dt, s) {
      const isCrowd = s.variant >= order.length;
      const shown = isCrowd ? zombies : zombies.slice(0, 1);
      walked += dt * vc.zombieWalkSpeed;
      const half = (crowd.size - 1) / 2;
      const cos = Math.cos(s.facing);
      const sin = Math.sin(s.facing);
      shown.forEach((z, i) => {
        // A grid round the spot, turned with the model's facing.
        const gx = isCrowd ? ((i % crowd.size) - half) * crowd.spacing : 0;
        const gz = isCrowd ? (Math.floor(i / crowd.size) - half) * crowd.spacing : 0;
        z.x = s.x + gx * cos + gz * sin;
        z.z = s.z - gx * sin + gz * cos;
        z.y = s.y;
        z.facing = s.facing + (isCrowd ? (z.offset - 0.5) * crowd.turn : 0);
        z.variant = isCrowd ? crowdVariant(i) : order[s.variant];
        z.lookSeed = seedBase + i;
        poseZombie(z, s.pose, s.poseTime + (isCrowd ? z.offset * 2 : 0), walked + (isCrowd ? z.offset : 0), zc, vc, F);
      });
      renderer.update(shown, s.camera.position, Infinity);
    },
    reroll() {
      seedBase += zombies.length;
    },
    setThermal: (on, t) => renderer.setThermal(on, t),
    dispose: () => renderer.dispose(),
  };
}

// One zombie's frame and sink for a pose, t seconds in, `walked` metres along.
function poseZombie(z, pose, t, walked, zc, vc, F) {
  z.sink = 0;
  z.flash = 0;
  switch (pose) {
    case 'walk':
      z.frame = F.walk[Math.floor(walked * zc.walkFrameRate * F.walk.length) % F.walk.length];
      break;
    case 'attack': {
      const k = loopTime(t, zc.attackWindup + zc.attackRecover);
      z.frame = k < zc.attackWindup ? F.attackWindup : F.attackStrike;
      break;
    }
    case 'hit': {
      const k = loopTime(t, vc.hitLoopSeconds);
      z.flash = Math.max(0, zc.hitFlashSeconds - k);
      z.frame = k < vc.staggerSeconds ? F.stagger : F.walk[0];
      break;
    }
    case 'stagger':
      z.frame = F.stagger;
      break;
    case 'rise': {
      const k = loopTime(t, zc.riseSeconds + vc.holdSeconds);
      z.sink = Math.max(0, 1 - k / zc.riseSeconds);
      z.frame = F.walk[0];
      break;
    }
    case 'dying': {
      const k = loopTime(t, zc.deathSeconds + vc.holdSeconds);
      z.frame = F.dying[Math.min(F.dying.length - 1, Math.floor((k / zc.deathSeconds) * F.dying.length))];
      break;
    }
    case 'corpse':
      z.frame = F.corpse;
      break;
    default:
      z.frame = F.walk[0];
      break;
  }
}

// ---- the mutant: its own copy of the instanced renderer ---------------------------------------

function mutantModel(ctx) {
  const mc = ctx.cfg.mutant;
  const zc = ctx.cfg.zombies;
  const vc = ctx.cfg.modelViewer;
  const renderer = new MutantRenderer(mc, zc);
  renderer.init(ctx.scene);
  const z = { active: true, kind: 'mutant', tier: 'active', state: 'walk', x: 0, y: 0, z: 0, facing: 0, walked: 0, charging: false, struck: false, timer: 0, attackWindup: mc.attackWindup, sink: 0, height: mc.height, flash: 0 };
  return {
    objects: renderer.meshes,
    update(dt, s) {
      Object.assign(z, { x: s.x, y: s.y, z: s.z, facing: s.facing, sink: 0, flash: 0, charging: false, struck: false, timer: 0 });
      const t = s.poseTime;
      switch (s.pose) {
        case 'walk':
        case 'charge':
          z.state = 'walk';
          z.charging = s.pose === 'charge';
          z.walked += dt * vc.zombieWalkSpeed * (z.charging ? 2 : 1);
          break;
        case 'attack':
          z.state = 'attack';
          z.timer = loopTime(t, mc.attackWindup + mc.attackRecover);
          z.struck = z.timer >= mc.attackWindup;
          break;
        case 'hit':
          z.state = 'idle';
          z.flash = Math.max(0, zc.hitFlashSeconds - loopTime(t, vc.hitLoopSeconds));
          break;
        case 'stagger':
          z.state = 'stagger';
          break;
        case 'dormant':
          z.state = 'dormant';
          break;
        case 'wake':
          z.state = 'wake';
          z.timer = Math.min(mc.look.wakeSeconds, loopTime(t, mc.look.wakeSeconds + vc.holdSeconds * 2));
          break;
        case 'rise': {
          const k = loopTime(t, zc.riseSeconds + vc.holdSeconds);
          z.state = 'rise';
          z.sink = Math.max(0, 1 - k / zc.riseSeconds);
          break;
        }
        case 'dying':
          z.state = 'dying';
          z.timer = Math.min(zc.deathSeconds, loopTime(t, zc.deathSeconds + vc.holdSeconds));
          break;
        case 'corpse':
          z.state = 'corpse';
          break;
        default:
          z.state = 'idle';
          break;
      }
      renderer.update([z], dt);
    },
    setThermal: (on, t) => renderer.setThermal(on, t),
    dispose: () => renderer.dispose(),
  };
}

// ---- the witch: her own copy of the jointed figure ---------------------------------------------

function witchModel(ctx) {
  const wc = ctx.cfg.witch;
  const vc = ctx.cfg.modelViewer;
  // The same fork as the witch's, so she's built the same.
  const renderer = new WitchRenderer(wc.look, ctx.rng.fork('witch').fork('witch-look'));
  renderer.init(ctx.scene);
  const w = { x: 0, y: 0, z: 0, facing: 0, state: 'roaming', tier: 'near', moved: 0, action: null, actionProgress: 0, struck: false, flinch: 0, wc, deathTimer: 0, spot: null, plantProgress: 0, riseProgress: 1 };
  let thermal = null;
  let lastDeath = 0;
  return {
    objects: [renderer.root],
    update(dt, s) {
      Object.assign(w, { x: s.x, y: s.y, z: s.z, facing: s.facing, moved: 0, action: null, actionProgress: 0, struck: false, flinch: 0, riseProgress: 1 });
      const t = s.poseTime;
      switch (s.pose) {
        case 'glide':
          w.state = 'roaming';
          w.moved = wc.look.glide.fullSpeed * vc.witchGlideShare * dt;
          break;
        case 'flee':
          w.state = 'fleeing';
          break;
        case 'plant':
          w.state = 'planting';
          w.plantProgress = loopTime(t, vc.witch.plantSeconds) / vc.witch.plantSeconds;
          break;
        case 'ready':
          w.state = 'attacking';
          break;
        case 'hex':
          w.state = 'attacking';
          w.action = 'hex';
          w.actionProgress = loopTime(t, vc.witch.hexSeconds) / vc.witch.hexSeconds;
          break;
        case 'swipe': {
          const up = vc.witch.swipeUpSeconds;
          const k = loopTime(t, up + vc.witch.swipeDownSeconds);
          w.state = 'attacking';
          w.action = 'swipe';
          w.struck = k >= up;
          w.actionProgress = w.struck ? (k - up) / vc.witch.swipeDownSeconds : k / up;
          break;
        }
        case 'summon':
          w.state = 'attacking';
          w.action = 'summon';
          w.actionProgress = loopTime(t, vc.witch.summonSeconds) / vc.witch.summonSeconds;
          break;
        case 'flinch':
          w.state = 'attacking';
          w.flinch = Math.max(0, wc.flinchSeconds - loopTime(t, vc.hitLoopSeconds));
          break;
        case 'rising':
          w.state = 'rising';
          w.riseProgress = Math.min(1, loopTime(t, vc.witch.riseSeconds + vc.holdSeconds) / vc.witch.riseSeconds);
          break;
        case 'dying': {
          w.state = 'dead';
          w.deathTimer = loopTime(t, wc.deathSeconds + vc.holdSeconds);
          // Each time round, the burst starts again.
          if (w.deathTimer < lastDeath) {
            renderer.burstAge = -1;
            renderer.shards.count = 0;
          }
          lastDeath = w.deathTimer;
          break;
        }
        default:
          w.state = 'roaming';
          break;
      }
      renderer.update(w, dt, s.camera.position, Infinity);
      // Through the heat scope her glow fades up close, as in the game.
      if (thermal) {
        const p = s.camera.position;
        const d = Math.hypot(w.x - p.x, w.z - p.z);
        const k = Math.max(0, Math.min(1, (d - thermal.nearMetres) / (thermal.farMetres - thermal.nearMetres)));
        renderer.setThermal(true, thermal.witchNearGlow + (1 - thermal.witchNearGlow) * k * k * (3 - 2 * k));
      }
    },
    setThermal(on, t) {
      thermal = on ? t : null;
      if (!on) renderer.setThermal(false);
    },
    dispose: () => renderer.dispose(),
  };
}

// ---- the family: their own copy of the family's figures ------------------------------------

function familyModel(ctx) {
  const fc = ctx.cfg.familyTalk;
  const group = new THREE.Group();
  ctx.scene.add(group);
  const renderer = new FamilyRenderer(ctx.cfg.family, ctx.cfg.story.family);
  renderer.init(group, ctx.cfg.story.family.map(() => ({ x: 0, z: 0 })), 0, 0);
  const figures = renderer.meshes;
  return {
    objects: [group],
    update(dt, s) {
      group.position.set(s.x, s.y, s.z);
      group.rotation.y = s.facing;
      const all = s.variant >= figures.length;
      const gap = ctx.cfg.modelViewer.familyGap;
      const pose = s.pose === 'talk' ? 'stand' : s.pose;
      figures.forEach((f, i) => {
        f.visible = all || i === s.variant;
        f.position.x = all ? (i - 1) * gap : 0;
        f.position.y = s.pose === 'talk' ? Math.abs(Math.sin(s.poseTime * fc.bobRate)) * fc.bobHeight : 0;
        renderer.setPose(i, pose);
        // Their facing, for turning their heads: the group's.
        renderer.people[i].facing = s.facing;
      });
      renderer.update(dt, s.camera.position);
    },
    setThermal: (on, t) => renderer.setThermal(on, t),
    dispose: () => {
      renderer.dispose();
      group.removeFromParent();
    },
  };
}

// ---- the cutscene stand-ins: the box figures cutscenes are built from ---------------------

function standInModel(ctx) {
  const looks = Object.keys(ctx.cfg.cutscenes.figures);
  let mesh = null;
  let built = -1;
  const holder = new THREE.Group();
  ctx.scene.add(holder);
  const free = () => {
    if (!mesh) return;
    mesh.removeFromParent();
    mesh.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
    mesh = null;
  };
  return {
    objects: [holder],
    update(dt, s) {
      if (built !== s.variant) {
        free();
        mesh = buildActor({ kind: 'figure', look: looks[s.variant] }, ctx.cfg.cutscenes);
        holder.add(mesh);
        built = s.variant;
      }
      holder.position.set(s.x, s.y, s.z);
      holder.rotation.y = s.facing;
      mesh.scale.y = s.pose === 'kneel' ? 0.6 : 1;
      mesh.rotation.x = s.pose === 'down' ? -(Math.PI / 2) * 0.95 : 0;
    },
    setThermal() {},
    dispose: () => {
      free();
      holder.removeFromParent();
    },
  };
}
