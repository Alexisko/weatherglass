// Key figures for the selected period: one tile per question people ask most.
import { fmtTemp, fmtDays, fmtPrecip, fmtHours, fmtPercent, fmtSnow, convertTemp, fmtNumber, UNIT_SYSTEMS } from './format.js';
import { precipNoun } from './sentence.js';
import { rangeLabel, isFullYear } from '../stats/months.js';

function spread(stat, units) {
  if (stat.dailyP10 == null) return '';
  const u = UNIT_SYSTEMS[units].temp;
  return `${fmtNumber(convertTemp(stat.dailyP10, units))} to ${fmtNumber(convertTemp(stat.dailyP90, units))} ${u}`;
}

export function figureData(period, units, { snowy = false } = {}) {
  const within = isFullYear(period.from, period.to) ? 'a year' : `in ${rangeLabel(period.from, period.to)}`;
  const tiles = [
    {
      label: 'Daytime high',
      value: fmtTemp(period.tmax.mean, units),
      sub: period.tmax.dailyP10 != null ? `Most days ${spread(period.tmax, units)}` : 'Not enough data',
    },
    {
      label: 'Night low',
      value: fmtTemp(period.tmin.mean, units),
      sub: period.tmin.dailyP10 != null ? `Most nights ${spread(period.tmin, units)}` : 'Not enough data',
    },
    {
      label: `Days with ${precipNoun(snowy)} ${within}`,
      value: period.wetDays.mean != null ? `${fmtDays(period.wetDays.mean)}` : '–',
      sub: period.wetDays.mean != null
        ? `${fmtPercent(period.wetDays.chance)} chance a day · ${fmtPrecip(period.precip.mean, units)} in total`
        : 'Not enough data',
    },
    {
      label: 'Sunshine a day',
      value: fmtHours(period.sunshine.mean),
      sub: period.daylight.mean != null
        ? `Out of ${fmtHours(period.daylight.mean)} of daylight (${fmtPercent(period.sunshineShare)})`
        : '',
    },
  ];
  if (period.snowDays.mean != null && period.snowDays.mean >= 0.5) {
    tiles.push({
      label: `Days with snow ${within}`,
      value: fmtDays(period.snowDays.mean),
      sub: `${fmtSnow(period.snowfall.mean, units)} of fresh snow in total`,
    });
  }
  return tiles;
}

export function renderFigures(container, period, units, opts) {
  const nodes = figureData(period, units, opts).map(t => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    const label = document.createElement('div');
    label.className = 'tile__label';
    label.textContent = t.label;
    const value = document.createElement('div');
    value.className = 'tile__value';
    value.textContent = t.value;
    const sub = document.createElement('div');
    sub.className = 'tile__sub';
    sub.textContent = t.sub;
    tile.append(label, value, sub);
    return tile;
  });
  container.replaceChildren(...nodes);
}
