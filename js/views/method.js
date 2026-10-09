// "How this was computed" notes for the current place and period.
import { fmtCoords, fmtNumber } from './format.js';
import { DATASET, METHODOLOGY_VERSION, WET_DAY_MM, SNOW_DAY_CM } from '../config.js';
import { rangeLabel } from '../stats/months.js';

export function methodItems(profile, meta) {
  const p = profile.period;
  const years = p.tmax.n === p.possibleYears
    ? `${p.possibleYears} years`
    : `${p.tmax.n} of ${p.possibleYears} years (the others failed the completeness rules)`;
  const wraps = p.to < p.from
    ? ` A period that crosses the new year (${rangeLabel(p.from, p.to)}) has ${p.possibleYears} complete occurrences in this window.`
    : '';
  return [
    ['Data', `${DATASET.label}, accessed through the ${DATASET.provider}. ERA5 is a reconstruction of past weather: a weather model constrained by millions of observations. It is not a weather-station record.`],
    ['Period', `Climate normals for ${profile.startYear}–${profile.endYear}, the current standard 30-year reference period of the World Meteorological Organization. This view uses ${years}.${wraps}`],
    ['Location', `Values come from the ERA5 grid cell centred at ${fmtCoords(meta.gridLatitude, meta.gridLongitude)} (cells are about 25–30 km wide). Open-Meteo adjusts temperatures to an elevation of ${fmtNumber(meta.elevation)} m for the exact point. Days follow local time (${meta.timezone}).`],
    ['Definitions', `Rain day: ${WET_DAY_MM.toFixed(1)} mm of precipitation or more. Snow day: ${fmtNumber(SNOW_DAY_CM)} cm of fresh snow or more. "Most days" is the range between the 10th and 90th percentile of daily values, so 8 days in 10 fall inside it. Sunshine is the modelled time with strong direct sunlight (over 120 W/m²).`],
    ['Limits', 'A grid cell smooths out coasts, valleys and city heat, so local extremes are muted. Precipitation is less certain than temperature, especially for thunderstorms, mountains and the tropics.'],
    ['Method', `Methodology version ${METHODOLOGY_VERSION}. Full definitions, sources and known limits are on the methodology page.`],
  ];
}

export function renderMethod(dl, profile, meta) {
  const nodes = [];
  for (const [term, text] of methodItems(profile, meta)) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = text;
    if (term === 'Method') {
      dd.append(' ');
      const a = document.createElement('a');
      a.href = 'methodology.html';
      a.textContent = 'Read the methodology';
      dd.appendChild(a);
    }
    nodes.push(dt, dd);
  }
  dl.replaceChildren(...nodes);
}
