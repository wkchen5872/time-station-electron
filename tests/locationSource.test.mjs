import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveLocationSource, LOCATION_SOURCE } from '../src/services/locationSource.mjs';

const configured = { city: '台北市', district: '' };
const cached = { city: 'Taipei', district: 'Da’an' };
const live = { city: 'Taipei', district: 'Xinyi' };
const now = 1_767_000_000_000;
const day = 24 * 60 * 60 * 1000;

test('關閉定位時使用設定位置', () => {
  const r = resolveLocationSource({ configured, geolocationEnabled: false, now });
  assert.equal(r.source, LOCATION_SOURCE.CONFIGURED);
  assert.equal(r.known, true);
});

test('快取未過期時優先使用快取，不發出定位請求', () => {
  const r = resolveLocationSource({
    configured, cached, cachedAt: now - 60_000, now, cacheDuration: day, live
  });
  assert.equal(r.source, LOCATION_SOURCE.FRESH_CACHE);
  assert.deepEqual(r.data, cached);
});

test('快取過期且定位成功時使用即時結果', () => {
  const r = resolveLocationSource({
    configured, cached, cachedAt: now - 2 * day, now, cacheDuration: day, live
  });
  assert.equal(r.source, LOCATION_SOURCE.LIVE);
  assert.deepEqual(r.data, live);
});

test('定位失敗時沿用過期快取，且不視為異常', () => {
  const r = resolveLocationSource({
    configured, cached, cachedAt: now - 2 * day, now, cacheDuration: day, live: null
  });
  assert.equal(r.source, LOCATION_SOURCE.STALE_CACHE);
  assert.equal(r.known, true);
});

test('定位失敗且無快取時退回設定位置，仍不是異常', () => {
  const r = resolveLocationSource({
    configured, cached: null, cachedAt: null, now, live: null
  });
  assert.equal(r.source, LOCATION_SOURCE.CONFIGURED);
  assert.equal(r.known, true);
});

test('定位失敗、無快取且無設定位置時為 unlocated', () => {
  const r = resolveLocationSource({
    configured: null, cached: null, cachedAt: null, now, live: null
  });
  assert.equal(r.source, LOCATION_SOURCE.NONE);
  assert.equal(r.known, false);
});
