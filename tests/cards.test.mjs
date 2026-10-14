import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomIndex, isCardList } from '../src/cards.mjs';
test('random selection covers every alternative and avoids immediate repeats', () => {
  for (let current = 0; current < 8; current++) {
    const outcomes = Array.from({length:7}, (_, i) => randomIndex(8, current, () => (i + .5) / 7));
    assert.equal(new Set(outcomes).size, 7);
    assert(!outcomes.includes(current));
  }
  assert.equal(randomIndex(0), -1);
  assert.equal(randomIndex(1, 0), 0);
  assert.equal(randomIndex(8, -1, () => .99), 7);
});
test('reject malformed or empty JSON while accepting the requested minimal schema', () => {
  assert(isCardList([{front:'test',back:{meaning:'含义', explanation:'解释', example:'This is a test.'}}]));
  for (const data of [[], {}, null, [{front:'test'}], [{front:' ', back:{}}], [{front:'test',back:{meaning:'含义',explanation:'解释',example:''}}]]) assert(!isCardList(data));
});
test('all supplied cards have an example and unique fronts', () => {
  const cards = JSON.parse(readFileSync('public/data/cards.json', 'utf8'));
  assert(isCardList(cards));
  assert(cards.length > 0);
  assert.equal(new Set(cards.map(card => card.front)).size, cards.length);
});
