// A headless bot that plays the story from New Game by following the objective marker (Round 2, Nov 13).
// It holds X at whatever the objective's spot offers, picks on inspect cards, watches what's queued, skips
// cutscenes and lines, and kills anything near (god mode): it checks that the story's steps hand on to each
// other with real interactions, not that the fights are fair. It can't do the crashed plane's stand-off, so
// it stops there. It found three real faults the day it was written (see tests/round2.test.js, "found by the
// bot play-through").
//
// Not part of the build or the tests: it needs Playwright (not a dependency of this project; any install
// with a Chromium will do) and a dev server.
//   npx vite --port 5199 --strictPort &
//   node tools/playbot.cjs [seed] [until] [max sim minutes]
// until: a story flag (default planeDone), or step:<objective id> to stop 20 s into that step
// (step:plane is the end of the rebuilt first third). WITCHHUNT_URL: the server (default localhost:5199).
// DUMP='<js expression>': evaluated in the page at the end and printed.
// It prints each objective as it changes ("<sim seconds>s -> id | text [day phase]"); stuck on one step for
// 420 sim seconds, it stops and prints where it was.
const { chromium } = require('playwright');
(async () => {
  const [seed = '1234', until = 'planeDone', maxMin = '70'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 640, height: 400 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0, 300)); });
  await p.goto((process.env.WITCHHUNT_URL ?? 'http://localhost:5199') + '/?seed=' + seed); await p.waitForFunction(() => window.game, null, { timeout: 60000 });
  await p.evaluate(() => {
    const g = window.game; cancelAnimationFrame(g.rafId); g.loop = () => {}; document.removeEventListener('pointerlockchange', g.onPointerLockChange); g.startScreen?.activate?.('new');
    g.renderer.render = () => {}; // no drawing: the bot only steps the game
    const B = (window.bot = { t: 0, log: [], last: null, since: 0, hold: false, press: new Set(), toasts: [], lines: [], kills: 0, hops: 0 });
    const inp = g.input; const isDown = inp.isDown.bind(inp); const was = inp.wasPressed.bind(inp);
    inp.isDown = (a) => (a === 'interact' ? B.hold : isDown(a));
    inp.wasPressed = (a) => (B.press.has(a) ? true : was(a));
    const show = g.toast.show.bind(g.toast); g.toast.show = (t, ...r) => { B.toasts.push(Math.round(B.t) + 's ' + String(t).slice(0, 90)); return show(t, ...r); };
    const deliver = g.dialogue.deliver.bind(g.dialogue); g.dialogue.deliver = (line, ...a) => { B.lines.push(line.id); return deliver(line, ...a); };
    g.combat.godMode = true;
  });
  const maxT = Number(maxMin) * 60;
  let done = false; let report = null;
  while (!done) {
    report = await p.evaluate(({ until, maxT }) => {
      const g = window.game; const B = window.bot; const DT = 1 / 20;
      const P = g.player; const E = g.combat.enemies;
      const skipPrompt = /ask |Ellen's board|ledger|weapon cross|gun rack|first aid|ride|get on|get off|file the chain|sharpen|climb the (lookout )?tower|climb up/i;
      const say = (s) => B.log.push(Math.round(B.t) + 's ' + s);
      const tick = () => {
        // housekeeping
        if (g.cutscenes.active) g.cutscenes.stop(true);
        if (g.subtitles.busy) g.subtitles.advance();
        if (g.paper?.isOpen) g.paper.close();
        if (g.card?.isOpen) { const h = g.card.handlers ?? {}; g.card.choose(h.watch ? 'watch' : h.read ? 'read' : h.take ? 'take' : 'keep', g.input); }
        g.nightWatch?.closeForecast?.();
        B.press.clear();
        if (g.watch.queue.length) B.press.add('watch');
        const o = g.objectives.current; const id = o.id;
        if (id !== B.last) { say('-> ' + id + ' | ' + (o.text ?? '').slice(0, 70) + ' [day ' + g.clock.day + ' ' + g.clock.phase + ']'); B.last = id; B.since = 0; B.wiggle = 0; }
        B.since += 5 * DT;
        // kill what's near
        const px = P.position.x, pz = P.position.z;
        for (const z of [...E.living]) { if (!z.alive) continue; const d = Math.hypot(z.x - px, z.z - pz); if (d < 60 && !(z.state === 'dormant')) { E.damage(z, 99999, 'body', { stagger: 0, knockback: 0 }, { x: z.x, y: 1, z: z.z }, { x: px, z: pz }); B.kills++; } }
        for (const m of [...(g.moths?.moths ?? [])]) { try { if (Math.hypot(m.x - px, m.z - pz) < 40) g.moths.hit(m, 999); } catch (e) {} }
        // where to
        let at = o.at; const ats = o.ats ?? [];
        if (ats.length > 1) { B.ati = (B.ati ?? 0); if (B.since % 12 < 5 * DT) B.ati++; at = ats[B.ati % ats.length]; }
        if (id === 'junie' || id === 'plan') { const zone = 0; const f = g.station.renderer.family[2].visible ? g.station.renderer.family[2].position : g.station.renderer.family[0].position; at = { x: f.x + 0.6, z: f.z + 1.0, face: f }; }
        if (id === 'gasInside' && g.gasStation.frame) { const F = g.gasStation.frame; const k = Math.floor(B.since / 4) % 3; const spots = [[1.6, -4.5], [2.0, -7.2], [5.0, -7.4]]; const w = { x: F.x + F.rx * spots[k][0] + F.fx * spots[k][1], z: F.z + F.rz * spots[k][0] + F.fz * spots[k][1] }; if (Number.isFinite(w.x)) at = w; for (const z of E.living) if (z.kind === 'mutant' && z.state !== 'dormant') E.damage(z, 99999, 'body', { stagger: 0, knockback: 0 }, { x: z.x, y: 1, z: z.z }, { x: px, z: pz }); }
        // down in the storm shelter: every point there is to search, then the ladder
        let ladderOk = true;
        if (g.shelter?.below) { const sh = g.shelter; const pt = sh.points.find((q) => q.below && !sh.searched.has(q.id) && (!q.needs || g.progress.has(q.needs))); at = pt ? { x: pt.x, z: pt.z } : { x: sh.ladderAt.x, z: sh.ladderAt.z }; ladderOk = !pt; }
        // an objective at a car: stand at its bonnet, door and boot in turn
        if (at && !at.face) { const car = (g.vehicles.list ?? []).find((v) => Math.hypot(v.x - at.x, v.z - at.z) < 1.5); if (car?.spots) { const names = ['bonnet', 'door', 'boot', 'door2'].filter((n) => car.spots[n]); const sp = car.spots[names[Math.floor(B.since / 6) % names.length]]; at = { x: sp.x, z: sp.z }; } }
        const prompt = g.combat.activePrompt?.().prompt ?? '';
        const dist = at ? Math.hypot(at.x - px, at.z - pz) : 0;
        // the outpost's watchtower: up only when the dogfight's ready, and then through the scope
        const op = g.outpost; const towerReady = op?.dogfightReady && !op.dogfightSeen;
        if (P.platform?.outpost && towerReady) { try { op.playDogfight(); } catch (e) { say('dogfight err ' + e.message); } }
        if (/watchtower|climb the tower/i.test(prompt) && !P.platform && !towerReady) ladderOk = false;
        const usePrompt = prompt && !(/watchtower/i.test(prompt) && !towerReady && !P.platform) && !skipPrompt.test(prompt) && (!at || dist < 9 || P.platform) && (ladderOk || !/climb the ladder/i.test(prompt));
        const onTower = Boolean(P.platform) && !g.shelter?.below;
        B.hold = Boolean(usePrompt) || (onTower && /climb down|take the|hand Wyatt/i.test(prompt)) || ((id === 'tower' || id === 'towerRifle' || id === 'night2Prep') && /climb the|take the|hand Wyatt/i.test(prompt)) || (/talk to/i.test(prompt));
        // a hold needs a release between actions: let go for a tick when the prompt changes, and every few seconds
        B.holdT = B.hold ? (B.holdT ?? 0) + 1 : 0;
        if (B.hold && ((prompt !== B.lastPrompt && /^Hold/.test(prompt)) || B.holdT > 48)) { B.hold = false; B.holdT = 0; }
        B.lastPrompt = prompt;
        if (!B.hold && at && !P.riding && !onTower && !(prompt && usePrompt)) {
          const gateStep = id === 'outpostGate'; // (a shut gate: stand short of it, never round it)
          if (gateStep && dist < 5) { /* wait for the talk */ } else if (dist > 1.2) {
            const hop = Math.min(dist - 0.6, 4);
            const nx = px + ((at.x - px) / dist) * hop, nz = pz + ((at.z - pz) / dist) * hop;
            const f = at.face ?? at; if (g.shelter?.below || g.interiors?.inside) { P.position.x = nx; P.position.z = nz; } else P.teleport(nx, nz, Math.atan2(-(f.x - nx), -(f.z - nz))); B.hops++;
          } else if (B.since > 6) {
            // at the spot and nothing offered: look about (a prompt may want a step to one side)
            B.wiggle = (B.wiggle ?? 0) + 1; const a = B.wiggle * 1.3; const r = 0.8 + (B.wiggle % 5) * 0.6;
            if (g.shelter?.below || g.interiors?.inside) { P.position.x = at.x + Math.sin(a) * r * 0.4; P.position.z = at.z + Math.cos(a) * r * 0.4; } else P.teleport(at.x + Math.sin(a) * r, at.z + Math.cos(a) * r, a + Math.PI);
          }
        }
        for (let i = 0; i < 5; i++) { g.update(DT); B.t += DT; }
      };
      const stop = () => (until.startsWith('step:') ? g.objectives.current.id === until.slice(5) && B.since > 20 : g.progress.has(until)) || B.t > maxT || !g.combat.alive || B.since > 420;
      for (let k = 0; k < 160 && !stop(); k++) tick();
      const o = g.objectives.current;
      return { done: stop(), t: Math.round(B.t), id: o.id, since: Math.round(B.since), alive: g.combat.alive, reached: g.progress.has(until), prompt: g.combat.activePrompt?.().prompt ?? '', pos: [Math.round(g.player.position.x), Math.round(g.player.position.z)], at: o.at ? [Math.round(o.at.x), Math.round(o.at.z)] : null, day: g.clock.day, phase: g.clock.phase, log: B.log.splice(0), toasts: B.toasts.splice(0), kills: B.kills, flags: g.progress.flags.list().length };
    }, { until, maxT });
    for (const l of report.log) console.log(l);
    done = report.done;
  }
  const tail = await p.evaluate(() => ({ lines: window.bot.lines.slice(-25), weapons: window.game.combat.weapons.found, inv: { scrap: window.game.combat.inventory.scrap, batteries: window.game.combat.inventory.batteries }, n2: window.game.nightTwo.state, farm: window.game.farm.overlayLine?.(), stations: window.game.stations.overlayLine() }));
  if (process.env.DUMP) console.log('DUMP', JSON.stringify(await p.evaluate(process.env.DUMP)));
  console.log('END', JSON.stringify({ ...report, log: undefined, toasts: undefined }));
  console.log('last toasts:', JSON.stringify(report.toasts.slice(-8)));
  console.log('state:', JSON.stringify(tail));
  console.log('errors:', errs.slice(0, 8));
  await b.close();
})();
