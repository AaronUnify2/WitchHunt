// The chainsaw's state, stepped (pure; Session 28; config.chainsaw;
// combat/Chainsaw.js runs it): how far it's spun up, how hot it is, how
// sharp the chain is, whether it's stalled.
//
// state: { rev 0..1, heat 0..1, sharp 0..1, stalled }.

export function newSaw(cfg, sharp = cfg.wear.foundAt) {
  return { rev: 0, heat: 0, sharp, stalled: false };
}

// One step. trigger: RT held with the saw in hand and ready. inHand: it's
// the weapon out. cutting: its last bite landed on something. Returns what
// happened this step: { stalled, restarted, biting } (biting: spun up, the
// chain will cut).
export function stepSaw(s, cfg, dt, { trigger = false, inHand = true, cutting = false } = {}) {
  const out = { stalled: false, restarted: false, biting: false };
  const running = trigger && !s.stalled;
  if (running) {
    s.rev = Math.min(1, s.rev + dt / cfg.spinUp);
    s.heat = Math.min(1, s.heat + (cutting ? cfg.heat.cut : cfg.heat.rev) * dt);
    if (cutting) s.sharp = Math.max(0, s.sharp - cfg.wear.cut * dt);
    if (s.heat >= 1) {
      s.stalled = true;
      s.rev = 0;
      out.stalled = true;
    }
  } else {
    s.rev = Math.max(0, s.rev - dt / cfg.spinDown);
    s.heat = Math.max(0, s.heat - (inHand ? cfg.heat.coolInHand : cfg.heat.cool) * dt);
    if (s.stalled && s.heat <= cfg.heat.restartAt) {
      s.stalled = false;
      out.restarted = true;
    }
  }
  out.biting = running && !s.stalled && s.rev >= 1;
  return out;
}

// How hard a chain this sharp cuts (a share of the full damage).
export function sharpScale(cfg, sharp) {
  return cfg.dullDamage + (1 - cfg.dullDamage) * Math.max(0, Math.min(1, sharp));
}

// One bite's damage and stagger.
export function biteOf(cfg, sharp) {
  const k = Math.max(0, Math.min(1, sharp));
  return { damage: cfg.damagePerSecond * cfg.tick * sharpScale(cfg, sharp), stagger: cfg.stagger * (cfg.dullStagger + (1 - cfg.dullStagger) * k) };
}

// Tom's speed with it running.
export function sawMove(cfg, s, cutting) {
  if (s.rev <= 0.15) return 1;
  return cutting ? cfg.cutMove : cfg.move;
}

// What a sharpening costs and whether it's worth doing: { needed, cost, can }.
export function sharpenOffer(bench, sharp, scrap) {
  const needed = sharp < bench.fullAt;
  return { needed, cost: bench.scrap, can: needed && scrap >= bench.scrap };
}

// The word for the edge (the HUD, the workbench).
export function edgeWord(sharp) {
  if (sharp >= 0.8) return 'sharp';
  if (sharp >= 0.5) return 'good';
  if (sharp >= 0.25) return 'worn';
  return 'dull';
}
