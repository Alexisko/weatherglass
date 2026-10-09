import test from 'node:test';
import assert from 'node:assert/strict';
import { monthsInRange, isFullYear, shorterRange, rangeLabel, daysInMonth, periodYearOf } from '../js/stats/months.js';

test('monthsInRange handles simple and wrapping ranges', () => {
  assert.deepEqual(monthsInRange(5, 6), [5, 6]);
  assert.deepEqual(monthsInRange(7, 7), [7]);
  assert.deepEqual(monthsInRange(11, 2), [11, 12, 1, 2]);
  assert.equal(monthsInRange(1, 12).length, 12);
});

test('isFullYear detects any 12-month span', () => {
  assert.ok(isFullYear(1, 12));
  assert.ok(isFullYear(3, 2));
  assert.ok(!isFullYear(1, 11));
});

test('shorterRange picks the shorter way round the calendar', () => {
  assert.deepEqual(shorterRange(6, 3), { from: 3, to: 6 });
  assert.deepEqual(shorterRange(11, 2), { from: 11, to: 2 });
  assert.deepEqual(shorterRange(3, 6), { from: 3, to: 6 });
  assert.deepEqual(shorterRange(4, 4), { from: 4, to: 4 });
});

test('rangeLabel', () => {
  assert.equal(rangeLabel(1, 12), 'Year');
  assert.equal(rangeLabel(5, 5), 'May');
  assert.equal(rangeLabel(12, 2), 'Dec–Feb');
  assert.equal(rangeLabel(5, 6, { long: true }), 'May–June');
});

test('daysInMonth handles leap years', () => {
  assert.equal(daysInMonth(1992, 2), 29);
  assert.equal(daysInMonth(1900, 2), 28);
  assert.equal(daysInMonth(2000, 2), 29);
  assert.equal(daysInMonth(2021, 4), 30);
});

test('periodYearOf labels a wrapping period by its start year', () => {
  assert.equal(periodYearOf(1992, 1, 12, 2), 1991);
  assert.equal(periodYearOf(1991, 12, 12, 2), 1991);
  assert.equal(periodYearOf(1991, 5, 5, 6), 1991);
});
