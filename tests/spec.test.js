import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateSpec, specToParams, paramsToSpec, makeProfileSpec, ANSWER_TYPES } from '../js/query/spec.js';

const lisbon = { name: 'Lisbon', country: 'Portugal', admin1: 'Lisbon', latitude: 38.71667, longitude: -9.13333 };

test('valid spec is normalised', () => {
  const r = validateSpec({ type: 'profile', place: lisbon, months: { from: 5, to: 6 } });
  assert.ok(r.ok);
  assert.equal(r.spec.place.latitude, 38.7167);
});

test('any 12-month span becomes the calendar year', () => {
  const r = validateSpec({ type: 'profile', place: lisbon, months: { from: 3, to: 2 } });
  assert.deepEqual(r.spec.months, { from: 1, to: 12 });
});

test('invalid specs are rejected with reasons', () => {
  assert.ok(!validateSpec(null).ok);
  assert.ok(!validateSpec({ type: 'forecast', place: lisbon, months: { from: 1, to: 12 } }).ok);
  assert.ok(!validateSpec({ type: 'profile', place: { ...lisbon, latitude: 91 }, months: { from: 1, to: 12 } }).ok);
  assert.ok(!validateSpec({ type: 'profile', place: lisbon, months: { from: 0, to: 12 } }).ok);
  assert.ok(!validateSpec({ type: 'profile', place: { ...lisbon, name: ' ' }, months: { from: 1, to: 2 } }).ok);
});

test('URL round trip', () => {
  const spec = makeProfileSpec(lisbon, { from: 12, to: 2 });
  const back = paramsToSpec(new URLSearchParams(specToParams(spec).toString()));
  assert.deepEqual(back, spec);
});

test('URL without a place, or with bad coordinates, gives no spec', () => {
  assert.equal(paramsToSpec(new URLSearchParams('')), null);
  assert.equal(paramsToSpec(new URLSearchParams('place=X&lat=abc&lon=2')), null);
});

test('JSON Schema and JS validator agree on the contract', () => {
  const schema = JSON.parse(readFileSync(new URL('../schema/query-spec.schema.json', import.meta.url)));
  assert.deepEqual(schema.properties.type.enum, ANSWER_TYPES);
  assert.deepEqual(schema.required, ['type', 'place', 'months']);
  assert.deepEqual(schema.properties.place.required, ['name', 'latitude', 'longitude']);
  assert.deepEqual(Object.keys(schema.properties.place.properties).sort(),
    ['admin1', 'country', 'latitude', 'longitude', 'name']);
});
