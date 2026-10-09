// One period control: presets (year, seasons) plus a 12-month strip.
// Tap a month to select it; tap a second month to extend to a range (shorter way round).
import { MONTH_SHORT, MONTH_NAMES, monthsInRange, shorterRange, isFullYear } from '../stats/months.js';

function presets(latitude) {
  const south = latitude < 0;
  return [
    { label: 'Year', from: 1, to: 12 },
    { label: south ? 'Summer' : 'Winter', hint: 'Dec–Feb', from: 12, to: 2 },
    { label: south ? 'Autumn' : 'Spring', hint: 'Mar–May', from: 3, to: 5 },
    { label: south ? 'Winter' : 'Summer', hint: 'Jun–Aug', from: 6, to: 8 },
    { label: south ? 'Spring' : 'Autumn', hint: 'Sep–Nov', from: 9, to: 11 },
  ];
}

export function setupPeriod({ presetsEl, monthsEl, onChange }) {
  let current = { from: 1, to: 12 };
  let anchor = null; // first month of a range being built

  function render(latitude) {
    presetsEl.replaceChildren(...presets(latitude).map(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.from = p.from;
      b.dataset.to = p.to;
      b.textContent = p.label;
      if (p.hint) {
        const hint = document.createElement('span');
        hint.className = 'chip__hint';
        hint.textContent = ` ${p.hint}`;
        b.appendChild(hint);
      }
      b.addEventListener('click', () => { anchor = null; set({ from: p.from, to: p.to }); });
      return b;
    }));
    monthsEl.replaceChildren(...MONTH_SHORT.map((name, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'month';
      b.dataset.month = i + 1;
      b.textContent = name;
      b.setAttribute('aria-label', MONTH_NAMES[i]);
      b.addEventListener('click', () => clickMonth(i + 1));
      return b;
    }));
    paint();
  }

  function clickMonth(m) {
    if (anchor != null && anchor !== m) {
      set(shorterRange(anchor, m));
      anchor = null;
    } else {
      anchor = m;
      set({ from: m, to: m });
    }
  }

  function set(range, { silent = false } = {}) {
    current = isFullYear(range.from, range.to) ? { from: 1, to: 12 } : range;
    paint();
    if (!silent) onChange(current);
  }

  function paint() {
    const sel = new Set(monthsInRange(current.from, current.to));
    const full = isFullYear(current.from, current.to);
    monthsEl.querySelectorAll('.month').forEach(b => {
      const on = !full && sel.has(Number(b.dataset.month));
      b.setAttribute('aria-pressed', String(on));
    });
    presetsEl.querySelectorAll('.chip').forEach(b => {
      const on = Number(b.dataset.from) === current.from && Number(b.dataset.to) === current.to;
      b.setAttribute('aria-pressed', String(on));
    });
  }

  return {
    render,
    set: (range) => { anchor = null; set(range, { silent: true }); },
  };
}
