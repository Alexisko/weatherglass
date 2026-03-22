/* ═══════════════════════════════════════════════════════════
   WEATHERGLASS — app.js
   Search UI + geocoding (climate API integration next)
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ── API endpoints ─────────────────────────────────────────
const GEO_API     = 'https://geocoding-api.open-meteo.com/v1/search';
const CLIMATE_API = 'https://climate-api.open-meteo.com/v1/climate';

// ── App state ─────────────────────────────────────────────
const state = {
  location: null,   // { name, latitude, longitude, country, admin1 }
  period:   { type: 'annual', value: null },  // type: 'annual'|'quarter'|'month'
  rawData:  null,   // cached full 10-year API response
};

// ── DOM refs ──────────────────────────────────────────────
const $  = id => document.getElementById(id);
const locationInput  = $('locationInput');
const suggestions    = $('suggestions');
const locationCard   = $('locationCard');
const locationName   = $('locationName');
const locationMeta   = $('locationMeta');
const exploreBtn     = $('exploreBtn');
const results        = $('results');
const resultsLoading = $('resultsLoading');
const resultsContent = $('resultsContent');
const resultsError   = $('resultsError');
const resultsErrorMsg= $('resultsErrorMsg');
const resultsBanner  = $('resultsBanner');
const kpiStrip       = $('kpiStrip');
const chartsGrid     = $('chartsGrid');
const retryBtn       = $('retryBtn');
const timeOpts = document.querySelectorAll('.time-opt');

// ── Search / Geocoding ────────────────────────────────────
let debounceTimer = null;
let activeIndex   = -1;

locationInput.addEventListener('input', () => {
  const q = locationInput.value.trim();
  clearTimeout(debounceTimer);
  if (q.length < 2) { hideSuggestions(); return; }
  debounceTimer = setTimeout(() => fetchLocations(q), 260);
});

locationInput.addEventListener('keydown', e => {
  const items = [...suggestions.querySelectorAll('.suggestion')];
  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIndex = Math.min(activeIndex + 1, items.length - 1);
    updateActive(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIndex = Math.max(activeIndex - 1, -1);
    updateActive(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const active = items[activeIndex];
    if (active) pickLocation(active);
  } else if (e.key === 'Escape') {
    hideSuggestions();
    locationInput.blur();
  }
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) hideSuggestions();
});

function updateActive(items) {
  items.forEach((el, i) => el.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false'));
  if (activeIndex >= 0) items[activeIndex].scrollIntoView({ block: 'nearest' });
}

async function fetchLocations(query) {
  try {
    const url = `${GEO_API}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error('Geocoding request failed');
    const data = await res.json();
    renderSuggestions(data.results || []);
  } catch (err) {
    console.error('Geocoding error:', err);
    hideSuggestions();
  }
}

function renderSuggestions(results) {
  if (!results.length) { hideSuggestions(); return; }

  activeIndex = -1;
  suggestions.innerHTML = results.map(r => {
    const parts  = [r.admin1, r.country].filter(Boolean);
    const detail = parts.join(' · ');
    return `
      <li class="suggestion"
          role="option"
          aria-selected="false"
          data-name="${esc(r.name)}"
          data-lat="${r.latitude}"
          data-lon="${r.longitude}"
          data-country="${esc(r.country || '')}"
          data-admin="${esc(r.admin1 || '')}"
          data-detail="${esc(detail)}">
        <span class="suggestion__name">${escHtml(r.name)}</span>
        <span class="suggestion__detail">${escHtml(detail)}</span>
      </li>`;
  }).join('');

  suggestions.querySelectorAll('.suggestion').forEach(el =>
    el.addEventListener('click', () => pickLocation(el))
  );

  suggestions.removeAttribute('hidden');
  locationInput.setAttribute('aria-expanded', 'true');
}

function pickLocation(el) {
  state.location = {
    name:      el.dataset.name,
    latitude:  parseFloat(el.dataset.lat),
    longitude: parseFloat(el.dataset.lon),
    country:   el.dataset.country,
    admin1:    el.dataset.admin,
    detail:    el.dataset.detail,
  };

  locationInput.value = state.location.name;
  hideSuggestions();
  showLocationCard();
}

function showLocationCard() {
  const { name, latitude, longitude, detail } = state.location;
  const latStr = `${Math.abs(latitude).toFixed(3)}°${latitude >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(longitude).toFixed(3)}°${longitude >= 0 ? 'E' : 'W'}`;

  locationName.textContent = name;
  locationMeta.textContent = `${detail ? detail + '  ·  ' : ''}${latStr}  ${lonStr}`;

  locationCard.removeAttribute('hidden');
  exploreBtn.removeAttribute('hidden');
}

function hideSuggestions() {
  suggestions.setAttribute('hidden', '');
  locationInput.setAttribute('aria-expanded', 'false');
  activeIndex = -1;
}

// ── Time picker ───────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const QUARTER_LABELS = { 1:'Jan–Mar', 2:'Apr–Jun', 3:'Jul–Sep', 4:'Oct–Dec' };

timeOpts.forEach(btn => {
  btn.addEventListener('click', () => {
    timeOpts.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const type  = btn.dataset.type;
    const value = btn.dataset.value ? parseInt(btn.dataset.value) : null;
    state.period = { type, value };

    if (state.rawData) renderResults(state.rawData);
  });
});

// ── Explore ───────────────────────────────────────────────
exploreBtn.addEventListener('click', loadClimate);
retryBtn.addEventListener('click', loadClimate);

async function loadClimate() {
  if (!state.location) return;

  state.rawData = null;
  state.period  = { type: 'annual', value: null };
  timeOpts.forEach(b => b.classList.toggle('active', b.dataset.type === 'annual' && !b.dataset.value));

  results.removeAttribute('hidden');
  resultsLoading.removeAttribute('hidden');
  resultsContent.setAttribute('hidden', '');
  resultsError.setAttribute('hidden', '');

  results.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const data    = await fetchClimateData();
    state.rawData = data;
    renderResults(data);
  } catch (err) {
    console.error('Climate API error:', err);
    resultsLoading.setAttribute('hidden', '');
    resultsError.removeAttribute('hidden');
    resultsErrorMsg.textContent = err.message || 'Failed to load climate data. Please try again.';
  }
}

// ── Climate API ───────────────────────────────────────────
// Always fetches the full 2013–2022 decade. Period filtering happens client-side
// so switching month/quarter/annual never triggers a new request.

async function fetchClimateData() {
  const { latitude, longitude } = state.location;
  const params = new URLSearchParams({
    latitude:   String(latitude),
    longitude:  String(longitude),
    start_date: '2013-01-01',
    end_date:   '2022-12-31',
    models:     'EC_Earth3P_HR',
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'cloud_cover_mean',
      'wind_speed_10m_mean',
      'relative_humidity_2m_mean',
    ].join(','),
    timezone: 'UTC',
  });

  const url = `${CLIMATE_API}?${params}`;
  const res  = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.reason || `API error ${res.status}`);
  }
  return res.json();
}

// ── Render results ────────────────────────────────────────

// Filters a raw daily object to only rows whose date falls in monthSet (Set of 1–12)
function filterToMonths(rawDaily, monthSet) {
  const keep = rawDaily.time.map(d => monthSet.has(parseInt(d.substring(5, 7))));
  const out  = {};
  for (const key of Object.keys(rawDaily)) {
    out[key] = Array.isArray(rawDaily[key])
      ? rawDaily[key].filter((_, i) => keep[i])
      : rawDaily[key];
  }
  return out;
}

function renderResults(data) {
  resultsLoading.setAttribute('hidden', '');

  if (!data.daily || !data.daily.time || !data.daily.time.length) {
    throw new Error('No climate data returned for this location and period.');
  }

  const monthSet = new Set(includedMonths(state.period));
  const daily    = filterToMonths(data.daily, monthSet);

  if (!daily.time.length) {
    throw new Error('No data for the selected period.');
  }

  const temps_max   = daily.temperature_2m_max;
  const temps_min   = daily.temperature_2m_min;
  const precip      = daily.precipitation_sum;
  const cloud_cover = daily.cloud_cover_mean;
  const wind        = daily.wind_speed_10m_mean;
  const humidity    = daily.relative_humidity_2m_mean;
  const dates       = daily.time;

  // ── Derived stats ──────────────────────────────────────
  const validMax      = temps_max.filter(v => v != null);
  const validMin      = temps_min.filter(v => v != null);
  const validPrecip   = precip.filter(v => v != null);
  const validCloud    = cloud_cover.filter(v => v != null);
  const validWind     = wind.filter(v => v != null);

  const avgMax        = mean(validMax);
  const avgMin        = mean(validMin);
  const avgPrecip     = sum(validPrecip) / 10;  // per-year average across 10-year window
  const rainDays      = precip.filter(v => v != null && v > 0).length;
  const rainDayPct    = Math.round((rainDays / dates.length) * 100);
  const avgCloud      = mean(validCloud);
  const avgWind       = mean(validWind);

  // Calendar-month aggregation for charts
  const calAvg  = computeCalendarMonthAvg(dates, { temps_max, temps_min, precip, cloud_cover, humidity });
  const months  = includedMonths(state.period);
  const mLabels = months.map(m => MONTH_NAMES[m - 1].slice(0, 3));

  // ── Banner ─────────────────────────────────────────────
  const { name, detail, latitude, longitude } = state.location;
  const latStr = `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? 'E' : 'W'}`;
  const { type, value } = state.period;
  const label = type === 'annual' ? 'Annual'
    : type === 'quarter' ? `Q${value} · ${QUARTER_LABELS[value]}`
    : MONTH_NAMES[value - 1];

  resultsBanner.innerHTML = `
    <div>
      <div class="results__banner-name">${escHtml(name)}</div>
      <div class="results__banner-coords">${escHtml(detail || '')}  ·  ${latStr}  ${lonStr}</div>
    </div>
    <div class="results__banner-range">${label} · EC_Earth3P_HR · 2013–2022</div>
  `;

  // ── KPIs ───────────────────────────────────────────────
  const kpis = [
    {
      label: 'Avg High Temp',
      value: fmtTemp(avgMax),
      unit: '°C',
      sub: `Low avg: ${fmtTemp(avgMin)}°C`,
    },
    {
      label: 'Total Precipitation',
      value: fmtNum(avgPrecip),
      unit: 'mm',
      sub: `avg per ${type === 'annual' ? 'year' : type === 'quarter' ? 'quarter' : 'month'}`,
    },
    {
      label: 'Rain Day Probability',
      value: rainDayPct,
      unit: '%',
      sub: `~${Math.round(rainDays / 10)} days / ${type === 'annual' ? 'year' : type === 'quarter' ? 'quarter' : 'month'}`,
    },
    {
      label: 'Avg Cloud Cover',
      value: fmtNum(avgCloud),
      unit: '%',
      sub: '↑ = less sun',
    },
    {
      label: 'Wind Speed',
      value: fmtNum(avgWind),
      unit: 'km/h',
      sub: 'Avg daily mean',
    },
  ];

  kpiStrip.innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-card__label">${k.label}</div>
      <div class="kpi-card__value">${k.value}<em>${k.unit}</em></div>
      <div class="kpi-card__sub">${k.sub}</div>
      <div class="kpi-card__accent"></div>
    </div>
  `).join('');

  // ── Charts ─────────────────────────────────────────────
  chartsGrid.innerHTML = `
    <div class="chart-card chart-card--wide">
      <div class="chart-card__header">
        <div class="chart-card__title">Average Day Profile</div>
        <div class="chart-card__unit">°C · per hour</div>
      </div>
      <div class="chart-card__canvas"><canvas id="chartTemp"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-card__header">
        <div class="chart-card__title">Monthly Precipitation</div>
        <div class="chart-card__unit">mm</div>
      </div>
      <div class="chart-card__canvas"><canvas id="chartPrecip"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-card__header">
        <div class="chart-card__title">Cloud Cover &amp; Humidity</div>
        <div class="chart-card__unit">% · monthly avg</div>
      </div>
      <div class="chart-card__canvas"><canvas id="chartCloud"></canvas></div>
    </div>
  `;

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a2030',
        borderColor: 'rgba(201,168,76,0.3)',
        borderWidth: 1,
        titleFont: { family: "'IBM Plex Mono'", size: 11 },
        bodyFont: { family: "'IBM Plex Mono'", size: 11 },
        titleColor: '#c9a84c',
        bodyColor: '#8a8272',
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: {
          font: { family: "'IBM Plex Mono'", size: 10 },
          color: '#484038',
          maxRotation: 45,
        },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: {
          font: { family: "'IBM Plex Mono'", size: 10 },
          color: '#484038',
        },
      },
    },
  };

  const legendLabels = {
    font: { family: "'IBM Plex Mono'", size: 10 },
    color: '#8a8272',
    boxWidth: 12,
    boxHeight: 2,
    padding: 12,
  };

  // Temperature chart — synthetic diurnal profiles, one curve per included month
  const hourLabels = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
  new Chart(document.getElementById('chartTemp'), {
    type: 'line',
    data: {
      labels: hourLabels,
      datasets: months.map(m => {
        const avg = calAvg[m];
        return {
          label: MONTH_NAMES[m - 1],
          data: buildDiurnalProfile(avg.temp_max, avg.temp_min),
          borderColor: tempToColor(avg.temp_max),
          backgroundColor: tempToColor(avg.temp_max, 0.06),
          fill: false,
          borderWidth: months.length === 1 ? 2 : 1.5,
          pointRadius: 0,
          tension: 0.4,
        };
      }),
    },
    options: {
      ...chartDefaults,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        ...chartDefaults.plugins,
        legend: { display: true, labels: legendLabels },
      },
    },
  });

  // Precipitation chart — calendar-month averages
  new Chart(document.getElementById('chartPrecip'), {
    type: 'bar',
    data: {
      labels: mLabels,
      datasets: [{
        label: 'Precipitation',
        data: months.map(m => fmtNum(calAvg[m].precip)),
        backgroundColor: 'rgba(76,141,181,0.35)',
        borderColor: '#4c8db5',
        borderWidth: 1,
        borderRadius: 2,
      }],
    },
    options: chartDefaults,
  });

  // Cloud cover & humidity chart — calendar-month averages
  new Chart(document.getElementById('chartCloud'), {
    type: 'bar',
    data: {
      labels: mLabels,
      datasets: [
        {
          label: 'Cloud Cover',
          data: months.map(m => fmtNum(calAvg[m].cloud)),
          backgroundColor: 'rgba(201,168,76,0.3)',
          borderColor: '#c9a84c',
          borderWidth: 1,
          borderRadius: 2,
          yAxisID: 'y',
        },
        {
          label: 'Humidity',
          data: months.map(m => fmtNum(calAvg[m].humidity)),
          backgroundColor: 'rgba(76,141,181,0.25)',
          borderColor: '#4c8db5',
          borderWidth: 1,
          borderRadius: 2,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        legend: { display: true, labels: legendLabels },
      },
      scales: {
        ...chartDefaults.scales,
        y: {
          ...chartDefaults.scales.y,
          position: 'left',
          min: 0,
          max: 100,
          ticks: { ...chartDefaults.scales.y.ticks, callback: v => `${v}%` },
        },
        y1: {
          ...chartDefaults.scales.y,
          position: 'right',
          min: 0,
          max: 100,
          grid: { drawOnChartArea: false },
          ticks: { ...chartDefaults.scales.y.ticks, callback: v => `${v}%` },
        },
      },
    },
  });

  resultsContent.removeAttribute('hidden');
}

// ── Calendar-month helpers ────────────────────────────────

// Returns which calendar month numbers [1–12] are active for the selected period
function includedMonths(period) {
  const { type, value } = period;
  if (type === 'annual')  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  if (type === 'quarter') return { 1:[1,2,3], 2:[4,5,6], 3:[7,8,9], 4:[10,11,12] }[value];
  return [value];
}

// Aggregates daily series by calendar month (1–12), averaging across all years
function computeCalendarMonthAvg(dates, series) {
  const buckets = {}; // m -> { temp_max, temp_min, precip_by_ym, cloud, humidity }
  dates.forEach((d, i) => {
    const m  = parseInt(d.substring(5, 7));
    const ym = d.substring(0, 7);
    if (!buckets[m]) buckets[m] = { temp_max: [], temp_min: [], precip_by_ym: {}, cloud: [], humidity: [] };
    const b = buckets[m];
    if (series.temps_max[i]   != null) b.temp_max.push(series.temps_max[i]);
    if (series.temps_min[i]   != null) b.temp_min.push(series.temps_min[i]);
    if (series.cloud_cover[i] != null) b.cloud.push(series.cloud_cover[i]);
    if (series.humidity[i]    != null) b.humidity.push(series.humidity[i]);
    if (!b.precip_by_ym[ym])  b.precip_by_ym[ym] = 0;
    if (series.precip[i]      != null) b.precip_by_ym[ym] += series.precip[i];
  });

  const result = {};
  for (const [m, b] of Object.entries(buckets)) {
    result[parseInt(m)] = {
      temp_max: mean(b.temp_max),
      temp_min: mean(b.temp_min),
      precip:   mean(Object.values(b.precip_by_ym)), // avg monthly sum across years
      cloud:    mean(b.cloud),
      humidity: mean(b.humidity),
    };
  }
  return result;
}

// Synthetic 24-hour temperature profile from daily avg min/max.
// Uses a sinusoidal model: T_min at 02:00, T_max at 14:00.
function buildDiurnalProfile(tMax, tMin) {
  const tMean = (tMax + tMin) / 2;
  const amp   = (tMax - tMin) / 2;
  return Array.from({ length: 24 }, (_, h) =>
    Math.round((tMean + amp * Math.sin(2 * Math.PI / 24 * (h - 8))) * 10) / 10
  );
}

// Maps average temperature to a color on a blue→green→orange→red scale
function tempToColor(t, alpha = 1) {
  const clamped = Math.max(-20, Math.min(40, t));
  const ratio   = (clamped + 20) / 60; // 0 at −20°C, 1 at 40°C
  const hue     = Math.round(220 - ratio * 220); // 220° blue → 0° red
  return `hsla(${hue}, 72%, 58%, ${alpha})`;
}

// ── Utils ─────────────────────────────────────────────────
const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const sum  = arr => arr.reduce((a, b) => a + b, 0);

function fmtNum(n)    { return isNaN(n) ? '—' : Math.round(n * 10) / 10; }
function fmtTemp(n)   { return isNaN(n) ? '—' : (n >= 0 ? '+' : '') + Math.round(n * 10) / 10; }


function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function esc(str) {
  return String(str || '').replace(/"/g, '&quot;');
}
