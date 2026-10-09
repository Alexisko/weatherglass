// Small numeric helpers shared by the statistics modules. Pure functions only.

export function mean(values) {
  let total = 0, n = 0;
  for (const v of values) {
    if (v == null || Number.isNaN(v)) continue;
    total += v; n++;
  }
  return n ? total / n : null;
}

export function sum(values) {
  let total = 0;
  for (const v of values) if (v != null && !Number.isNaN(v)) total += v;
  return total;
}

// Percentile with linear interpolation between order statistics
// (Hyndman & Fan type 7, the default in R, NumPy and spreadsheets).
// p is a fraction in [0, 1]. Nulls are ignored. Returns null for no data.
export function percentile(values, p) {
  const a = values.filter(v => v != null && !Number.isNaN(v)).sort((x, y) => x - y);
  if (!a.length) return null;
  if (a.length === 1) return a[0];
  const h = (a.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.min(lo + 1, a.length - 1);
  return a[lo] + (h - lo) * (a[hi] - a[lo]);
}
