import test from 'node:test';
import assert from 'node:assert/strict';
import { mean, sum, percentile } from '../js/stats/basic.js';

test('mean ignores nulls and returns null for no data', () => {
  assert.equal(mean([1, 2, null, 3]), 2);
  assert.equal(mean([]), null);
  assert.equal(mean([null]), null);
});

test('sum ignores nulls', () => {
  assert.equal(sum([1, null, 2.5]), 3.5);
});

test('percentile uses linear interpolation (type 7)', () => {
  const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.equal(percentile(a, 0), 1);
  assert.equal(percentile(a, 1), 10);
  assert.equal(percentile(a, 0.5), 5.5);
  assert.ok(Math.abs(percentile(a, 0.1) - 1.9) < 1e-12);
  assert.ok(Math.abs(percentile(a, 0.9) - 9.1) < 1e-12);
  assert.equal(percentile([7], 0.9), 7);
  assert.equal(percentile([null, null], 0.5), null);
});

test('percentile does not depend on input order', () => {
  assert.equal(percentile([10, 1, 5], 0.5), 5);
});
