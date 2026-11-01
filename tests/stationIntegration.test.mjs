process.env.TZ = 'Asia/Taipei';

import test from 'node:test';
import assert from 'node:assert/strict';

import { mountStation, flush, memoryStorage, deferred } from './helpers/mountStation.mjs';
import { isSuccessfulUpdate } from '../src/services/dataState.mjs';

const at = (iso) => new Date(Date.parse(iso));

function hourly(startIso, values) {
  const start = Date.parse(startIso);
  const span = 3600 * 1000;
  return values.map((value, i) => ({
    value,
    start: start + i * span,
    end: start + (i + 1) * span
  }));
}

function seriesAt(startIso) {
  return {
    temperature: hourly(startIso, [28, 27, 26, 25]),
    weatherCode: hourly(startIso, ['2', '4', '4', '8']),
    weather: hourly(startIso, ['晴時多雲', '多雲', '多雲', '短暫陣雨']),
    rainProbability: hourly(startIso, [10, 20, 30, 40])
  };
}

const baseConfig = {
  location: { city: '臺北市', district: '' },
  geolocation: { enabled: false },
  sleepMode: { enabled: true, startHour: 23, endHour: 6 },
  weather: { updateInterval: 1800 }
};

// --- R05-F01 -----------------------------------------------------------

test('R05-F01 自訂的刷新週期會傳到實際的天氣 timer', async () => {
  const app = mountStation({
    config: { ...baseConfig, weather: { updateInterval: 60 } },
    series: seriesAt('2026-11-01T15:00:00+08:00'),
    start: at('2026-11-01T15:20:00+08:00')
  });
  await flush();

  assert.deepEqual(app.timers.intervals(), [1000, 60000]);
  app.unmount();
});

test('R05-F01 未設定時沿用 1800 秒預設', async () => {
  const app = mountStation({
    config: { ...baseConfig, weather: {} },
    series: seriesAt('2026-11-01T15:00:00+08:00'),
    start: at('2026-11-01T15:20:00+08:00')
  });
  await flush();

  assert.deepEqual(app.timers.intervals(), [1000, 1800000]);
  app.unmount();
});

test('R05-F01 設定載入真正不返回時，時鐘仍前進且天氣 timer 尚未建立', async () => {
  const pending = deferred();
  const app = mountStation({
    config: pending.promise, // loadConfig 實際被阻擋
    series: seriesAt('2026-11-01T15:00:00+08:00'),
    start: at('2026-11-01T15:20:00+08:00')
  });
  await flush();

  assert.deepEqual(app.timers.intervals(), [1000], '只有時鐘，天氣排程尚未建立');
  assert.equal(app.station.time.value, '15:20');

  // 時鐘不依賴設定載入，tick 後時間必須前進
  app.advanceTo(at('2026-11-01T15:21:00+08:00'));
  await flush();
  assert.equal(app.station.time.value, '15:21');

  // 卸載後才讓設定返回：不得再建立任何 timer
  const createdBeforeUnmount = app.timers.created.length;
  app.unmount();
  pending.resolve(baseConfig);
  await flush();

  assert.equal(app.timers.created.length, createdBeforeUnmount, '卸載後不得新增 timer');
  assert.deepEqual(app.timers.intervals(), [], '既有 timer 已清理');
});

// --- R05-F02 -----------------------------------------------------------

test('R05-F02 還原手動睡眠後只送出一次 AI 請求，且帶有有效天氣', async () => {
  const app = mountStation({
    config: baseConfig,
    series: seriesAt('2026-11-01T15:00:00+08:00'),
    start: at('2026-11-01T15:20:00+08:00'),
    storage: memoryStorage({ sleepModeOverride: 'true' })
  });
  await flush();

  assert.equal(app.display.isSleepMode.value, true, '還原後應為睡眠狀態');
  assert.equal(app.adviceCalls.length, 1, '不得在天氣就緒前先送一次');
  assert.deepEqual(app.adviceCalls.map((c) => c.sleeping), [true]);
  assert.deepEqual(app.adviceCalls.map((c) => c.payload.current.temperature), [28]);
  app.unmount();
});

