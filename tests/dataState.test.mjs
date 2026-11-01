process.env.TZ = 'Asia/Taipei';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ANOMALY,
  isSuccessfulUpdate,
  resolveAnomaly,
  hasValue,
  display,
  MISSING_DISPLAY
} from '../src/services/dataState.mjs';
// 門檻的預設值只存在於集中來源，dataState 不再匯出自己的常數
import { defaultConfig } from '../src/defaultConfig.js';

const at = (iso) => Date.parse(iso);

function hourlySeries(startIso, values) {
  const start = at(startIso);
  const span = 3600 * 1000;
  return {
    temperature: values.map((value, i) => ({
      value,
      start: start + i * span,
      end: start + (i + 1) * span
    }))
  };
}

const now = at('2026-10-31T15:30:00+08:00');

test('缺 Key 或請求失敗時沒有可解析的資料，不構成成功更新', () => {
  assert.equal(isSuccessfulUpdate(null, now), false);
});

test('HTTP 成功但回應為空，不構成成功更新', () => {
  assert.equal(isSuccessfulUpdate({ temperature: [] }, now), false);
});

test('回應不涵蓋當下時段，不構成成功更新', () => {
  const stale = hourlySeries('2026-10-31T06:00:00+08:00', [20, 21, 22]);
  assert.equal(isSuccessfulUpdate(stale, now), false);
});

test('回應涵蓋當下時段才算成功更新', () => {
  const fresh = hourlySeries('2026-10-31T15:00:00+08:00', [28, 27]);
  assert.equal(isSuccessfulUpdate(fresh, now), true);
});

test('從未成功取得資料時為 never', () => {
  const r = resolveAnomaly({
    everSucceeded: false,
    lastSuccessAt: null,
    now,
    locationKnown: true
  });
  assert.equal(r.kind, ANOMALY.NEVER);
});

test('曾成功但超過門檻為 stale', () => {
  const r = resolveAnomaly({
    everSucceeded: true,
    lastSuccessAt: now - defaultConfig.weather.staleThresholdMs - 1,
    now,
    locationKnown: true
  });
  assert.equal(r.kind, ANOMALY.STALE);
});

test('未超過門檻時無天氣異常', () => {
  const r = resolveAnomaly({
    everSucceeded: true,
    lastSuccessAt: now - 20 * 60 * 1000,
    now,
    locationKnown: true
  });
  assert.equal(r.kind, null);
});

test('門檻可由設定驅動，不是寫死的 90 分鐘', () => {
  const tenMinutes = 10 * 60 * 1000;
  const r = resolveAnomaly({
    everSucceeded: true,
    lastSuccessAt: now - 20 * 60 * 1000,
    now,
    locationKnown: true,
    staleThresholdMs: tenMinutes
  });
  assert.equal(r.kind, ANOMALY.STALE);
});

test('定位失敗但有可用位置時不視為異常', () => {
  const r = resolveAnomaly({
    everSucceeded: true,
    lastSuccessAt: now,
    now,
    locationKnown: true
  });
  assert.equal(r.all.includes(ANOMALY.UNLOCATED), false);
});

test('完全無可用位置時為 unlocated', () => {
  const r = resolveAnomaly({
    everSucceeded: true,
    lastSuccessAt: now,
    now,
    locationKnown: false
  });
  assert.equal(r.kind, ANOMALY.UNLOCATED);
});

test('優先順序為 never > stale > unlocated', () => {
  const r = resolveAnomaly({
    everSucceeded: false,
    lastSuccessAt: null,
    now,
    locationKnown: false
  });
  assert.equal(r.kind, ANOMALY.NEVER);
  assert.deepEqual(r.all, [ANOMALY.NEVER, ANOMALY.UNLOCATED]);
});

test('各異常獨立解除：天氣恢復不會連帶解除定位異常', () => {
  const r = resolveAnomaly({
    everSucceeded: true,
    lastSuccessAt: now,
    now,
    locationKnown: false
  });
  assert.equal(r.all.includes(ANOMALY.NEVER), false);
  assert.equal(r.all.includes(ANOMALY.STALE), false);
  assert.equal(r.all.includes(ANOMALY.UNLOCATED), true);
});

test('數值 0 為有效值而非缺值', () => {
  assert.equal(hasValue(0), true);
  assert.equal(hasValue(0.0), true);
  assert.equal(hasValue(null), false);
  assert.equal(hasValue(undefined), false);
  assert.equal(hasValue(''), false);
  assert.equal(hasValue(NaN), false);
});

test('缺值以缺值符號呈現，0 則照常輸出', () => {
  assert.equal(display(0, (v) => `${v}%`), '0%');
  assert.equal(display(null, (v) => `${v}%`), MISSING_DISPLAY);
  assert.equal(display(undefined), MISSING_DISPLAY);
});
