// "Nice" axis scales: round tick steps (1, 2, 2.5, 5 × 10^n) covering [min, max].
export function niceScale(min, max, targetTicks = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1, ticks: [0, 1] };
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / Math.max(1, targetTicks - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(s => s >= raw);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  return { min: lo, max: hi, ticks, step };
}
