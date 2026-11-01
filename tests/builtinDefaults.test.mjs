/**
 * 內建預設的單一來源契約
 *
 * 對應 openspec/changes/centralize-builtin-config/specs/builtin-defaults/spec.md
 * 的 Single Source of Built-in Defaults。
 *
 * 這些測試刻意「改變集中來源後斷言行為隨之改變」，而不是斷言當前數值。
 * 只斷言數值的測試在各模組各自寫著相同常數時也會通過，無法證明單一來源。
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';

import { defaultConfig } from '../src/defaultConfig.js';
import { createSleepState } from '../src/services/sleepState.mjs';
import { resolveAnomaly } from '../src/services/dataState.mjs';
import { resolveLocationSource } from '../src/services/locationSource.mjs';
import { startStation } from '../src/services/stationLifecycle.mjs';

/**
 * 暫時改寫集中來源的某個葉值，結束後還原。
 *
 * 集中來源是模組單例，直接改寫會影響同一程序內的其他測試，
 * 因此一律在 finally 還原，且不改寫物件結構只改葉值。
 */
function withDefault(path, value, body) {
  const keys = path.split('.');
  const last = keys.pop();
  let target = defaultConfig;
  for (const k of keys) target = target[k];

  const had = Object.prototype.hasOwnProperty.call(target, last);
  const original = target[last];
  target[last] = value;
  try {
    body();
  } finally {
    if (had) target[last] = original;
    else delete target[last];
  }
}

/**
 * 在指定的集中來源覆寫下，重新建立睡眠狀態並取值。
 *
 * 必須在覆寫範圍內「重新建立」computed：`defaultConfig` 是普通物件、不是 reactive
 * 來源，改寫它不會讓既有 computed 失效。沿用同一個 computed 實例只會讀到快取值，
 * 那樣的測試就算實作正確也不會轉綠。
 */
function sleepingUnder(path, value, { sleepConfig, hour }) {
  let result;
  withDefault(path, value, () => {
    result = createSleepState({
      sleepConfig: ref(sleepConfig),
      currentHour: ref(hour),
      override: ref(null)
    }).value;
  });
  return result;
}

function sleepingNow({ sleepConfig, hour }) {
  return createSleepState({
    sleepConfig: ref(sleepConfig),
    currentHour: ref(hour),
    override: ref(null)
  }).value;
}

test('2.1 sleepMode.startHour 缺值時解析自集中來源', () => {
  // 設定物件只提供 endHour，startHour 缺值
  const partial = { enabled: true, endHour: 6 };

  assert.equal(
    sleepingNow({ sleepConfig: partial, hour: 21 }),
    false,
    '集中來源的 23 時起始下，21 時不睡'
  );

  assert.equal(
    sleepingUnder('sleepMode.startHour', 20, { sleepConfig: partial, hour: 21 }),
    true,
    '集中來源改為 20 時起始後，21 時必須判為睡眠'
  );

  assert.equal(
    sleepingNow({ sleepConfig: partial, hour: 21 }),
    false,
    '還原後回到原行為'
  );
});

test('2.2 sleepMode.enabled 缺值時解析自集中來源', () => {
  // enabled 缺值。修改前寫成 `config.enabled !== false`，會得到 true 而不查集中來源
  const partial = { startHour: 23, endHour: 6 };

  assert.equal(
    sleepingNow({ sleepConfig: partial, hour: 23 }),
    true,
    '集中來源 enabled:true 下，23 時睡眠'
  );

  assert.equal(
    sleepingUnder('sleepMode.enabled', false, { sleepConfig: partial, hour: 23 }),
    false,
    '集中來源改為 enabled:false 後，23 時不得判為睡眠'
  );
});

test('2.2b 整個 sleepMode 群組缺值時也解析自集中來源', () => {
  assert.equal(sleepingNow({ sleepConfig: null, hour: 21 }), false);

  assert.equal(
    sleepingUnder('sleepMode.startHour', 20, { sleepConfig: null, hour: 21 }),
    true,
    '未載入設定時也必須取自集中來源'
  );
});

test('2.3 weather.staleThresholdMs 缺值時解析自集中來源', () => {
  const now = Date.parse('2026-11-01T12:00:00+08:00');
  const lastSuccessAt = now - 60 * 60 * 1000; // 60 分鐘前

  // 集中來源為 90 分鐘，60 分鐘前的資料尚未過期
  const before = resolveAnomaly({
    everSucceeded: true,
    lastSuccessAt,
    now,
    locationKnown: true
  });
  assert.equal(before.kind, null, '90 分鐘門檻下，60 分鐘前的資料未過期');

  withDefault('weather.staleThresholdMs', 30 * 60 * 1000, () => {
    const after = resolveAnomaly({
      everSucceeded: true,
      lastSuccessAt,
      now,
      locationKnown: true
    });
    assert.equal(after.kind, 'stale', '集中來源改為 30 分鐘後，必須判為過期');
    assert.equal(after.staleReason, 'threshold');
  });
});

