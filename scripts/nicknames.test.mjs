import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NICKNAMES, nicknames } from './nicknames.mjs';

test('one English nickname per number, a few French ones, all printable ASCII', () => {
  assert.equal(NICKNAMES.en.length, 90);
  assert.equal(new Set(NICKNAMES.en).size, 90);
  for (const s of [...NICKNAMES.en, ...Object.values(NICKNAMES.fr)]) assert.match(s, /^[\x20-\x7E]+$/, s);
  for (const n of Object.keys(NICKNAMES.fr)) assert.ok(n >= 1 && n <= 90);
});

test('widths are measured in the small font', () => {
  const m = nicknames();
  assert.deepEqual(m.en[22], ['Two little ducks', 54]);
  assert.equal(Object.keys(m.en).length, 90);
  assert.ok(m.fr[89][1] > 30);
});
