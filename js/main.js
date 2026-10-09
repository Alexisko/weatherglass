// Weatherglass: wires the URL (query spec), the controls and the Profile answer.
import { fetchReferenceSeries } from './api/archive.js';
import { computeProfile } from './stats/profile.js';
import { monthsInRange } from './stats/months.js';
import { makeProfileSpec, paramsToSpec, specToParams } from './query/spec.js';
import { fmtCoords, placeLabel, fmtNumber } from './views/format.js';
import { profileSentences, hasSnow, precipNoun } from './views/sentence.js';
import { renderFigures } from './views/figures.js';
import { mountChart, drawTemperature, drawRain, drawSunshine } from './views/charts.js';
import { renderTable, tableCsv } from './views/table.js';
import { renderMethod } from './views/method.js';
import { setupThemeToggle, setupUnitsToggle, getUnits } from './ui/prefs.js';
import { setupSearch } from './ui/search.js';
import { setupPeriod } from './ui/period.js';

const $ = id => document.getElementById(id);

const state = {
  spec: null,
  series: null,     // { meta, daily } for state.seriesKey
  seriesKey: null,
  profile: null,
  units: getUnits(),
  charts: [],
  loadToken: 0,
};

// ── Controls ─────────────────────────────────────────────
setupThemeToggle($('themeToggle'));
setupUnitsToggle($('unitsToggle'), units => {
  state.units = units;
  if (seriesReady()) renderProfile();
});
setupSearch({
  input: $('placeInput'),
  listbox: $('placeOptions'),
  onSelect: place => go(makeProfileSpec(place), { push: true }),
});
const period = setupPeriod({
  presetsEl: $('periodPresets'),
  monthsEl: $('periodMonths'),
  onChange: months => {
    state.spec = { ...state.spec, months };
    history.replaceState(null, '', `?${specToParams(state.spec)}`);
    if (seriesReady()) renderProfile();
  },
});

document.querySelectorAll('[data-example]').forEach(b => b.addEventListener('click', () => {
  const d = b.dataset;
  go(makeProfileSpec({
    name: d.name, country: d.country, admin1: d.admin1 || undefined,
    latitude: Number(d.lat), longitude: Number(d.lon),
  }), { push: true });
}));

$('retryBtn').addEventListener('click', () => state.spec && load(state.spec, { force: true }));
$('csvBtn').addEventListener('click', downloadCsv);
window.addEventListener('popstate', route);

// ── Routing ──────────────────────────────────────────────
function route() {
  const spec = paramsToSpec(new URLSearchParams(location.search));
  if (spec) load(spec); else showHome();
}

function go(spec, { push = false } = {}) {
  history[push ? 'pushState' : 'replaceState'](null, '', `?${specToParams(spec)}`);
  load(spec);
}

function showHome() {
  state.spec = null;
  $('home').hidden = false;
  $('profile').hidden = true;
  document.title = 'Weatherglass · Climate, clearly';
}

// True only when the loaded series belongs to the place currently shown.
function seriesReady() {
  return Boolean(state.spec && state.series && state.seriesKey === keyOf(state.spec.place));
}

function keyOf(place) {
  return `${place.latitude.toFixed(2)},${place.longitude.toFixed(2)}`;
}

async function load(spec, { force = false } = {}) {
  state.spec = spec;
  $('home').hidden = true;
  $('profile').hidden = false;
  renderHeading(spec);
  period.render(spec.place.latitude);
  period.set(spec.months);

  const key = keyOf(spec.place);
  if (!force && seriesReady()) { renderProfile(); return; }

  const token = ++state.loadToken;
  setError(null);
  const content = $('profileContent');
  const hadContent = !content.hidden;
  content.classList.add('is-loading');
  setStatus(`Loading 30 years of daily data for ${spec.place.name}…`);
  try {
    const series = await fetchReferenceSeries(spec.place);
    if (token !== state.loadToken) return;
    state.series = series;
    state.seriesKey = key;
    setStatus('');
    renderProfile();
  } catch (err) {
    if (token !== state.loadToken) return;
    console.error(err);
    setStatus('');
    if (!hadContent) content.hidden = true;
    setError(err.message || 'The climate data could not be loaded.');
  } finally {
    if (token === state.loadToken) content.classList.remove('is-loading');
  }
}

// ── Rendering ────────────────────────────────────────────
function renderHeading(spec) {
  const { place } = spec;
  $('placeName').textContent = place.name;
  const parts = [placeLabel(place), fmtCoords(place.latitude, place.longitude)].filter(Boolean);
  $('placeMeta').textContent = parts.join(' · ');
  document.title = `${place.name} climate · Weatherglass`;
}

function renderProfile() {
  const { spec, series, units } = state;
  const { from, to } = spec.months;
  try {
    state.profile = computeProfile(series.daily, { from, to });
    const { profile } = state;
    const months = monthsInRange(from, to);

    $('placeSource').textContent =
      `1991–2020 normals · ERA5 reanalysis · elevation ${fmtNumber(series.meta.elevation)} m`;

    const snowy = hasSnow(profile.monthly);
    const sentences = profileSentences(spec.place.name, profile.period, units, { snowy });
    $('answerText').textContent = sentences.join(' ');
    renderFigures($('figures'), profile.period, units, { snowy });
    $('rainTitle').textContent = `Days with ${precipNoun(snowy)}`;
    $('rainSub').textContent = `Average number of days a month with 1 mm of ${snowy ? 'rain or melted snow' : 'rain'} or more.`;

    state.charts.forEach(c => c.destroy());
    const opts = { months, units, snowy };
    state.charts = [
      mountChart($('chartTemp'), w => drawTemperature(w, profile.monthly, opts)),
      mountChart($('chartRain'), w => drawRain(w, profile.monthly, opts)),
      mountChart($('chartSun'), w => drawSunshine(w, profile.monthly, opts)),
    ];
    $('tempUnit').textContent = units === 'imperial' ? '°F' : '°C';

    renderTable($('monthTable'), profile, { from, to, units });
    renderMethod($('methodList'), profile, series.meta);
    $('profileContent').hidden = false;
  } catch (err) {
    console.error(err);
    setError('Something went wrong while computing this page. Please try again.');
  }
}

function setStatus(text) {
  $('status').textContent = text;
  $('status').hidden = !text;
}

function setError(text) {
  $('errorBox').hidden = !text;
  $('errorText').textContent = text || '';
}

function downloadCsv() {
  if (!state.profile) return;
  const csv = tableCsv(state.profile, { ...state.spec.months, units: state.units }, state.spec.place);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const slug = state.spec.place.name.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
  a.download = `weatherglass-${slug || 'place'}-1991-2020.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

route();
