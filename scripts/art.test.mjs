import { test } from 'node:test';
import assert from 'node:assert/strict';
import { art, CAGE_FRAMES, GROW_STEPS } from './pixels.mjs';
import { boardRow, keyOf, rowKey } from '../src/art.ts';

/** Checks an XPM2 text the way the bar reads it: header, ≤ 32 colours + transparency, rows of the right size. */
function parse(data) {
  const lines = data.split('\n');
  assert.equal(lines[0], '! XPM2');
  const [w, h, n, cpp] = lines[1].split(' ').map(Number);
  assert.equal(cpp, 1);
  assert.ok(n <= 33, `${n - 1} colours`);
  const keys = lines.slice(2, 2 + n).map((l) => l[0]);
  const colour = Object.fromEntries(lines.slice(2, 2 + n).map((l) => [l[0], l.slice(4)]));
  assert.equal(new Set(keys).size, n);
  const rows = lines.slice(2 + n);
  assert.equal(rows.length, h);
  for (const r of rows) {
    assert.equal(r.length, w);
    for (const c of r) assert.ok(keys.includes(c), `unknown key ${c}`);
  }
  return { w, h, rows, colour };
}

/** The colour at (x, y), or "None" where transparent. */
const at = (img, x, y) => img.colour[img.rows[y][x]];

test('every generated bitmap is valid, at its size', () => {
  const a = art();
  for (const k of 'BINGOA') assert.equal(parse(a.ball16[k]).w, 16);
  for (const k of 'BA') assert.equal(parse(a.ball8[k]).w, 8);
  for (const k of 'BINGOA') {
    assert.equal(a.grow[k].length, GROW_STEPS);
    a.grow[k].forEach((x) => parse(x));
  }
  for (const g of [75, 90]) {
    assert.equal(a.cage[g].length, CAGE_FRAMES);
    a.cage[g].forEach((x) => parse(x));
  }
  assert.equal(at(parse(a.ball16.B), 8, 8), '#FFFFFF'); // the white disc for the letter
  assert.notEqual(at(parse(a.ball16.A), 8, 8), '#FFFFFF'); // none in the 90-ball game
  assert.notEqual(at(parse(a.grow.B[GROW_STEPS - 1]), 0, 7), 'None'); // the last step is the full 16 px ball
  assert.equal(at(parse(a.grow.B[0]), 0, 7), 'None'); // the first a small dot
});

test('colour keys', () => {
  assert.deepEqual([1, 16, 31, 46, 75].map((n) => keyOf(75, n)), ['B', 'I', 'N', 'G', 'O']);
  assert.equal(keyOf(90, 7), 'A');
});

test('a board row: called numbers lit, the marked one inverted', () => {
  // 90-ball board, row 0 holds 1-10; "1" is centred in a 14 px cell from x 4: x 9-11, its middle column at x 10.
  const lit = parse(boardRow(90, 0, [, true], null));
  assert.equal(lit.w, 148);
  assert.equal(lit.h, 7);
  assert.equal(at(lit, 10, 1), '#FFFFFF');
  assert.equal(at(parse(boardRow(90, 0, [], null)), 10, 1), '#3C3C3C');
  const marked = parse(boardRow(90, 0, [, true], 1));
  assert.equal(at(marked, 8, 0), '#FFFFFF');
  assert.equal(at(marked, 10, 1), 'None');
  assert.equal(parse(boardRow(75, 4, [], 75)).h, 9); // 3×7 digits
  assert.equal(rowKey(90, 0, [, true, , true], 3), '10M0000000');
});
