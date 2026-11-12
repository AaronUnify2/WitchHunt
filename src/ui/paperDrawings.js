// Drawings on a paper's page (Session 26): a page with "drawing": "<id>"
// shows one of these, inline SVG in pencil (no image files). The first:
// Amos Pruitt's drawing of the staircase in the woods, in the 1903 account
// (papers.json capsuleAccount, page IV). Dull pencil greys on the page.

import { config } from '../config.js';
import { floorMid, floorHalf } from '../world/hollerGround.js';

const PENCIL = '#4a4236';
const SOFT = '#7a6e5a';

// The staircase: a clearing's ground line, trunks either side, and a flight
// of nine steps rising from the leaves to nothing, a runner up its middle,
// a newel post and a rail that stops in the air.
function stairs() {
  const steps = [];
  const x0 = 70;
  const y0 = 150;
  const run = 13;
  const rise = 11;
  for (let i = 0; i < 9; i++) {
    const x = x0 + i * run;
    const y = y0 - i * rise;
    steps.push(`<path d="M${x} ${y} h${run} v${-rise}" />`);
    steps.push(`<path d="M${x + 4} ${y - 1} h${run - 6}" stroke="${SOFT}" stroke-width="3" opacity="0.55" />`); // the runner
  }
  const trunks = [18, 30, 205, 222, 238].map((x, i) => `<path d="M${x} 164 C ${x + 2} 120, ${x - 2} 70, ${x + (i % 2 ? 3 : -2)} 8" stroke-width="${i % 2 ? 2.2 : 3}" />`).join('');
  const grass = Array.from({ length: 26 }, (_, i) => {
    const x = 8 + i * 9.3;
    return `<path d="M${x} 166 l${(i % 3) - 1} -5" stroke="${SOFT}" />`;
  }).join('');
  return `<svg class="paper-drawing" viewBox="0 0 250 185" role="img" aria-label="A pencil drawing of a staircase standing alone in a clearing">
  <g fill="none" stroke="${PENCIL}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 166 C 60 162, 140 168, 246 163" stroke="${SOFT}" />
    ${grass}
    ${trunks}
    <path d="M${x0} ${y0} L ${x0 + 9 * run} ${y0 - 9 * rise}" stroke="${SOFT}" />
    <path d="M${x0 - 2} ${y0 + 6} L ${x0 + 9 * run - 2} ${y0 - 9 * rise + 6}" />
    ${steps.join('')}
    <path d="M${x0 - 6} ${y0 + 4} v-46" stroke-width="2.4" />
    <path d="M${x0 - 6} ${y0 - 42} L ${x0 + 9 * run - 4} ${y0 - 9 * rise - 42}" />
    ${Array.from({ length: 9 }, (_, i) => `<path d="M${x0 + 4 + i * run} ${y0 - i * rise - 11} v-34" stroke="${SOFT}" stroke-width="1" />`).join('')}
    <path d="M${x0 + 9 * run} ${y0 - 9 * rise} m 4 -2 l 10 -6 m -6 10 l 12 -3" stroke="${SOFT}" stroke-dasharray="2 3" />
  </g>
  <text x="128" y="181" text-anchor="middle" class="paper-drawing-caption">the stairs · A. P.</text>
</svg>`;
}

