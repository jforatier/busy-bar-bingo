import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, draw, remaining, isOver, prizeAtStake, confirmWin, letter, label, save, restore } from '../src/draw.ts';

for (const game of [75, 90]) {
  test(`${game} balls: every number exactly once, then nothing`, () => {
    const s = newGame(game);
    const balls = [];
    for (let i = 0; i < game; i++) balls.push(draw(s));
    assert.deepEqual([...balls].sort((a, b) => a - b), Array.from({ length: game }, (_, i) => i + 1));
    assert.equal(remaining(s).length, 0);
    assert.ok(isOver(s));
    assert.equal(draw(s), null);
  });
}

test('draws among the balls left, whatever the random source returns', () => {
  const s = newGame(75);
  assert.equal(draw(s, () => 0), 1);
  assert.equal(draw(s, () => 0), 2);
  assert.equal(draw(s, () => 0.9999999), 75);
  assert.equal(draw(s, () => 1), 74); // out-of-range random still yields a ball left
});

test('each ball is equally likely (loose check over 30,000 first draws)', () => {
  const counts = new Array(91).fill(0);
  for (let i = 0; i < 30000; i++) counts[draw(newGame(90))]++;
  const min = Math.min(...counts.slice(1)), max = Math.max(...counts.slice(1));
  assert.ok(min > 230 && max < 440, `counts between ${min} and ${max}, expected around 333`);
});

test('prizes: one for 75, three in order for 90, then the game is over', () => {
  const us = newGame(75);
  assert.equal(prizeAtStake(us), 'bingo');
  confirmWin(us);
  assert.equal(prizeAtStake(us), null);
  assert.ok(isOver(us));
  assert.equal(draw(us), null);

  const uk = newGame(90);
  const seen = [];
  while (prizeAtStake(uk)) { seen.push(prizeAtStake(uk)); confirmWin(uk); }
  assert.deepEqual(seen, ['line', 'two_lines', 'full_house']);
  confirmWin(uk);
  assert.equal(uk.prize, 3);
});

test('letters and labels', () => {
  assert.deepEqual([1, 15, 16, 30, 31, 45, 46, 60, 61, 75].map(letter).join(''), 'BBIINNGGOO');
  assert.equal(label(75, 42), 'N 42');
  assert.equal(label(90, 42), '42');
});

test('a saved game comes back as it was', () => {
  const s = newGame(90);
  for (let i = 0; i < 12; i++) draw(s);
  confirmWin(s);
  assert.deepEqual(restore(save(s)), s);
  const back = restore(save(s));
  draw(back);
  assert.equal(new Set(back.called).size, 13);
});

test('a malformed save gives null', () => {
  for (const bad of [null, '', 'not json', '42', 'null',
    '{"v":2,"game":75,"called":[],"prize":0}',
    '{"v":1,"game":80,"called":[],"prize":0}',
    '{"v":1,"game":75,"called":[76],"prize":0}',
    '{"v":1,"game":75,"called":[3,3],"prize":0}',
    '{"v":1,"game":75,"called":[1.5],"prize":0}',
    '{"v":1,"game":75,"called":"1,2","prize":0}',
    '{"v":1,"game":75,"called":[],"prize":2}',
    '{"v":1,"game":90,"called":[],"prize":-1}']) {
    assert.equal(restore(bad), null, String(bad));
  }
});
