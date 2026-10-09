// Data-completeness rules (WMO-No. 1203). Each takes the daily values of one
// calendar month (nulls = missing) and the number of days that month should have.
import { MAX_MISSING_DAYS, MAX_CONSECUTIVE_MISSING } from '../config.js';

function missingStats(values, expectedDays) {
  let missing = Math.max(0, expectedDays - values.length);
  let run = missing; // absent trailing days count as one consecutive gap
  let maxRun = run;
  for (const v of values) {
    if (v == null || Number.isNaN(v)) {
      missing++; run++;
      if (run > maxRun) maxRun = run;
    } else {
      run = 0;
    }
  }
  return { missing, maxRun };
}

// Means (temperature, sunshine per day): the "3/5 rule".
export function validForMean(values, expectedDays) {
  const { missing, maxRun } = missingStats(values, expectedDays);
  return missing <= MAX_MISSING_DAYS && maxRun <= MAX_CONSECUTIVE_MISSING;
}

// Totals and counts (precipitation, wet days, snow): every day must be present,
// otherwise the total is biased low.
export function validForTotal(values, expectedDays) {
  return missingStats(values, expectedDays).missing === 0;
}
