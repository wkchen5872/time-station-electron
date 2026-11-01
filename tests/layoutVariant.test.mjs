process.env.TZ = 'Asia/Taipei';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_VARIANT,
  VARIANT_STORAGE_KEY,
  normalizeVariant,
  nextVariant,
  rulesFor,
  shouldShowRain,
  shouldShowFeelsLike
} from '../src/services/layoutVariant.mjs';
import { composeSlots } from '../src/services/forecastSlots.mjs';

const at = (iso) => Date.parse(iso);

function series(startIso, spanHours, values) {
  const start = at(startIso);
  const span = spanHours * 3600 * 1000;
  return values.map((value, i) => ({
    value,
    start: start + i * span,
    end: start + (i + 1) * span
  }));
}

test('預設變體為 codex', () => {
  assert.equal(DEFAULT_VARIANT, 'codex');
  assert.equal(normalizeVariant(undefined), 'codex');
  assert.equal(normalizeVariant(null), 'codex');
});

test('未知值回退 codex', () => {
  assert.equal(normalizeVariant('light'), 'codex');
  assert.equal(normalizeVariant('dark'), 'codex');
  assert.equal(normalizeVariant('nonsense'), 'codex');
  assert.equal(normalizeVariant('claude'), 'claude');
});

test('持久化鍵與已退役的 displayModeOverride 不同', () => {
  assert.equal(VARIANT_STORAGE_KEY, 'layoutVariant');
  assert.notEqual(VARIANT_STORAGE_KEY, 'displayModeOverride');
});

test('切換在兩個變體之間往返', () => {
  assert.equal(nextVariant('codex'), 'claude');
  assert.equal(nextVariant('claude'), 'codex');
});

test('Codex 的降雨機率無隱藏門檻，0% 亦顯示', () => {
  assert.equal(shouldShowRain('codex', 0), true);
  assert.equal(shouldShowRain('codex', 10), true);
  assert.equal(shouldShowRain('codex', 70), true);
  assert.equal(shouldShowRain('codex', null), false);
});

test('Claude 的降雨機率低於 20% 留空', () => {
  assert.equal(shouldShowRain('claude', 0), false);
  assert.equal(shouldShowRain('claude', 10), false);
  assert.equal(shouldShowRain('claude', 20), true);
  assert.equal(shouldShowRain('claude', 70), true);
});

test('Codex 不顯示今日高低溫與體感；Claude 顯示今日高低溫', () => {
  assert.equal(rulesFor('codex').showTodayHighLow, false);
  assert.equal(rulesFor('codex').showFeelsLike, false);
  assert.equal(rulesFor('claude').showTodayHighLow, true);
});

test('Claude 體感以與同時段現況預報溫度的差距判定', () => {
  assert.equal(shouldShowFeelsLike('claude', { feelsLike: 16, temperature: 19 }), true);
  assert.equal(shouldShowFeelsLike('claude', { feelsLike: 18, temperature: 19 }), false);
  assert.equal(shouldShowFeelsLike('claude', { feelsLike: 29, temperature: 28, comfort: '悶熱' }), true);
  assert.equal(shouldShowFeelsLike('claude', { feelsLike: 29, temperature: 28, comfort: '舒適' }), false);
  // Codex 無論如何都不顯示
  assert.equal(shouldShowFeelsLike('codex', { feelsLike: 16, temperature: 19 }), false);
});

test('同一份資料下兩版共用同一組時間格與代表值，僅可見性不同', () => {
  for (const pop of [0, 10, 70]) {
    const source = {
      temperature: series('2026-10-31T15:00:00+08:00', 1, [28, 27, 26, 25, 24, 23, 22]),
      weatherCode: series('2026-10-31T15:00:00+08:00', 1, ['2', '4', '4', '8', '8', '8', '4']),
      rainProbability: series('2026-10-31T15:00:00+08:00', 3, [pop, pop])
    };
    const now = at('2026-10-31T15:40:00+08:00');

    // 格由共用層組成一次，與變體無關
    const slots = composeSlots(source, { now, count: 2 });

    assert.deepEqual(
      slots.map((s) => [s.start, s.end]),
      [
        [at('2026-10-31T15:00:00+08:00'), at('2026-10-31T18:00:00+08:00')],
        [at('2026-10-31T18:00:00+08:00'), at('2026-10-31T21:00:00+08:00')]
      ],
      `pop=${pop} 的格起訖必須一致`
    );
    assert.deepEqual(slots.map((s) => s.values.temperature), [28, 25], `pop=${pop} 的代表溫度必須一致`);
    assert.deepEqual(slots.map((s) => s.durationMs), [3 * 3600 * 1000, 3 * 3600 * 1000]);

    // 只有可見性不同
    const codexVisible = slots.map((s) => shouldShowRain('codex', s.values.rainProbability));
    const claudeVisible = slots.map((s) => shouldShowRain('claude', s.values.rainProbability));
    assert.deepEqual(codexVisible, [true, true], `codex 於 pop=${pop} 應全部顯示`);
    assert.deepEqual(
      claudeVisible,
      pop >= 20 ? [true, true] : [false, false],
      `claude 於 pop=${pop} 的顯隱`
    );
  }
});

test('Claude 隱藏低機率後不得退回逐時格', () => {
  const source = {
    temperature: series('2026-10-31T15:00:00+08:00', 1, [28, 27, 26, 25]),
    rainProbability: series('2026-10-31T15:00:00+08:00', 3, [10])
  };
  const slots = composeSlots(source, { now: at('2026-10-31T15:10:00+08:00'), count: 1 });

  assert.equal(shouldShowRain('claude', slots[0].values.rainProbability), false);
  // 顯隱不影響格的組成
  assert.equal(slots[0].durationMs, 3 * 3600 * 1000);
  assert.equal(slots[0].label, '15–18');
});
