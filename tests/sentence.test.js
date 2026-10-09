import test from 'node:test';
import assert from 'node:assert/strict';
import { computeProfile } from '../js/stats/profile.js';
import { profileSentences, periodPhrases, hasSnow } from '../js/views/sentence.js';
import { fmtTemp, fmtPrecip, fmtNumber } from '../js/views/format.js';
import { syntheticDaily, constantClimate } from './helpers.js';

test('period phrases', () => {
  assert.equal(periodPhrases(1, 12).lead, 'Over a typical year');
  assert.equal(periodPhrases(5, 5).within, 'in May');
  assert.equal(periodPhrases(12, 2).lead, 'From December to February');
});

test('sentences come from the computed numbers', () => {
  const { period } = computeProfile(syntheticDaily({ fn: constantClimate }), { from: 5, to: 6 });
  const s = profileSentences('Testville', period, 'metric');
  assert.equal(s[0], 'From May to June in Testville, daytime highs average 20 °C and nights cool to 10 °C.');
  assert.equal(s[1], 'Rain of 1 mm or more falls on about 12 days from May to June (20 % of days).');
  assert.equal(s[2], 'The sun shines about 8.0 hours a day (67 % of daylight).');
});

test('imperial units', () => {
  assert.equal(fmtTemp(20, 'imperial'), '68 °F');
  assert.equal(fmtPrecip(25.4, 'imperial'), '1.0 in');
  assert.equal(fmtTemp(-3.4, 'metric'), '−3 °C');
  assert.equal(fmtNumber(-0.2, 0), '0');
});

test('snowy places say "rain or snow" and report snow days', () => {
  const cold = ({ day, month }) => ({
    ...constantClimate({ day }), tmax: -2, tmin: -9,
    snowfall: month <= 2 && day % 5 === 0 ? 3 : 0,
  });
  const p = computeProfile(syntheticDaily({ fn: cold }), { from: 1, to: 1 });
  const s = profileSentences('Snowtown', p.period, 'metric', { snowy: hasSnow(p.monthly) });
  assert.equal(s[1], 'Rain or snow (1 mm of water or more) falls on about 6 days in January (19 % of days).');
  assert.equal(s[2], 'Snow of 1 cm or more falls on about 6 days.');
});

test('places without snow keep the plain rain wording', () => {
  const p = computeProfile(syntheticDaily({ fn: constantClimate }));
  assert.equal(hasSnow(p.monthly), false);
});