test('R05-F02 後續刷新不重複送出當夜問候', async () => {
  const app = mountStation({
    config: { ...baseConfig, weather: { updateInterval: 60 } },
    series: seriesAt('2026-11-01T15:00:00+08:00'),
    start: at('2026-11-01T15:20:00+08:00'),
    storage: memoryStorage({ sleepModeOverride: 'true' })
  });
  await flush();
  assert.equal(app.adviceCalls.length, 1);

  app.timers.fire(60000);
  await flush();
  assert.equal(app.adviceCalls.length, 1, '同一夜的刷新不得再送一次');
  app.unmount();
});

test('R05-F02 手動切換睡眠仍會更新提示語氣', async () => {
  const app = mountStation({
    config: baseConfig,
    series: seriesAt('2026-11-01T15:00:00+08:00'),
    start: at('2026-11-01T15:20:00+08:00')
  });
  await flush();
  const beforeToggle = app.adviceCalls.length;

  app.display.toggleSleep();
  await flush();

  assert.equal(app.display.isSleepMode.value, true);
  assert.equal(app.adviceCalls.length, beforeToggle + 1, '真正的手動切換應送出一次');
  assert.equal(app.adviceCalls.at(-1).sleeping, true);
  app.unmount();
});

test('R05-F02 沒有可用天氣時不送氣象分析', async () => {
  const app = mountStation({
    config: baseConfig,
    series: null, // 請求失敗
    start: at('2026-11-01T15:20:00+08:00'),
    storage: memoryStorage({ sleepModeOverride: 'true' })
  });
  await flush();

  assert.equal(app.adviceCalls.length, 0);
  assert.equal(app.station.anomaly.value.kind, 'never');
  app.unmount();
});

test('12.3 以 Auto 睡眠時段啟動時，模式序列不含非預期的 false', async () => {
  const app = mountStation({
    config: baseConfig, // 23-6
    series: seriesAt('2026-11-01T23:00:00+08:00'),
    start: at('2026-11-01T23:30:00+08:00')
  });
  await flush();

  assert.equal(app.display.isSleepMode.value, true, 'Auto 時段內應為睡眠');
  assert.deepEqual(app.adviceCalls.map((c) => c.sleeping), [true]);
  app.unmount();
});

test('12.3 睡眠中的刷新不會退回一般模式', async () => {
  const app = mountStation({
    config: { ...baseConfig, weather: { updateInterval: 60 } },
    series: seriesAt('2026-11-01T23:00:00+08:00'),
    start: at('2026-11-01T23:30:00+08:00')
  });
  await flush();

  app.timers.fire(60000);
  await flush();

  assert.equal(app.adviceCalls.every((c) => c.sleeping === true), true, '不得出現 false 模式');
  app.unmount();
});

// --- R05-F03 -----------------------------------------------------------

test('R05-F03 數值欄位含無效字串不算成功更新', () => {
  const now = Date.parse('2026-11-01T15:20:00+08:00');
  for (const invalid of ['abc', 'NaN', '', true, [], {}]) {
    const series = { temperature: hourly('2026-11-01T15:00:00+08:00', [invalid]) };
    assert.equal(
      isSuccessfulUpdate(series, now),
      false,
      `temperature=${JSON.stringify(invalid)} 不應算成功`
    );
  }
});

test('R05-F03 真正的 0 與文字元素仍算有效', () => {
  const now = Date.parse('2026-11-01T15:20:00+08:00');
  assert.equal(
    isSuccessfulUpdate({ temperature: hourly('2026-11-01T15:00:00+08:00', [0]) }, now),
    true
  );
  assert.equal(
    isSuccessfulUpdate({ temperature: hourly('2026-11-01T15:00:00+08:00', ['0']) }, now),
    true
  );
  assert.equal(
    isSuccessfulUpdate({ weather: hourly('2026-11-01T15:00:00+08:00', ['多雲']) }, now),
    true
  );
});

test('R05-F03 掛載後無效數值回應仍為 never 異常', async () => {
  const app = mountStation({
    config: baseConfig,
    series: { temperature: hourly('2026-11-01T15:00:00+08:00', ['abc']) },
    start: at('2026-11-01T15:20:00+08:00')
  });
  await flush();

  assert.equal(app.station.anomaly.value.kind, 'never');
  assert.equal(app.station.current.value.temperature, null);
  assert.equal(app.station.advisory.value.kind, 'anomaly');
  app.unmount();
});

// --- R05-F04 -----------------------------------------------------------

