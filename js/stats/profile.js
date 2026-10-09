// Climate profile statistics: monthly normals and a summary for any month range.
// Pure functions, no DOM. Definitions: docs/03-methodology.md §3.1, §3.3–3.5.
//
// Input `daily` is the normalised series from js/api/archive.js:
//   { time: ['1991-01-01', …], tmax: [°C], tmin: [°C], precip: [mm],
//     snowfall: [cm], sunshine: [h], daylight: [h] }

import { mean, sum, percentile } from './basic.js';
import { daysInMonth, monthsInRange } from './months.js';
import { validForMean, validForTotal } from './completeness.js';
import {
  REF_START_YEAR, REF_END_YEAR, MIN_YEARS_SHARE,
  WET_DAY_MM, SNOW_DAY_CM, SPREAD_LOW_P, SPREAD_HIGH_P,
} from '../config.js';

const MEAN_VARS = ['tmax', 'tmin', 'sunshine', 'daylight'];

// Group daily values into calendar months: key = year * 100 + month.
export function bucketByMonth(daily) {
  const buckets = new Map();
  const vars = ['tmax', 'tmin', 'precip', 'snowfall', 'sunshine', 'daylight'];
  daily.time.forEach((date, i) => {
    const year = Number(date.slice(0, 4));
    const month = Number(date.slice(5, 7));
    const key = year * 100 + month;
    let b = buckets.get(key);
    if (!b) {
      b = { year, month };
      for (const v of vars) b[v] = [];
      buckets.set(key, b);
    }
    for (const v of vars) b[v].push(daily[v]?.[i] ?? null);
  });
  return buckets;
}

// Per-month values for one calendar month of one year, with completeness applied.
// A value is null when the month fails the completeness rule for that variable.
export function monthRecord(bucket) {
  const days = daysInMonth(bucket.year, bucket.month);
  const rec = { year: bucket.year, month: bucket.month, days, daily: {} };

  for (const v of MEAN_VARS) {
    rec[v] = validForMean(bucket[v], days) ? mean(bucket[v]) : null;
    rec.daily[v] = bucket[v];
  }

  const precipOk = validForTotal(bucket.precip, days);
  rec.precip  = precipOk ? sum(bucket.precip) : null;
  rec.wetDays = precipOk ? bucket.precip.filter(p => p >= WET_DAY_MM).length : null;

  const snowOk = validForTotal(bucket.snowfall, days);
  rec.snowfall = snowOk ? sum(bucket.snowfall) : null;
  rec.snowDays = snowOk ? bucket.snowfall.filter(s => s >= SNOW_DAY_CM).length : null;

  return rec;
}

export function monthRecords(daily) {
  const out = new Map();
  for (const [key, b] of bucketByMonth(daily)) out.set(key, monthRecord(b));
  return out;
}

// Summary of the months `from`–`to` (wrapping allowed) over the reference period.
// Each "period-year" is one occurrence of the period, e.g. Dec 1991–Feb 1992.
export function summarizePeriod(records, { from, to, startYear = REF_START_YEAR, endYear = REF_END_YEAR }) {
  const months = monthsInRange(from, to);
  const wraps = to < from;
  const lastStart = wraps ? endYear - 1 : endYear;

  const perYear = [];
  for (let py = startYear; py <= lastStart; py++) {
    const recs = months.map(m => records.get((wraps && m < from ? py + 1 : py) * 100 + m));
    perYear.push(recs.every(Boolean) ? recs : null);
  }
  const possibleYears = perYear.length;
  const minYears = Math.ceil(MIN_YEARS_SHARE * possibleYears);

  const result = { from, to, months, possibleYears, minYears };

  // Means: day-weighted mean of the monthly means, per year; then mean across years.
  // Spread: 10th–90th percentile of all daily values from the valid years.
  for (const v of MEAN_VARS) {
    const yearly = [];
    const pooled = [];
    for (const recs of perYear) {
      if (!recs || recs.some(r => r[v] == null)) continue;
      const days = sum(recs.map(r => r.days));
      yearly.push(sum(recs.map(r => r[v] * r.days)) / days);
      for (const r of recs) pooled.push(...r.daily[v]);
    }
    const sufficient = yearly.length >= minYears;
    result[v] = {
      n: yearly.length,
      sufficient,
      mean:     sufficient ? mean(yearly) : null,
      dailyP10: sufficient ? percentile(pooled, SPREAD_LOW_P) : null,
      dailyP90: sufficient ? percentile(pooled, SPREAD_HIGH_P) : null,
    };
  }

  // Totals and counts: summed over the period per year; then mean across years.
  // Spread: 10th–90th percentile of the yearly totals.
  for (const v of ['precip', 'wetDays', 'snowfall', 'snowDays']) {
    const yearly = [];
    let daysCovered = 0;
    for (const recs of perYear) {
      if (!recs || recs.some(r => r[v] == null)) continue;
      yearly.push(sum(recs.map(r => r[v])));
      daysCovered += sum(recs.map(r => r.days));
    }
    const sufficient = yearly.length >= minYears;
    result[v] = {
      n: yearly.length,
      sufficient,
      mean:    sufficient ? mean(yearly) : null,
      yearP10: sufficient ? percentile(yearly, SPREAD_LOW_P) : null,
      yearP90: sufficient ? percentile(yearly, SPREAD_HIGH_P) : null,
    };
    if (v === 'wetDays' || v === 'snowDays') {
      result[v].chance = sufficient && daysCovered ? sum(yearly) / daysCovered : null;
    }
  }

  // Share of possible sunshine (sunshine ÷ daylight).
  const sun = result.sunshine.mean, day = result.daylight.mean;
  result.sunshineShare = sun != null && day ? sun / day : null;

  // Average number of days in one occurrence of the period.
  const valid = perYear.filter(Boolean);
  result.days = valid.length ? mean(valid.map(recs => sum(recs.map(r => r.days)))) : null;

  return result;
}

// Everything the Profile answer needs: 12 monthly normals plus the selected period.
export function computeProfile(daily, { from = 1, to = 12, startYear = REF_START_YEAR, endYear = REF_END_YEAR } = {}) {
  const records = monthRecords(daily);
  const monthly = [];
  for (let m = 1; m <= 12; m++) {
    monthly.push(summarizePeriod(records, { from: m, to: m, startYear, endYear }));
  }
  const period = summarizePeriod(records, { from, to, startYear, endYear });
  return { startYear, endYear, monthly, period };
}