test('2.3b cache.location.duration 缺值時解析自集中來源', () => {
  const now = Date.parse('2026-11-01T12:00:00+08:00');
  const cachedAt = now - 2 * 60 * 60 * 1000; // 2 小時前
  const cached = { city: '臺中市', district: '' };

  // 集中來源為 24 小時，2 小時前的快取仍新鮮
  const before = resolveLocationSource({
    configured: { city: '臺北市', district: '' },
    cached,
    cachedAt,
    now,
    live: null,
    geolocationEnabled: true
  });
  assert.equal(before.source, 'fresh-cache', '24 小時有效期下，2 小時前的快取仍新鮮');

  withDefault('cache.location.duration', 60 * 60 * 1000, () => {
    const after = resolveLocationSource({
      configured: { city: '臺北市', district: '' },
      cached,
      cachedAt,
      now,
      live: null,
      geolocationEnabled: true
    });
    assert.notEqual(
      after.source,
      'fresh-cache',
      '集中來源改為 1 小時後，2 小時前的快取不得視為新鮮'
    );
  });
});

test('2.4 數值 0 是已提供的值，不得當成缺值', () => {
  // startHour: 0 代表午夜，是合法輸入。`||` 會把它當缺值而取集中來源的 23。
  //
  // 時窗 [0,6) 與被誤用預設後的 [23,6) 的唯一差異是 23 時：
  //   [0,6)  -> 23 時清醒
  //   [23,6) -> 23 時睡眠
  // 因此必須以 23 時斷言，用 3 時或 22 時都無法分辨這兩個時窗。
  const midnightStart = { enabled: true, startHour: 0, endHour: 6 };

  assert.equal(
    sleepingNow({ sleepConfig: midnightStart, hour: 23 }),
    false,
    'startHour 為 0 時，23 時在時窗外；若 0 被當成缺值而取 23，此處會變成睡眠'
  );

  assert.equal(
    sleepingNow({ sleepConfig: midnightStart, hour: 3 }),
    true,
    '0-6 時窗內的 3 時必須判為睡眠'
  );
});

test('R01-F01 startStation 省略 weatherIntervalMs 時解析自集中來源', async () => {
  // stationLifecycle 的預設參數原為 `30 * 60 * 1000`——與 weather.updateInterval
  // 同一個概念的第二個定義點，且單位不同（毫秒 vs 秒）。
  const intervals = [];
  const setTimer = (fn, ms) => { intervals.push(ms); return intervals.length; };

  const original = defaultConfig.weather.updateInterval;
  defaultConfig.weather.updateInterval = 120;
  try {
    const station = startStation({
      tick: () => {},
      loadConfig: async () => ({}),
      resolveLocation: async () => {},
      updateWeather: async () => {},
      // weatherIntervalMs 刻意不傳
      setTimer,
      clearTimer: () => {}
    });
    await station.ready;
    station.dispose();

    assert.deepEqual(
      intervals,
      [1000, 120000],
      '集中來源改為 120 秒後，天氣排程必須為 120000ms'
    );
  } finally {
    defaultConfig.weather.updateInterval = original;
  }
});

test('R01-F01b startStation 的預設週期與集中來源單位一致', async () => {
  const intervals = [];
  const station = startStation({
    tick: () => {},
    loadConfig: async () => ({}),
    resolveLocation: async () => {},
    updateWeather: async () => {},
    setTimer: (fn, ms) => { intervals.push(ms); return intervals.length; },
    clearTimer: () => {}
  });
  await station.ready;
  station.dispose();

  assert.deepEqual(
    intervals,
    [1000, defaultConfig.weather.updateInterval * 1000],
    'weather.updateInterval 的單位是秒，排程需要毫秒'
  );
});

test('5.4 集中來源只包含有功能消費者的欄位', () => {
  // 對應 specs/builtin-defaults 的 Built-in Defaults Expose Only Wired Values。
  // 清單是白名單而非數量斷言：數量相符但內容換掉的情況必須也被擋下。
  const leaves = [];
  (function walk(node, path) {
    for (const key of Object.keys(node)) {
      const value = node[key];
      const next = path ? `${path}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) walk(value, next);
      else leaves.push(next);
    }
  })(defaultConfig, '');

  const wired = [
    // locationSource 的 configured 後備（僅 city 參與判定，district 用於顯示標籤）
    'location.city',
    'location.district',
    // useWeatherStation.resolveLocation
    'geolocation.enabled',
    // startStation 的天氣排程週期
    'weather.updateInterval',
    // dataState.resolveAnomaly 的過期門檻
    'weather.staleThresholdMs',
    // sleepState.createSleepState
    'sleepMode.enabled',
    'sleepMode.startHour',
    'sleepMode.endHour',
    // useWeatherStation.resolveLocation 的快取有效期限
    'cache.location.duration',
    // AIWeatherAdvisor 的建議快取有效期限
    'cache.aiAdvice.duration'
  ];

  assert.deepEqual(
    leaves.slice().sort(),
    wired.slice().sort(),
    '新增欄位請先接線並列入白名單；移除消費者時請一併移除欄位'
  );
});

test('3.6 geolocation.enabled 缺值時解析自集中來源', () => {
  // 修改前 useWeatherStation 以 Boolean(config.geolocation && ...) 判定，
  // 缺值時得到 false，與集中來源宣告的 true 相反。
  // 此處鎖定 locationSource 的預設參數行為。
  const now = Date.parse('2026-11-01T12:00:00+08:00');

  withDefault('geolocation.enabled', false, () => {
    const result = resolveLocationSource({
      configured: { city: '臺北市', district: '' },
      cached: { city: '臺中市', district: '' },
      cachedAt: now - 1000,
      now,
      live: null
      // geolocationEnabled 不傳，必須解析自集中來源
    });
    assert.equal(
      result.source,
      'configured',
      '集中來源 geolocation.enabled:false 時，不得採用快取定位'
    );
  });
});
