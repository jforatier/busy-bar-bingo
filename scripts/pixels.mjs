// Pixel art computed at build time (specs/02): the bar's JavaScript engine is far too slow to draw bitmaps pixel by
// pixel (a 72×16 cage per frame and a 148×80 board blocked it until the bar restarted), so the app only picks these.
// writeArt() writes src/art.gen.ts (git-ignored); vite.config.mjs calls it inside `busy-cli build`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Column colours of the 75-ball game (N grey so its ring stands apart from the white disc), amber for the 90. */
export const COLUMN = { B: '#2F6BFF', I: '#FF2E2E', N: '#8C8C8C', G: '#22D35A', O: '#FFB000' };
export const AMBER = '#FFB000';

export const grid = (w, h) => ({ w, h, px: new Array(w * h) });

function set(g, x, y, c) {
  if (x >= 0 && x < g.w && y >= 0 && y < g.h) g.px[y * g.w + x] = c;
}

function shade(hex, to, k) {
  let out = '#';
  for (let i = 1; i < 7; i += 2) {
    const c = parseInt(hex.slice(i, i + 2), 16);
    out += Math.round(c + (to - c) * k).toString(16).toUpperCase().padStart(2, '0');
  }
  return out;
}

/** Paints a ball: light from the top right, a white disc of radius `disc` in the middle. */
export function ball(g, cx, cy, r, base, disc = 0) {
  const light = shade(base, 255, 0.45);
  const dark = shade(base, 0, 0.55);
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      if (d > r) continue;
      if (d <= disc) set(g, x, y, '#FFFFFF');
      else {
        const k = (dx - dy) / (r * Math.SQRT2); // +1 top right, -1 bottom left
        set(g, x, y, k > 0.55 ? light : k < -0.55 ? dark : base);
      }
    }
  }
}

const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef';

/** The grid as XPM2 text: "." is transparent, at most 32 colours. */
export function xpm(g) {
  const key = new Map();
  const rows = [];
  for (let y = 0; y < g.h; y++) {
    let row = '';
    for (let x = 0; x < g.w; x++) {
      const c = g.px[y * g.w + x];
      if (c === undefined) row += '.';
      else {
        if (!key.has(c)) {
          if (key.size === KEYS.length) throw new Error('xpm: more than 32 colours');
          key.set(c, KEYS[key.size]);
        }
        row += key.get(c);
      }
    }
    rows.push(row);
  }
  return ['! XPM2', `${g.w} ${g.h} ${key.size + 1} 1`, '. c None', ...[...key].map(([c, k]) => `${k} c ${c}`), ...rows].join('\n');
}

const paint = (w, h, fn) => {
  const g = grid(w, h);
  fn(g);
  return xpm(g);
};

/** Colours by key: the five columns, A = the 90-ball game's amber. */
const BASES = { ...COLUMN, A: AMBER };

/** Frames in one turn of the cage loop; with three spokes the picture repeats every third of a turn. */
export const CAGE_FRAMES = 24;
/** Sizes of the ball rolling out, from a 3 px dot to the full 16 px ball. */
export const GROW_STEPS = 8;

/**
 * One frame of the spinning cage (16×16): a grey ring, three spokes, nine 2×2 balls tumbling. Each ball turns a whole
 * number of times per loop and breathes in and out, so frame CAGE_FRAMES wraps onto frame 0 without a jump.
 */
function cageFrame(f, colours) {
  const th = (2 * Math.PI * f) / CAGE_FRAMES;
  return paint(16, 16, (g) => {
    for (let a = 0; a < 360; a += 4) {
      set(g, Math.floor(8 + 7.5 * Math.cos((a * Math.PI) / 180)), Math.floor(8 + 7.5 * Math.sin((a * Math.PI) / 180)), '#5A5A5A');
    }
    for (let k = 0; k < 3; k++) {
      const a = th / 3 + (k * 2 * Math.PI) / 3;
      for (let s = 2; s < 7; s++) set(g, Math.floor(8 + s * Math.cos(a)), Math.floor(8 + s * Math.sin(a)), '#2E2E2E');
    }
    colours.forEach((c, i) => {
      const r = 1.5 + ((i * 7) % 9) / 2.6 + 1.2 * Math.sin(th * (1 + (i % 2)) + i);
      const a = i * 0.7 + th * [1, -1, 2][i % 3];
      const x = Math.floor(8 + r * Math.cos(a));
      const y = Math.floor(8 + r * Math.sin(a));
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) set(g, x + dx, y + dy, c);
    });
  });
}

/** Everything the app draws as a bitmap, as XPM2 strings. */
export function art() {
  const ball16 = {};
  for (const [k, c] of Object.entries(BASES)) ball16[k] = paint(16, 16, (g) => ball(g, 8, 8, 8, c, k === 'A' ? 0 : 5));
  const grow = {};
  for (const [k, c] of Object.entries(BASES)) {
    grow[k] = [];
    for (let s = 0; s < GROW_STEPS; s++) grow[k].push(paint(16, 16, (g) => ball(g, 8, 8, 1.5 + (6.5 * s) / (GROW_STEPS - 1), c)));
  }
  const mixed = ['B', 'I', 'N', 'G', 'O', 'B', 'G', 'I', 'O'].map((k) => COLUMN[k]);
  return {
    ball16,
    ball8: { B: paint(8, 8, (g) => ball(g, 4, 4, 4, COLUMN.B, 1.6)), A: paint(8, 8, (g) => ball(g, 4, 4, 4, AMBER, 1.6)) },
    grow,
    cage: {
      75: Array.from({ length: CAGE_FRAMES }, (_, f) => cageFrame(f, mixed)),
      90: Array.from({ length: CAGE_FRAMES }, (_, f) => cageFrame(f, mixed.map(() => AMBER))),
    },
  };
}

/** Writes src/art.gen.ts, rewriting it only when it changed. */
export function writeArt() {
  mkdirSync('src', { recursive: true });
  const text = `// Generated by scripts/pixels.mjs during the build: do not edit.\nexport const ART = ${JSON.stringify(art())} as const;\n` +
    `export const CAGE_FRAMES = ${CAGE_FRAMES};\nexport const GROW_STEPS = ${GROW_STEPS};\n`;
  let old = '';
  try { old = readFileSync('src/art.gen.ts', 'utf8'); } catch { /* first build */ }
  if (old !== text) writeFileSync('src/art.gen.ts', text);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) writeArt();
