// The query spec: the single description of "what is being asked".
// Contract: schema/query-spec.schema.json. The URL, the UI controls and (Phase 3)
// the AI parser all produce a spec; the engine only ever consumes a validated spec.

import { isFullYear } from '../stats/months.js';

export const ANSWER_TYPES = ['profile'];

export function makeProfileSpec(place, months = { from: 1, to: 12 }) {
  return normalizeSpec({ type: 'profile', place, months });
}

// Returns { ok: true, spec } with a normalised copy, or { ok: false, errors }.
export function validateSpec(input) {
  const errors = [];
  if (!input || typeof input !== 'object') return { ok: false, errors: ['spec must be an object'] };
  if (!ANSWER_TYPES.includes(input.type)) errors.push(`unknown type "${input.type}"`);

  const p = input.place;
  if (!p || typeof p !== 'object') {
    errors.push('place is required');
  } else {
    if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 120) errors.push('place.name is invalid');
    if (!isNum(p.latitude) || p.latitude < -90 || p.latitude > 90) errors.push('place.latitude is invalid');
    if (!isNum(p.longitude) || p.longitude < -180 || p.longitude > 180) errors.push('place.longitude is invalid');
    for (const k of ['country', 'admin1']) {
      if (p[k] != null && (typeof p[k] !== 'string' || p[k].length > 120)) errors.push(`place.${k} is invalid`);
    }
  }

  const m = input.months;
  if (!m || !isMonth(m.from) || !isMonth(m.to)) errors.push('months.from and months.to must be integers 1–12');

  if (errors.length) return { ok: false, errors };
  return { ok: true, spec: normalizeSpec(input) };
}

function normalizeSpec(s) {
  const place = {
    name: s.place.name.trim(),
    latitude: round(s.place.latitude, 4),
    longitude: round(s.place.longitude, 4),
  };
  if (s.place.country) place.country = s.place.country;
  if (s.place.admin1) place.admin1 = s.place.admin1;
  let { from, to } = s.months;
  if (isFullYear(from, to)) { from = 1; to = 12; } // any 12-month span is "the year"
  return { type: s.type, place, months: { from, to } };
}

// ── URL ⇄ spec ───────────────────────────────────────────
export function specToParams(spec) {
  const q = new URLSearchParams();
  q.set('q', spec.type);
  q.set('place', spec.place.name);
  if (spec.place.admin1) q.set('admin1', spec.place.admin1);
  if (spec.place.country) q.set('country', spec.place.country);
  q.set('lat', String(spec.place.latitude));
  q.set('lon', String(spec.place.longitude));
  q.set('from', String(spec.months.from));
  q.set('to', String(spec.months.to));
  return q;
}

export function paramsToSpec(params) {
  if (!params.get('place')) return null;
  const result = validateSpec({
    type: params.get('q') || 'profile',
    place: {
      name: params.get('place'),
      admin1: params.get('admin1') || undefined,
      country: params.get('country') || undefined,
      latitude: Number(params.get('lat')),
      longitude: Number(params.get('lon')),
    },
    months: {
      from: Number(params.get('from') || 1),
      to: Number(params.get('to') || 12),
    },
  });
  return result.ok ? result.spec : null;
}

function isNum(v) { return typeof v === 'number' && Number.isFinite(v); }
function isMonth(v) { return Number.isInteger(v) && v >= 1 && v <= 12; }
function round(v, d) { const f = 10 ** d; return Math.round(v * f) / f; }
