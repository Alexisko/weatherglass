import test from 'node:test';
import assert from 'node:assert/strict';
import { validForMean, validForTotal } from '../js/stats/completeness.js';

const month = (missingAt) => Array.from({ length: 31 }, (_, i) => (missingAt.includes(i) ? null : 1));

test('3/5 rule: up to 5 missing days, at most 3 in a row', () => {
  assert.ok(validForMean(month([]), 31));
  assert.ok(validForMean(month([0, 1, 2]), 31));             // 3 consecutive
  assert.ok(validForMean(month([0, 5, 10, 15, 20]), 31));     // 5 scattered
  assert.ok(!validForMean(month([0, 1, 2, 3]), 31));          // 4 consecutive
  assert.ok(!validForMean(month([0, 5, 10, 15, 20, 25]), 31)); // 6 scattered
});

test('absent days count as missing', () => {
  assert.ok(validForMean(Array(28).fill(1), 31));   // 3 absent
  assert.ok(!validForMean(Array(27).fill(1), 31));  // 4 absent in a row
});

test('totals need every day', () => {
  assert.ok(validForTotal(month([]), 31));
  assert.ok(!validForTotal(month([3]), 31));
  assert.ok(!validForTotal(Array(30).fill(0), 31));
});
