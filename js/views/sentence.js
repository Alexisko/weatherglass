// The answer as plain sentences, written from computed values only.
import { MONTH_NAMES, isFullYear } from '../stats/months.js';
import { SNOW_DAY_CM } from '../config.js';
import { fmtTemp, fmtHours, fmtPercent } from './format.js';

export function periodPhrases(from, to) {
  if (isFullYear(from, to)) return { lead: 'Over a typical year', within: 'a year' };
  if (from === to) return { lead: `In ${MONTH_NAMES[from - 1]}`, within: `in ${MONTH_NAMES[from - 1]}` };
  return {
    lead: `From ${MONTH_NAMES[from - 1]} to ${MONTH_NAMES[to - 1]}`,
    within: `from ${MONTH_NAMES[from - 1]} to ${MONTH_NAMES[to - 1]}`,
  };
}

function roundDays(v) {
  return v < 1 ? 'less than 1 day' : `about ${Math.round(v)} day${Math.round(v) === 1 ? '' : 's'}`;
}

// Where snow is common, "days with rain" would mislead: precipitation includes melted snow.
export function hasSnow(monthly) {
  return monthly.some(s => s.snowDays.mean != null && s.snowDays.mean >= 0.5);
}

export function precipNoun(snowy) {
  return snowy ? 'rain or snow' : 'rain';
}

export function profileSentences(placeName, period, units, { snowy = false } = {}) {
  const { lead, within } = periodPhrases(period.from, period.to);
  const out = [];

  const hi = period.tmax.mean, lo = period.tmin.mean;
  if (hi != null && lo != null) {
    out.push(`${lead} in ${placeName}, daytime highs average ${fmtTemp(hi, units)} and nights cool to ${fmtTemp(lo, units)}.`);
  }

  const wet = period.wetDays;
  if (wet.mean != null) {
    const what = snowy ? 'Rain or snow (1 mm of water or more)' : 'Rain of 1 mm or more';
    out.push(`${what} falls on ${roundDays(wet.mean)} ${within} (${fmtPercent(wet.chance)} of days).`);
  }

  const snow = period.snowDays;
  if (snow.mean != null && snow.mean >= 1) {
    out.push(`Snow of ${SNOW_DAY_CM} cm or more falls on ${roundDays(snow.mean)}.`);
  }

  if (period.sunshine.mean != null) {
    const share = period.sunshineShare != null ? ` (${fmtPercent(period.sunshineShare)} of daylight)` : '';
    out.push(`The sun shines about ${fmtHours(period.sunshine.mean).replace(' h', ' hours')} a day${share}.`);
  }
  return out;
}