// Session 29: the Rigsbys' trap map (papers.json hollerTrapMap), pencil on the back of a feed sack:
// the holler from the mouth (bottom) to the still (top), the branch down one side, the lookout, and
// an X for each trap the family put on it, labelled. Drawn from the real layout (config.holler.traps,
// config.map.holler), so it matches the set; the two traps laid since (mapped: false) aren't on it.
function trapMap() {
  const g = config.map.holler;
  const traps = config.holler.traps.filter((t) => t.mapped !== false);
  const Y = (z) => 176 - ((z - g.mouth) / (g.head + 4 - g.mouth)) * 156;
  const X = (x) => 125 - x * 5.2; // the walker's left (model +x) on the left as you look up the holler
  const side = (s) => {
    const pts = [];
    for (let z = g.mouth; z <= g.head; z += 2) pts.push(`${X(floorMid(g, z) + s * floorHalf(g, z)).toFixed(1)} ${Y(z).toFixed(1)}`);
    return `<path d="M${pts.join(' L')}" />`;
  };
  const head = `<path d="M${X(floorMid(g, g.head) + floorHalf(g, g.head)).toFixed(1)} ${Y(g.head).toFixed(1)} C ${X(6)} ${Y(g.head + 6)}, ${X(-6)} ${Y(g.head + 6)}, ${X(floorMid(g, g.head) - floorHalf(g, g.head)).toFixed(1)} ${Y(g.head).toFixed(1)}" />`;
  const branch = [];
  for (let z = g.head - 1; z > g.mouth; z -= 2) branch.push(`${X(floorMid(g, z) + floorHalf(g, z) * 0.55).toFixed(1)} ${Y(z).toFixed(1)}`);
  const label = { shotgun: 'GUN', cans: 'CANS', bear: 'TRAP', snare: 'SNARE' };
  const marks = traps.map((t, i) => {
    const x = X(floorMid(g, t.z) + (t.dx ?? 0));
    const y = Y(t.z);
    const lx = i % 2 ? x + 10 : x - 10;
    return `<path d="M${x - 4} ${y - 4} l8 8 m0 -8 l-8 8" stroke-width="1.8" />
    <text x="${lx}" y="${y + 3}" text-anchor="${i % 2 ? 'start' : 'end'}" class="paper-drawing-caption">${label[t.kind]}</text>`;
  });
  const sx = X(floorMid(g, 15.5));
  const sy = Y(15.5);
  const look = { x: X(floorMid(g, -5) - floorHalf(g, -5) + 1.2), y: Y(-5) };
  return `<svg class="paper-drawing" viewBox="0 0 250 185" role="img" aria-label="A pencil map of the holler, an X for each trap">
  <g fill="none" stroke="${PENCIL}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
    ${side(1)}
    ${side(-1)}
    ${head}
    <path d="M${branch.join(' L')}" stroke="${SOFT}" stroke-dasharray="3 3" />
    <rect x="${look.x - 5}" y="${look.y - 4}" width="9" height="8" stroke="${SOFT}" />
    <text x="${look.x - 9}" y="${look.y + 3}" text-anchor="end" class="paper-drawing-caption">LOOKOUT</text>
    <ellipse cx="${sx}" cy="${sy}" rx="6" ry="7" />
    <path d="M${sx} ${sy - 7} v-4 h9" />
    <text x="${sx + 12}" y="${sy + 2}" class="paper-drawing-caption">STILL</text>
    ${marks.join('\n    ')}
    <path d="M${X(floorMid(g, g.mouth))} ${Y(g.mouth) + 4} v-10 m-4 4 l4 -4 l4 4" stroke="${SOFT}" />
  </g>
  <text x="125" y="183" text-anchor="middle" class="paper-drawing-caption">road</text>
</svg>`;
}

// Earl's map of the north ridge (build queue item 1): the road running north past his store to where it
// stops, the ridge's contour, the creek, and thirty years of sightings as Xs, bunched round the road's end.
function earlMaps() {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const end = { x: 128, y: 40 };
  const marks = [];
  for (let i = 0; i < 26; i++) {
    const far = i > 20;
    const a = rand() * Math.PI * 2;
    const r = far ? 40 + rand() * 45 : 5 + rand() * 24;
    const x = Math.max(10, Math.min(240, end.x + Math.cos(a) * r));
    const y = Math.max(10, Math.min(150, end.y + Math.sin(a) * r * 0.8 + (far ? 30 : 4)));
    marks.push(`<path d="M${(x - 2.5).toFixed(1)} ${(y - 2.5).toFixed(1)} l5 5 m0 -5 l-5 5" />`);
  }
  return `<svg class="paper-drawing" viewBox="0 0 250 185" role="img" aria-label="A hand-drawn map of a ridge, a road that stops, and many small crosses bunched round the road's end">
  <g fill="none" stroke="${PENCIL}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 30 C 50 10, 90 26, 126 18 S 210 8, 246 26" stroke="${SOFT}" />
    <path d="M6 44 C 52 24, 92 40, 110 30 M150 30 C 190 24, 220 22, 246 40" stroke="${SOFT}" />
    <path d="M10 150 C 60 138, 80 160, 130 146 S 210 150, 244 134" stroke="${SOFT}" stroke-dasharray="5 3" />
    <path d="M124 176 C 122 140, 132 100, 128 ${end.y + 4}" stroke-width="2.2" />
    <path d="M132 176 C 130 140, 140 100, 136 ${end.y + 4}" stroke-width="2.2" />
    <path d="M118 ${end.y + 3} h28" stroke-width="2.6" />
    <rect x="142" y="112" width="14" height="10" />
    <circle cx="${end.x + 4}" cy="${end.y - 6}" r="15" stroke-dasharray="2 3" />
    ${marks.join('\n    ')}
  </g>
  <text x="160" y="120" class="paper-drawing-caption">STORE</text>
  <text x="150" y="${end.y + 7}" class="paper-drawing-caption">ROAD ENDS</text>
  <text x="${end.x + 24}" y="${end.y - 12}" class="paper-drawing-caption">HIS DOOR?</text>
  <text x="14" y="162" class="paper-drawing-caption">creek</text>
  <text x="125" y="183" text-anchor="middle" class="paper-drawing-caption">to town</text>
</svg>`;
}

const DRAWINGS = { stairs, trapMap, earlMaps };

// The SVG for a drawing id, or '' if there's none.
export function drawingSvg(id) {
  return DRAWINGS[id]?.() ?? '';
}

export function hasDrawing(id) {
  return Boolean(DRAWINGS[id]);
}
