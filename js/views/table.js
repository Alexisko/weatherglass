// Month-by-month table (the accessible twin of the charts) and its CSV export.
import { MONTH_SHORT, rangeLabel, monthsInRange, isFullYear } from '../stats/months.js';
import { hasSnow } from './sentence.js';
import { convertTemp, convertPrecip, fmtNumber, UNIT_SYSTEMS } from './format.js';

function rows(units, profile) {
  const snowy = hasSnow(profile.monthly);
  const anySnow = profile.monthly.some(s => (s.snowDays.mean ?? 0) >= 0.05);
  const u = UNIT_SYSTEMS[units];
  const t = v => convertTemp(v, units);
  const p = v => convertPrecip(v, units);
  const pDigits = units === 'imperial' ? 1 : 0;
  return [
    { label: `Average high (${u.temp})`, get: s => t(s.tmax.mean), digits: 1 },
    { label: `Average low (${u.temp})`, get: s => t(s.tmin.mean), digits: 1 },
    { label: `Highs on most days (${u.temp})`, get: s => [t(s.tmax.dailyP10), t(s.tmax.dailyP90)], digits: 0 },
    { label: `Lows on most nights (${u.temp})`, get: s => [t(s.tmin.dailyP10), t(s.tmin.dailyP90)], digits: 0 },
    { label: `Precipitation (${u.precip})`, get: s => p(s.precip.mean), digits: pDigits, total: true },
    { label: snowy ? 'Days with rain or snow (≥ 1 mm)' : 'Days with rain (≥ 1 mm)', get: s => s.wetDays.mean, digits: 1, total: true },
    ...(anySnow ? [{ label: 'Days with snow (≥ 1 cm)', get: s => s.snowDays.mean, digits: 1, total: true }] : []),
    { label: 'Sunshine (hours a day)', get: s => s.sunshine.mean, digits: 1 },
    { label: 'Daylight (hours a day)', get: s => s.daylight.mean, digits: 1 },
  ];
}

// Ranges read "12–18"; with a negative end they read "−8 to −2" to avoid a dash next to a minus.
function cell(v, digits) {
  if (Array.isArray(v)) {
    if (v.some(x => x == null)) return '–';
    const [a, b] = v.map(x => fmtNumber(x, digits));
    return v[0] < -0.5 || v[1] < -0.5 ? `${a} to ${b}` : `${a}–${b}`;
  }
  return fmtNumber(v, digits);
}

export function renderTable(table, profile, { from, to, units }) {
  const sel = new Set(isFullYear(from, to) ? [] : monthsInRange(from, to));
  const periodName = rangeLabel(from, to);

  const caption = document.createElement('caption');
  caption.textContent = `Monthly climate normals, ${profile.startYear}–${profile.endYear}`;

  const thead = document.createElement('thead');
  const hr = thead.insertRow();
  const corner = document.createElement('th');
  corner.scope = 'col';
  corner.textContent = 'Measure';
  hr.appendChild(corner);
  MONTH_SHORT.forEach((name, i) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = name;
    if (sel.has(i + 1)) th.className = 'is-selected';
    hr.appendChild(th);
  });
  const pth = document.createElement('th');
  pth.scope = 'col';
  pth.className = 'col-period';
  pth.textContent = periodName;
  hr.appendChild(pth);

  const tbody = document.createElement('tbody');
  for (const r of rows(units, profile)) {
    const tr = tbody.insertRow();
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = r.label;
    tr.appendChild(th);
    profile.monthly.forEach((s, i) => {
      const td = tr.insertCell();
      td.textContent = cell(r.get(s), r.digits);
      if (sel.has(i + 1)) td.className = 'is-selected';
    });
    const td = tr.insertCell();
    td.className = 'col-period';
    td.textContent = cell(r.get(profile.period), r.digits);
  }
  table.replaceChildren(caption, thead, tbody);
}

export function tableCsv(profile, { from, to, units }, place) {
  const header = ['Measure', ...MONTH_SHORT, `${rangeLabel(from, to)} (selected)`];
  const lines = [header];
  for (const r of rows(units, profile)) {
    const fmt = v => (Array.isArray(v)
      ? v.map(x => (x == null ? '' : x.toFixed(r.digits))).join(' to ')
      : v == null ? '' : v.toFixed(Math.max(1, r.digits)));
    lines.push([r.label, ...profile.monthly.map(s => fmt(r.get(s))), fmt(r.get(profile.period))]);
  }
  const quote = v => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const meta = [
    `# Weatherglass climate normals for ${place.name} (${place.latitude}, ${place.longitude})`,
    `# ERA5 reanalysis via Open-Meteo, ${profile.startYear}-${profile.endYear}. Selected-period column: totals for precipitation and day counts, averages otherwise.`,
  ];
  return meta.join('\n') + '\n' + lines.map(l => l.map(quote).join(',')).join('\n') + '\n';
}
