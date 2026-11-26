import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOUNDS, OUT_LAND, SPIN, RATE, outSound } from './sfx.mjs';

const at = (pcm, sec) => Math.round(sec * RATE) * 2;
const peak = (pcm, from, to) => {
  let m = 0;
  for (let i = at(pcm, from); i < Math.min(at(pcm, to), pcm.length); i += 2) m = Math.max(m, Math.abs(pcm.readInt16LE(i)));
  return m;
};

test('every sound is mono s16le, short (the spin excepted), peak-normalized to 85 %', () => {
  for (const [name, make] of Object.entries(SOUNDS)) {
    const pcm = make();
    assert.equal(pcm.length % 2, 0, name);
    assert.ok(pcm.length / 2 / RATE <= (name === 'spin' ? SPIN : 2.2), `${name} lasts ${(pcm.length / 2 / RATE).toFixed(2)} s`);
    assert.equal(peak(pcm, 0, 99), Math.round(0.85 * 32767), name);
  }
});

test('the same bytes on every build', () => {
  for (const make of Object.values(SOUNDS)) assert.ok(make().equals(make()));
});

test('the out sound clacks when the ball lands, louder than the roll before it', () => {
  const pcm = outSound();
  const clack = peak(pcm, OUT_LAND, OUT_LAND + 0.05);
  assert.equal(clack, Math.round(0.85 * 32767));
  assert.ok(peak(pcm, 0, OUT_LAND - 0.001) < clack / 1.5);
});
