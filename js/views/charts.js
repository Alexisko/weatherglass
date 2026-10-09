// Monthly climate charts as inline SVG. Colours come from CSS tokens (css/tokens.css),
// so both themes work without re-reading styles. Every value shown here is also in
// the month-by-month table; tooltips enhance, they never gate.

import { MONTH_SHORT, MONTH_NAMES } from '../stats/months.js';
import { convertTemp, fmtTemp, fmtDays, fmtPrecip, fmtHours, fmtPercent, fmtNumber, UNIT_SYSTEMS } from './format.js';
import { niceScale } from './scale.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const HEIGHT = 260;
const M = { top: 20, right: 12, bottom: 34, left: 40 };
const BAR_MAX = 24;

function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

function frame(width, selectedMonths, yScale, { yFormat = v => fmtNumber(v) } = {}) {
  const svg = el('svg', { width, height: HEIGHT, viewBox: `0 0 ${width} ${HEIGHT}`, class: 'chart-svg' });
  const plotW = width - M.left - M.right;
  const plotH = HEIGHT - M.top - M.bottom;
  const band = plotW / 12;
  const x = m => M.left + band * (m - 0.5);          // centre of month m (1–12)
  const y = v => M.top + plotH * (1 - (v - yScale.min) / (yScale.max - yScale.min));

  // Selected months: a quiet column behind the data.
  const sel = new Set(selectedMonths.length === 12 ? [] : selectedMonths); // the whole year highlights nothing
  for (let m = 1; m <= 12; m++) {
    if (sel.has(m)) el('rect', { x: M.left + band * (m - 1), y: M.top, width: band, height: plotH, class: 'c-highlight' }, svg);
  }

  // Grid and y-axis labels.
  for (const t of yScale.ticks) {
    el('line', { x1: M.left, x2: width - M.right, y1: y(t), y2: y(t), class: t === 0 ? 'c-baseline' : 'c-grid' }, svg);
    const label = el('text', { x: M.left - 8, y: y(t), class: 'c-tick', 'text-anchor': 'end', 'dominant-baseline': 'middle' }, svg);
    label.textContent = yFormat(t);
  }

  // Month labels (narrow screens get single letters).
  for (let m = 1; m <= 12; m++) {
    const label = el('text', {
      x: x(m), y: HEIGHT - M.bottom + 20, 'text-anchor': 'middle',
      class: sel.has(m) ? 'c-tick c-tick--selected' : 'c-tick',
    }, svg);
    label.textContent = band < 30 ? MONTH_NAMES[m - 1][0] : MONTH_SHORT[m - 1];
  }

  return { svg, x, y, band, plotH, plotW, width };
}

