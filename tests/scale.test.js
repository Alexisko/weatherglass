import test from 'node:test';
import assert from 'node:assert/strict';
import { niceScale } from '../js/views/scale.js';

test('niceScale covers the data with round steps', () => {
  const s = niceScale(-3.2, 31.7, 5);
  assert.ok(s.min <= -3.2 && s.max >= 31.7);
  assert.equal(s.step, 10);
  assert.deepEqual(s.ticks, [-10, 0, 10, 20, 30, 40]);
});

test('niceScale for small counts and a flat series', () => {
  assert.deepEqual(niceScale(0, 7.4, 4).ticks, [0, 2.5, 5, 7.5]);
  const flat = niceScale(5, 5);
  assert.ok(flat.min < 5 && flat.max > 5);
});
