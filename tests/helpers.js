// Deterministic synthetic daily series in the normalised archive format.
export function syntheticDaily({ start = 1991, end = 2020, fn }) {
  const out = { time: [], tmax: [], tmin: [], precip: [], snowfall: [], sunshine: [], daylight: [] };
  for (let t = Date.UTC(start, 0, 1); t <= Date.UTC(end, 11, 31); t += 86400000) {
    const d = new Date(t);
    const date = d.toISOString().slice(0, 10);
    const row = fn({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), date });
    out.time.push(date);
    for (const k of Object.keys(out)) if (k !== 'time') out[k].push(row[k] ?? null);
  }
  return out;
}

// Constant climate with a known rain pattern: 2 mm on days 5, 10, 15… else 0.5 mm.
export const constantClimate = ({ day }) => ({
  tmax: 20, tmin: 10, precip: day % 5 === 0 ? 2 : 0.5,
  snowfall: 0, sunshine: 8, daylight: 12,
});