function linePath(points) {
  let d = '', pen = false;
  for (const p of points) {
    if (p.y == null) { pen = false; continue; }
    d += `${pen ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    pen = true;
  }
  return d;
}

function bandPath(points) {
  // Closed area between lo and hi for consecutive months with data.
  const parts = [];
  let run = [];
  const flush = () => {
    if (run.length > 1) {
      const top = run.map(p => `${p.x.toFixed(1)},${p.hi.toFixed(1)}`);
      const bottom = run.slice().reverse().map(p => `${p.x.toFixed(1)},${p.lo.toFixed(1)}`);
      parts.push(`M${top.join('L')}L${bottom.join('L')}Z`);
    }
    run = [];
  };
  for (const p of points) {
    if (p.lo == null || p.hi == null) flush(); else run.push(p);
  }
  flush();
  return parts.join('');
}

// Column with a 4px rounded data end and a square baseline.
function barPath(x, yTop, yBase, w) {
  const h = yBase - yTop;
  if (h <= 0) return '';
  const r = Math.min(4, h, w / 2);
  const l = x - w / 2, rt = x + w / 2;
  return `M${l},${yBase}V${yTop + r}Q${l},${yTop} ${l + r},${yTop}H${rt - r}Q${rt},${yTop} ${rt},${yTop + r}V${yBase}Z`;
}

function dot(svg, cx, cy, cls) {
  el('circle', { cx, cy, r: 4, class: `c-dot ${cls}` }, svg);
}

function directLabel(svg, x, y, text, dy) {
  const t = el('text', { x, y: y + dy, 'text-anchor': 'middle', class: 'c-direct' }, svg);
  t.textContent = text;
}

// ── Temperature ─────────────────────────────────────────
export function drawTemperature(width, monthly, { months, units }) {
  const c = v => convertTemp(v, units);
  const lows = monthly.map(s => c(s.tmin.dailyP10)).filter(v => v != null);
  const highs = monthly.map(s => c(s.tmax.dailyP90)).filter(v => v != null);
  const scale = niceScale(Math.min(...lows), Math.max(...highs), 5);
  const f = frame(width, months, scale, { yFormat: v => `${fmtNumber(v)}°` });
  const { svg, x, y } = f;

  const pts = key => monthly.map((s, i) => ({
    x: x(i + 1),
    y: s[key].mean != null ? y(c(s[key].mean)) : null,
    lo: s[key].dailyP10 != null ? y(c(s[key].dailyP10)) : null,
    hi: s[key].dailyP90 != null ? y(c(s[key].dailyP90)) : null,
  }));
  const hi = pts('tmax'), lo = pts('tmin');

  el('path', { d: bandPath(hi), class: 'c-wash c-wash--high' }, svg);
  el('path', { d: bandPath(lo), class: 'c-wash c-wash--low' }, svg);
  el('path', { d: linePath(hi), class: 'c-line c-line--high' }, svg);
  el('path', { d: linePath(lo), class: 'c-line c-line--low' }, svg);
  hi.forEach(p => p.y != null && dot(svg, p.x, p.y, 'c-dot--high'));
  lo.forEach(p => p.y != null && dot(svg, p.x, p.y, 'c-dot--low'));

  // Direct labels: warmest average high and coldest average low only.
  const means = key => monthly.map(s => s[key].mean);
  const iMax = argExtreme(means('tmax'), (a, b) => a > b);
  const iMin = argExtreme(means('tmin'), (a, b) => a < b);
  if (iMax >= 0) directLabel(svg, hi[iMax].x, hi[iMax].y, fmtTemp(monthly[iMax].tmax.mean, units), -12);
  if (iMin >= 0) directLabel(svg, lo[iMin].x, lo[iMin].y, fmtTemp(monthly[iMin].tmin.mean, units), 22);

  const tooltip = m => {
    const s = monthly[m - 1];
    return [
      { key: 'high', value: fmtTemp(s.tmax.mean, units), label: `average high · most days ${range(s.tmax, units)}` },
      { key: 'low', value: fmtTemp(s.tmin.mean, units), label: `average low · most nights ${range(s.tmin, units)}` },
    ];
  };
  return { ...f, tooltip, label: summaryLabel('Temperature', monthly, s => `high ${fmtTemp(s.tmax.mean, units)}, low ${fmtTemp(s.tmin.mean, units)}`) };
}

function range(stat, units) {
  if (stat.dailyP10 == null) return '–';
  const u = UNIT_SYSTEMS[units].temp;
  return `${fmtNumber(convertTemp(stat.dailyP10, units))} to ${fmtNumber(convertTemp(stat.dailyP90, units))} ${u}`;
}

// ── Rain ────────────────────────────────────────────────
export function drawRain(width, monthly, { months, units, snowy = false }) {
  const vals = monthly.map(s => s.wetDays.mean);
  const scale = niceScale(0, Math.max(1, ...vals.filter(v => v != null)), 4);
  const f = frame(width, months, scale);
  const { svg, x, y, band } = f;
  const w = Math.min(BAR_MAX, band * 0.6);
  vals.forEach((v, i) => {
    if (v != null) el('path', { d: barPath(x(i + 1), y(v), y(0), w), class: 'c-bar c-bar--rain' }, svg);
  });
  const tooltip = m => {
    const s = monthly[m - 1];
    return [
      { key: 'rain', value: `${fmtDays(s.wetDays.mean)} days`, label: snowy ? 'with 1 mm of rain or snow or more' : 'with 1 mm of rain or more' },
      { key: null, value: fmtPrecip(s.precip.mean, units), label: 'total precipitation' },
      { key: null, value: fmtPercent(s.wetDays.chance), label: 'of days' },
    ];
  };
  return { ...f, tooltip, label: summaryLabel(snowy ? 'Days with rain or snow' : 'Days with rain', monthly, s => `${fmtDays(s.wetDays.mean)} days`) };
}

// ── Sunshine ────────────────────────────────────────────
export function drawSunshine(width, monthly, { months }) {
  const day = monthly.map(s => s.daylight.mean);
  const sun = monthly.map(s => s.sunshine.mean);
  const scale = niceScale(0, Math.max(1, ...day.filter(v => v != null)), 4);
  const f = frame(width, months, scale, { yFormat: v => `${fmtNumber(v)} h` });
  const { svg, x, y, band } = f;
  const w = Math.min(BAR_MAX, band * 0.6);
  day.forEach((v, i) => {
    if (v != null) el('path', { d: barPath(x(i + 1), y(v), y(0), w), class: 'c-bar c-bar--daylight' }, svg);
  });
  sun.forEach((v, i) => {
    if (v != null) el('path', { d: barPath(x(i + 1), y(v), y(0), w), class: 'c-bar c-bar--sun' }, svg);
  });
  const tooltip = m => {
    const s = monthly[m - 1];
    return [
      { key: 'sun', value: fmtHours(s.sunshine.mean), label: `sunshine a day (${fmtPercent(s.sunshineShare)} of daylight)` },
      { key: 'daylight', value: fmtHours(s.daylight.mean), label: 'daylight' },
    ];
  };
  return { ...f, tooltip, label: summaryLabel('Sunshine hours per day', monthly, s => fmtHours(s.sunshine.mean)) };
}

function argExtreme(values, better) {
  let best = -1;
  values.forEach((v, i) => { if (v != null && (best < 0 || better(v, values[best]))) best = i; });
  return best;
}

function summaryLabel(title, monthly, describe) {
  return `${title} by month. ` + monthly.map((s, i) => `${MONTH_SHORT[i]}: ${describe(s)}`).join('; ') + '.';
}

// ── Mounting, resizing and hover ────────────────────────
// mountChart(container, draw) renders at the container's width, re-renders on resize,
// and wires a crosshair + tooltip (pointer and arrow keys).
export function mountChart(container, draw) {
  const wrap = document.createElement('div');
  wrap.className = 'chart-wrap';
  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  tip.hidden = true;
  container.replaceChildren(wrap, tip);

  let current = null;
  let active = null;

  const render = () => {
    const width = Math.max(280, Math.floor(container.clientWidth));
    current = draw(width);
    const { svg } = current;
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', current.label);
    svg.setAttribute('tabindex', '0');
    const cross = el('line', { y1: M.top, y2: HEIGHT - M.bottom, class: 'c-cross', visibility: 'hidden' }, svg);
    current.cross = cross;
    wrap.replaceChildren(svg);
    svg.addEventListener('pointermove', e => {
      const rect = svg.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (current.width / rect.width);
      const m = Math.min(12, Math.max(1, Math.floor((px - M.left) / current.band) + 1));
      show(m);
    });
    svg.addEventListener('pointerleave', hide);
    svg.addEventListener('blur', hide);
    svg.addEventListener('focus', () => show(active || 1));
    svg.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.key === 'ArrowRight' ? 1 : -1;
        show(((active || 1) - 1 + step + 12) % 12 + 1);
      } else if (e.key === 'Escape') hide();
    });
  };

  function show(m) {
    active = m;
    const cx = current.x(m);
    current.cross.setAttribute('x1', cx);
    current.cross.setAttribute('x2', cx);
    current.cross.setAttribute('visibility', 'visible');
    const rows = current.tooltip(m);
    const title = document.createElement('div');
    title.className = 'chart-tip__title';
    title.textContent = MONTH_NAMES[m - 1];
    const list = rows.map(r => {
      const row = document.createElement('div');
      row.className = 'chart-tip__row';
      const key = document.createElement('span');
      key.className = r.key ? `chart-tip__key chart-tip__key--${r.key}` : 'chart-tip__key chart-tip__key--none';
      const value = document.createElement('strong');
      value.textContent = r.value;
      const label = document.createElement('span');
      label.textContent = ` ${r.label}`;
      row.append(key, value, label);
      return row;
    });
    tip.replaceChildren(title, ...list);
    tip.hidden = false;
    // Keep the tooltip inside the card.
    const scaleX = container.clientWidth / current.width;
    const tipW = tip.offsetWidth;
    let left = cx * scaleX + 12;
    if (left + tipW > container.clientWidth) left = cx * scaleX - tipW - 12;
    tip.style.left = `${Math.max(0, left)}px`;
    tip.style.top = `${M.top}px`;
  }

  function hide() {
    tip.hidden = true;
    if (current?.cross) current.cross.setAttribute('visibility', 'hidden');
  }

  render();
  let frameId = 0;
  let lastWidth = container.clientWidth;
  const ro = new ResizeObserver(() => {
    if (container.clientWidth === lastWidth) return;
    lastWidth = container.clientWidth;
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(() => { hide(); render(); });
  });
  ro.observe(container);
  return { destroy: () => ro.disconnect() };
}
