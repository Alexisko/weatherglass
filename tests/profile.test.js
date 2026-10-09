import test from 'node:test';
import assert from 'node:assert/strict';
import { computeProfile, monthRecords, summarizePeriod } from '../js/stats/profile.js';
import { syntheticDaily, constantClimate } from './helpers.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('constant climate: means, spreads, wet days and sunshine share', () => {
  const p = computeProfile(syntheticDaily({ fn: constantClimate }));
  const jan = p.monthly[0];
  assert.equal(jan.possibleYears, 30);
  assert.equal(jan.tmax.n, 30);
  close(jan.tmax.mean, 20);
  close(jan.tmax.dailyP10, 20);
  close(jan.tmin.mean, 10);
  // January: 2 mm on days 5,10,15,20,25,30 → 6 wet days; 6×2 + 25×0.5 = 24.5 mm.
  close(jan.wetDays.mean, 6);
  close(jan.precip.mean, 24.5);
  close(jan.wetDays.chance, 6 / 31);
  close(jan.sunshineShare, 8 / 12);
  // February: days 5,10,15,20,25 → 5 wet days in every year, leap or not.
  close(p.monthly[1].wetDays.mean, 5);
});

test('wet-day threshold is inclusive at 1.0 mm', () => {
  const daily = syntheticDaily({ fn: ({ day }) => ({ ...constantClimate({ day }), precip: day === 1 ? 1.0 : day === 2 ? 0.99 : 0 }) });
  const jan = computeProfile(daily).monthly[0];
  close(jan.wetDays.mean, 1);
});

test('year-to-year variation: mean of yearly values and pooled daily percentiles', () => {
  // tmax = 1 in 1991 … 30 in 2020, constant within a year.
  const daily = syntheticDaily({ fn: ({ year, day }) => ({ ...constantClimate({ day }), tmax: year - 1990 }) });
  const jan = computeProfile(daily).monthly[0];
  close(jan.tmax.mean, 15.5);
  // 930 pooled January values: P10 at index 92.9 → 3 + 0.9 = 3.9; P90 at 836.1 → 27.1.
  close(jan.tmax.dailyP10, 3.9);
  close(jan.tmax.dailyP90, 27.1);
});

test('period summary: totals add up over the months, means are day-weighted', () => {
  const p = computeProfile(syntheticDaily({ fn: constantClimate }), { from: 5, to: 6 });
  // May 6 wet days + June 6 wet days.
  close(p.period.wetDays.mean, 12);
  close(p.period.days, 61);
  close(p.period.tmax.mean, 20);
  const year = computeProfile(syntheticDaily({ fn: constantClimate })).period;
  // 11 months × 6 + February 5 = 71 wet days a year.
  close(year.wetDays.mean, 71);
});

test('a period wrapping the year end has 29 occurrences in 1991–2020', () => {
  const p = computeProfile(syntheticDaily({ fn: constantClimate }), { from: 12, to: 2 });
  assert.equal(p.period.possibleYears, 29);
  assert.equal(p.period.tmax.n, 29);
  assert.deepEqual(p.period.months, [12, 1, 2]);
  close(p.period.wetDays.mean, 6 + 6 + 5);
});

test('day-weighted mean across a wrapping period', () => {
  // tmax = year − 1990. Dec 1991 = 1, Jan–Feb 1992 = 2 (Feb 1992 has 29 days).
  const daily = syntheticDaily({ fn: ({ year, day }) => ({ ...constantClimate({ day }), tmax: year - 1990 }) });
  const s = summarizePeriod(monthRecords(daily), { from: 12, to: 2, startYear: 1991, endYear: 1992 });
  assert.equal(s.possibleYears, 1);
  // One occurrence only, so minYears = 1 and the normal is that occurrence.
  close(s.tmax.mean, (31 * 1 + 60 * 2) / 91);
});

test('completeness: a month failing the rule is dropped for that variable only', () => {
  const daily = syntheticDaily({ fn: constantClimate });
  // 6 missing tmax days in Jan 1995 → that January is invalid for tmax.
  for (let d = 1; d <= 6; d++) daily.tmax[daily.time.indexOf(`1995-01-0${d}`)] = null;
  // 1 missing precip day in Jan 1996 → invalid for precipitation, fine for temperature.
  daily.precip[daily.time.indexOf('1996-01-15')] = null;
  const jan = computeProfile(daily).monthly[0];
  assert.equal(jan.tmax.n, 29);
  assert.equal(jan.tmin.n, 30);
  assert.equal(jan.precip.n, 29);
  assert.equal(jan.wetDays.n, 29);
});

test('fewer than 24 valid years gives no normal', () => {
  const daily = syntheticDaily({ fn: constantClimate });
  daily.time.forEach((t, i) => {
    if (t.slice(5, 7) === '01' && Number(t.slice(0, 4)) <= 1997) daily.tmax[i] = null; // 7 Januaries
  });
  const jan = computeProfile(daily).monthly[0];
  assert.equal(jan.tmax.n, 23);
  assert.equal(jan.tmax.sufficient, false);
  assert.equal(jan.tmax.mean, null);
  assert.equal(jan.tmin.sufficient, true);
});
