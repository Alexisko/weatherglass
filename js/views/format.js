// Unit conversion and number formatting. Values are stored in metric
// (°C, mm, cm, hours) and converted only for display.

export const UNIT_SYSTEMS = {
  metric:   { temp: '°C', precip: 'mm', snow: 'cm' },
  imperial: { temp: '°F', precip: 'in', snow: 'in' },
};

export function convertTemp(c, units) {
  if (c == null) return null;
  return units === 'imperial' ? c * 9 / 5 + 32 : c;
}
export function convertPrecip(mm, units) {
  if (mm == null) return null;
  return units === 'imperial' ? mm / 25.4 : mm;
}
export function convertSnow(cm, units) {
  if (cm == null) return null;
  return units === 'imperial' ? cm / 2.54 : cm;
}

const DASH = '–';

export function fmtNumber(v, digits = 0) {
  if (v == null || Number.isNaN(v)) return DASH;
  const out = v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return out === '-0' ? '0' : out.replace(/^-/, '−');
}

export function fmtTemp(c, units, digits = 0) {
  if (c == null) return DASH;
  return `${fmtNumber(convertTemp(c, units), digits)} ${UNIT_SYSTEMS[units].temp}`;
}

export function fmtPrecip(mm, units) {
  if (mm == null) return DASH;
  const v = convertPrecip(mm, units);
  const digits = units === 'imperial' ? (v < 10 ? 1 : 0) : 0;
  return `${fmtNumber(v, digits)} ${UNIT_SYSTEMS[units].precip}`;
}

export function fmtSnow(cm, units) {
  if (cm == null) return DASH;
  return `${fmtNumber(convertSnow(cm, units), 0)} ${UNIT_SYSTEMS[units].snow}`;
}

// Day counts: whole days from 10 up, one decimal below (e.g. 0.4, 6.2, 12).
export function fmtDays(v) {
  if (v == null) return DASH;
  return fmtNumber(v, v < 10 ? 1 : 0);
}

export function fmtHours(v) {
  if (v == null) return DASH;
  return `${fmtNumber(v, 1)} h`;
}

export function fmtPercent(fraction) {
  if (fraction == null) return DASH;
  return `${fmtNumber(fraction * 100, 0)} %`;
}

export function fmtCoords(lat, lon) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lon).toFixed(2)}° ${ew}`;
}

export function placeLabel(place) {
  return [place.admin1 && place.admin1 !== place.name ? place.admin1 : null, place.country]
    .filter(Boolean).join(', ');
}
