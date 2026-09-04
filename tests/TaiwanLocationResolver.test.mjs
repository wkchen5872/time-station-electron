import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolveTaiwanLocation } from '../src/services/TaiwanLocationResolver.mjs';

const regions = JSON.parse(
  await readFile(new URL('../src/data/taiwan-regions.json', import.meta.url), 'utf8')
).regions;

test('resolves normal and reversed IP location fields', () => {
  const expected = { city: '臺北市', district: '內湖區' };

  assert.deepEqual(
    resolveTaiwanLocation(regions, { city: 'Taipei City', district: 'Neihu' }),
    expected
  );
  assert.deepEqual(
    resolveTaiwanLocation(regions, { city: 'Neihu', district: 'Taipei City' }),
    expected
  );
});

test('does not confuse New Taipei City with Taipei City', () => {
  assert.deepEqual(
    resolveTaiwanLocation(regions, { city: 'New Taipei City', district: 'Banqiao' }),
    { city: '新北市', district: '板橋區' }
  );
});
