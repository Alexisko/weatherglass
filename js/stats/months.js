// Calendar-month helpers. Months are numbered 1–12.

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_SHORT = MONTH_NAMES.map(m => m.slice(0, 3));

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Months from `from` to `to` inclusive, wrapping over the year end (Nov→Feb = 11,12,1,2).
export function monthsInRange(from, to) {
  const out = [];
  let m = from;
  for (;;) {
    out.push(m);
    if (m === to) break;
    m = (m % 12) + 1;
  }
  return out;
}

export function isFullYear(from, to) {
  return monthsInRange(from, to).length === 12;
}

// A period that wraps the year end (e.g. Dec–Feb) is labelled by the year it starts in.
export function periodYearOf(year, month, from, to) {
  return to < from && month < from ? year - 1 : year;
}

// Range between two clicked months, taking the shorter way round the calendar.
// Jun then Mar → Mar–Jun; Nov then Feb → Nov–Feb. Ties go forward from the first click.
export function shorterRange(a, b) {
  const forward = ((b - a + 12) % 12) + 1;
  const backward = ((a - b + 12) % 12) + 1;
  return forward <= backward ? { from: a, to: b } : { from: b, to: a };
}

export function rangeLabel(from, to, { long = false } = {}) {
  const names = long ? MONTH_NAMES : MONTH_SHORT;
  if (isFullYear(from, to)) return 'Year';
  if (from === to) return names[from - 1];
  return `${names[from - 1]}–${names[to - 1]}`;
}
