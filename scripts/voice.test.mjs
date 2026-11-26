import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { KEYS, LANGS, double } from './voice.mjs';

test('doubling the rate keeps every sample and adds the midpoints', () => {
  const pcm = Buffer.alloc(6);
  [0, 100, -100].forEach((v, i) => pcm.writeInt16LE(v, i * 2));
  const out = double(pcm);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((i) => out.readInt16LE(i * 2)), [0, 50, 100, 0, -100, -100]);
});

test('every clip of every language is committed, short and not empty', () => {
  for (const lang of LANGS) {
    for (const key of KEYS) {
      const path = `voice/${lang}/${key}.pcm`;
      assert.ok(existsSync(path), path);
      const s = statSync(path).size / 2 / 22050;
      assert.ok(s > 0.2 && s < 2, `${path}: ${s.toFixed(2)} s`);
    }
  }
});
