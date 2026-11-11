// Drawings on a paper's page (Session 26): a page with "drawing": "<id>"
// shows one of these, inline SVG in pencil (no image files). The first:
// Amos Pruitt's drawing of the staircase in the woods, in the 1903 account
// (papers.json capsuleAccount, page IV). Dull pencil greys on the page.

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

const DRAWINGS = { stairs };

// The SVG for a drawing id, or '' if there's none.
export function drawingSvg(id) {
  return DRAWINGS[id]?.() ?? '';
}

export function hasDrawing(id) {
  return Boolean(DRAWINGS[id]);
}
