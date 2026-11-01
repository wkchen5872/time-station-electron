process.env.TZ = 'Asia/Taipei';

import test from 'node:test';
import assert from 'node:assert/strict';

import { hasValue, toFiniteNumber } from '../src/services/value.mjs';
import {
  dailyRepresentative,
  hasUsableData,
  coversNow,
  padSlots
} from '../src/services/forecastSlots.mjs';
import { ANOMALY, isSuccessfulUpdate, resolveAnomaly } from '../src/services/dataState.mjs';

const at = (iso) => Date.parse(iso);
const now = at('2026-11-01T15:30:00+08:00');

const entry = (value, startIso, hours = 1) => ({
  value,
  start: at(startIso),
  end: at(startIso) + hours * 3600 * 1000
});

// --- F05：有時間框但全缺值 -------------------------------------------------

test('只有時間框而全缺值的回應不算成功更新', () => {
  const series = { temperature: [entry(null, '2026-11-01T15:00:00+08:00')] };
  assert.equal(coversNow(series, now), true, '區間確實涵蓋當下');
  assert.equal(hasUsableData(series, now), false, '但沒有可用值');
  assert.equal(isSuccessfulUpdate(series, now), false);
});

test('空 ElementValue 造成的缺值同樣不算成功', () => {
  const series = {
    temperature: [entry(null, '2026-11-01T15:00:00+08:00')],
    weatherCode: [entry('', '2026-11-01T15:00:00+08:00')]
  };
  assert.equal(isSuccessfulUpdate(series, now), false);
});

test('混合有效與缺值時，只要有一個可用值即算成功', () => {
  const series = {
    temperature: [entry(null, '2026-11-01T15:00:00+08:00')],
    weatherCode: [entry('11', '2026-11-01T15:00:00+08:00')]
  };
  assert.equal(isSuccessfulUpdate(series, now), true);
});

test('真正的 0 是可用值', () => {
  const series = { temperature: [entry(0, '2026-11-01T15:00:00+08:00')] };
  assert.equal(isSuccessfulUpdate(series, now), true);
  assert.equal(hasValue(0), true);
  assert.equal(toFiniteNumber(0), 0);
  assert.equal(toFiniteNumber(null), null);
  assert.equal(toFiniteNumber(''), null);
});

test('缺值不得被轉成 0：dailyRepresentative 不產生假的高低溫與機率', () => {
  const day = {
    temperature: [entry(null, '2026-11-01T08:00:00+08:00', 3)],
    rainProbability: [entry(null, '2026-11-01T08:00:00+08:00', 3)],
    weatherCode: [entry(null, '2026-11-01T08:00:00+08:00', 3)],
    weather: [entry(null, '2026-11-01T08:00:00+08:00', 3)]
  };
  const rep = dailyRepresentative(day);
  assert.equal(rep.high, null);
  assert.equal(rep.low, null);
  assert.equal(rep.rainProbability, null);
  assert.equal(rep.weatherCode, null);
});

test('真正的 0% 降雨仍保留為 0 而非缺值', () => {
  const day = {
    temperature: [entry(18, '2026-11-01T08:00:00+08:00', 3)],
    rainProbability: [entry(0, '2026-11-01T08:00:00+08:00', 3)],
    weatherCode: [entry('1', '2026-11-01T08:00:00+08:00', 3)],
    weather: [entry('晴', '2026-11-01T08:00:00+08:00', 3)]
  };
  const rep = dailyRepresentative(day);
  assert.equal(rep.rainProbability, 0);
  assert.equal(rep.high, 18);
});

// --- F04：stale 的兩個成因 -------------------------------------------------

test('成功後收到 no-cover 回應，未達時間門檻仍為 stale', () => {
  const r = resolveAnomaly({
    everSucceeded: true,
    lastSuccessAt: now - 5 * 60 * 1000,
    now,
    locationKnown: true,
    latestResponseUsable: false
  });
  assert.equal(r.kind, ANOMALY.STALE);
  assert.equal(r.staleReason, 'no-cover');
});

test('資料涵蓋範圍耗盡時為 stale，成因可區分', () => {
  const r = resolveAnomaly({
    everSucceeded: true,
    lastSuccessAt: now - 5 * 60 * 1000,
    now,
    locationKnown: true,
    coverageActive: false
  });
  assert.equal(r.kind, ANOMALY.STALE);
  assert.equal(r.staleReason, 'coverage-exhausted');
});

test('成功更新後 stale 解除', () => {
  const r = resolveAnomaly({
    everSucceeded: true,
    lastSuccessAt: now,
    now,
    locationKnown: true,
    latestResponseUsable: true,
    coverageActive: true
  });
  assert.equal(r.kind, null);
  assert.equal(r.staleReason, null);
});

test('時間門檻仍是獨立成因', () => {
  const r = resolveAnomaly({
    everSucceeded: true,
    lastSuccessAt: now - 91 * 60 * 1000,
    now,
    locationKnown: true
  });
  assert.equal(r.staleReason, 'threshold');
});

// --- F06：補足固定格數 -----------------------------------------------------

test('不足四格時補上缺值位置，且不虛構時間或天氣', () => {
  const slots = [
    { start: 1, end: 2, label: '15–18', durationMs: 1, values: { temperature: 28 } },
    { start: 2, end: 3, label: '18–21', durationMs: 1, values: { temperature: 25 } }
  ];
  const padded = padSlots(slots, 4);

  assert.equal(padded.length, 4);
  assert.deepEqual(padded.map((s) => s.placeholder), [false, false, true, true]);
  assert.deepEqual(padded.slice(2).map((s) => s.label), [null, null]);
  assert.deepEqual(padded.slice(2).map((s) => s.values.temperature), [undefined, undefined]);
  assert.equal(new Set(padded.map((s) => s.key)).size, 4, 'key 必須唯一');
});

test('完全沒有資料時仍有四個位置', () => {
  const padded = padSlots([], 4);
  assert.equal(padded.length, 4);
  assert.equal(padded.every((s) => s.placeholder), true);
});

test('超過四格時只取前四格', () => {
  const slots = Array.from({ length: 6 }, (_, i) => ({
    start: i, end: i + 1, label: `${i}`, durationMs: 1, values: {}
  }));
  assert.equal(padSlots(slots, 4).length, 4);
});
