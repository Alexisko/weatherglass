import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveUrl, normalizeArchive } from '../js/api/archive.js';

test('archive request uses ERA5, 1991–2020, local days', () => {
  const url = new URL(archiveUrl({ latitude: 38.7167, longitude: -9.1333 }));
  assert.equal(url.hostname, 'archive-api.open-meteo.com');
  assert.equal(url.searchParams.get('models'), 'era5');
  assert.equal(url.searchParams.get('start_date'), '1991-01-01');
  assert.equal(url.searchParams.get('end_date'), '2020-12-31');
  assert.equal(url.searchParams.get('timezone'), 'auto');
  assert.match(url.searchParams.get('daily'), /sunshine_duration/);
});

test('normalizeArchive renames variables and converts seconds to hours', () => {
  const out = normalizeArchive({
    latitude: 38.75, longitude: -9.25, elevation: 45, timezone: 'Europe/Lisbon',
    daily: {
      time: ['1991-01-01', '1991-01-02'],
      temperature_2m_max: [14.1, null],
      temperature_2m_min: [8, 7],
      precipitation_sum: [0, 3.2],
      snowfall_sum: [0, 0],
      sunshine_duration: [36000, null],
      daylight_duration: [34200, 34260],
    },
  });
  assert.deepEqual(out.daily.tmax, [14.1, null]);
  assert.deepEqual(out.daily.sunshine, [10, null]);
  assert.equal(out.daily.daylight[0], 9.5);
  assert.equal(out.meta.elevation, 45);
});

test('normalizeArchive rejects empty responses', () => {
  assert.throws(() => normalizeArchive({ daily: { time: [] } }));
});