test('R05-F04 過期跨日後，明後天依現在的本地日期而非快照日期', async () => {
  const app = mountStation({
    config: baseConfig,
    series: seriesAt('2026-11-01T15:00:00+08:00'),
    start: at('2026-11-01T15:20:00+08:00')
  });
  await flush();

  assert.deepEqual(
    app.station.daily.value.map((d) => d.date),
    ['2026-11-02', '2026-11-03'],
    '11/1 當下的明後天'
  );

  // 失聯並讓時間前進到 11/5，資料的涵蓋範圍早已耗盡
  app.setSeries(null);
  app.advanceTo(at('2026-11-05T15:20:00+08:00'));
  await flush();

  assert.equal(app.station.coverageActive.value, false);
  assert.deepEqual(
    app.station.daily.value.map((d) => d.date),
    ['2026-11-06', '2026-11-07'],
    '舊日期的資料不得被重新叫成明天／後天'
  );
  assert.equal(app.station.daily.value[0].high, null, '沒有對應資料就是缺值');
  assert.equal(app.station.current.value.temperature, 28, '現況仍保留最後已知值');
  assert.equal(app.station.anomaly.value.kind, 'stale');
  app.unmount();
});

test('R05-F04 今日高低溫同樣依現在的本地日期', async () => {
  const app = mountStation({
    config: baseConfig,
    series: seriesAt('2026-11-01T15:00:00+08:00'),
    start: at('2026-11-01T15:20:00+08:00')
  });
  await flush();
  assert.equal(app.station.today.value.high, 28);

  app.setSeries(null);
  app.advanceTo(at('2026-11-05T15:20:00+08:00'));
  await flush();

  assert.equal(app.station.today.value.high, null, '11/5 沒有資料就是缺值');
  app.unmount();
});

// --- 開發模式長文字測試資料（task 9.1） --------------------------------

test('9.1 開發模式開啟後，五種長文字同時出現在畫面資料上', async () => {
  const app = mountStation({
    config: baseConfig,
    series: seriesAt('2026-11-01T15:00:00+08:00'),
    start: at('2026-11-01T15:20:00+08:00'),
    storage: memoryStorage({ devLongText: 'advice' }),
    env: {
      DEV: true,
      VITE_CWA_API_KEY: 'test-key',
      VITE_AI_PROVIDER: 'gemini',
      VITE_GEMINI_API_KEY: 'test-ai-key'
    }
  });
  await flush();

  assert.equal(app.station.location.value.label, '嘉義縣 阿里山鄉');
  assert.equal(app.station.current.value.weather, '多雲時陰有陣雨或雷雨有霧');
  assert.equal(app.station.lunarDate.value, '十一月三十 小雪');
  assert.equal(app.station.advisory.value.kind, 'advice');
  assert.ok(app.station.advisory.value.text.length >= 22);
  app.unmount();
});

test('9.1 異常模式顯示最長的異常訊息', async () => {
  const app = mountStation({
    config: baseConfig,
    series: seriesAt('2026-11-01T15:00:00+08:00'),
    start: at('2026-11-01T15:20:00+08:00'),
    storage: memoryStorage({ devLongText: 'anomaly' }),
    env: {
      DEV: true,
      VITE_CWA_API_KEY: 'test-key',
      VITE_AI_PROVIDER: 'gemini',
      VITE_GEMINI_API_KEY: 'test-ai-key'
    }
  });
  await flush();

  assert.equal(app.station.advisory.value.kind, 'anomaly');
  assert.ok(app.station.advisory.value.text.includes('超過更新時間'));
  app.unmount();
});

test('9.1 正式建置下開關無效，呈現不受影響', async () => {
  const app = mountStation({
    config: baseConfig,
    series: seriesAt('2026-11-01T15:00:00+08:00'),
    start: at('2026-11-01T15:20:00+08:00'),
    storage: memoryStorage({ devLongText: 'advice' }),
    env: {
      DEV: false,
      VITE_CWA_API_KEY: 'test-key',
      VITE_AI_PROVIDER: 'gemini',
      VITE_GEMINI_API_KEY: 'test-ai-key'
    }
  });
  await flush();

  assert.notEqual(app.station.location.value.label, '嘉義縣 阿里山鄉');
  assert.equal(app.station.current.value.weather, '晴時多雲');
  app.unmount();
});
