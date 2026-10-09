// Open-Meteo Historical Weather API, ERA5 reanalysis.
// https://open-meteo.com/en/docs/historical-weather-api
// Method: docs/03-methodology.md §2. One request per place, cached in IndexedDB.

import { REF_START_YEAR, REF_END_YEAR, DATASET } from '../config.js';
import { cacheGet, cacheSet } from './cache.js';

const ARCHIVE_API = 'https://archive-api.open-meteo.com/v1/archive';
const CACHE_VERSION = 1; // bump when the request or the normalisation changes

const DAILY_VARS = {
  tmax: 'temperature_2m_max',
  tmin: 'temperature_2m_min',
  precip: 'precipitation_sum',
  snowfall: 'snowfall_sum',
  sunshine: 'sunshine_duration',  // seconds → hours below
  daylight: 'daylight_duration',  // seconds → hours below
};

export function archiveUrl({ latitude, longitude }) {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    start_date: `${REF_START_YEAR}-01-01`,
    end_date: `${REF_END_YEAR}-12-31`,
    daily: Object.values(DAILY_VARS).join(','),
    models: DATASET.id,
    timezone: 'auto',  // daily values follow the local day
  });
  return `${ARCHIVE_API}?${params}`;
}

// Convert the API response into { meta, daily } with short variable names and hours.
export function normalizeArchive(json) {
  const d = json.daily;
  if (!d || !Array.isArray(d.time) || !d.time.length) {
    throw new Error('The climate data service returned no daily data for this place.');
  }
  const toHours = arr => (arr || []).map(v => (v == null ? null : v / 3600));
  const daily = { time: d.time };
  for (const [key, apiName] of Object.entries(DAILY_VARS)) {
    const values = d[apiName] || d.time.map(() => null);
    daily[key] = key === 'sunshine' || key === 'daylight' ? toHours(values) : values;
  }
  return {
    meta: {
      gridLatitude: json.latitude,
      gridLongitude: json.longitude,
      elevation: json.elevation,   // elevation used by Open-Meteo for downscaling
      timezone: json.timezone,
    },
    daily,
  };
}

export async function fetchReferenceSeries(place, { signal } = {}) {
  const key = `${DATASET.id}:${REF_START_YEAR}-${REF_END_YEAR}:v${CACHE_VERSION}:${place.latitude.toFixed(2)},${place.longitude.toFixed(2)}`;
  const cached = await cacheGet(key);
  if (cached) return cached;

  const res = await fetch(archiveUrl(place), { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 429) {
      throw new Error('The free climate data service is rate-limiting requests from your network. Please try again in a minute.');
    }
    throw new Error(body.reason || `The climate data service returned an error (${res.status}).`);
  }
  const series = normalizeArchive(await res.json());
  cacheSet(key, series);
  return series;
}
