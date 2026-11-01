process.env.TZ = 'Asia/Taipei';

import test from 'node:test';
import assert from 'node:assert/strict';

import { mountStation, flush, memoryStorage, deferred } from './helpers/mountStation.mjs';
import { isSuccessfulUpdate } from '../src/services/dataState.mjs';
import { defaultConfig } from '../src/defaultConfig.js';

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

test('未設定的刷新週期取自集中來源，而非取用處的字面值', async () => {
  // 上一個測試斷言的是數值 1800000，在各模組各自寫著 1800 時也會通過，
  // 無法證明單一來源。此處改寫集中來源並斷言 timer 隨之改變。
  const original = defaultConfig.weather.updateInterval;
  defaultConfig.weather.updateInterval = 120;
  try {
    const app = mountStation({
      config: { ...baseConfig, weather: {} },
      series: seriesAt('2026-11-01T15:00:00+08:00'),
      start: at('2026-11-01T15:20:00+08:00')
    });
    await flush();

    assert.deepEqual(app.timers.intervals(), [1000, 120000]);
    app.unmount();
  } finally {
    defaultConfig.weather.updateInterval = original;
  }
});

test('R01-F02 已載入設定的 AI 快取時效會傳給 advisor', async () => {
  const app = mountStation({
    config: { ...baseConfig, cache: { aiAdvice: { duration: 5000 } } },
    series: seriesAt('2026-11-01T15:00:00+08:00'),
    start: at('2026-11-01T15:20:00+08:00')
  });
  await flush();

  assert.equal(app.advisorArgs.length, 1, 'advisor 應已建立');
  assert.equal(
    app.advisorArgs[0][2],
    5000,
    '設定提供的值必須一路傳到服務，而非被 defaultConfig 覆蓋'
  );
  app.unmount();
});

test('R01-F02 AI 快取時效為 0 時也必須傳遞，不得退回預設', async () => {
  const app = mountStation({
    config: { ...baseConfig, cache: { aiAdvice: { duration: 0 } } },
    series: seriesAt('2026-11-01T15:00:00+08:00'),
    start: at('2026-11-01T15:20:00+08:00')
  });
  await flush();

  assert.equal(app.advisorArgs[0][2], 0, '0 表示不快取，是有效設定');
  app.unmount();
});

test('R01-F02 設定未提供 AI 快取時效時才退回集中來源', async () => {
  const app = mountStation({
    config: baseConfig, // 無 cache 群組
    series: seriesAt('2026-11-01T15:00:00+08:00'),
    start: at('2026-11-01T15:20:00+08:00')
  });
  await flush();

  assert.equal(
    app.advisorArgs[0][2],
    defaultConfig.cache.aiAdvice.duration,
    '缺值時取自集中來源'
  );
  app.unmount();
});

test('R01-F06 location 只提供 district 時，city 退回集中來源', async () => {
  const app = mountStation({
    config: {
      ...baseConfig,
      geolocation: { enabled: false },
      location: { district: '內湖區' }
    },
    series: seriesAt('2026-11-01T15:00:00+08:00'),
    start: at('2026-11-01T15:20:00+08:00')
  });
  await flush();

  assert.equal(app.station.location.value.city, '臺北市', 'city 缺值須退回集中來源');
  assert.equal(app.station.location.value.district, '內湖區', '顯式提供的區名須保留');
  app.unmount();
});

test('R01-F06 location 只提供 city 時，district 退回集中來源', async () => {
  const original = defaultConfig.location.district;
  defaultConfig.location.district = '內湖區';
  try {
    const app = mountStation({
      config: {
        ...baseConfig,
        geolocation: { enabled: false },
        location: { city: '臺北市' }
      },
      series: seriesAt('2026-11-01T15:00:00+08:00'),
      start: at('2026-11-01T15:20:00+08:00')
    });
    await flush();

    assert.equal(app.station.location.value.district, '內湖區', 'district 缺值須退回集中來源');
    app.unmount();
  } finally {
    defaultConfig.location.district = original;
  }
});

test('R01-F06 city 與集中來源不同城時，不得沿用來源的區名（該區名不存在於新城市）', async () => {
  // 內湖區只存在於臺北市。這個案例單靠 resolveTaiwanLocation 的 areaList 比對就會被擋下，
  // 因此**不足以**證明逐欄 fallback 有做跨城市限制——見下一個測試。
  const original = defaultConfig.location.district;
  defaultConfig.location.district = '內湖區';
  try {
    const app = mountStation({
      config: {
        ...baseConfig,
        geolocation: { enabled: false },
        location: { city: '臺中市' }
      },
      series: seriesAt('2026-11-01T15:00:00+08:00'),
      start: at('2026-11-01T15:20:00+08:00')
    });
    await flush();

    assert.equal(app.station.location.value.city, '臺中市');
    assert.notEqual(
      app.station.location.value.district,
      '內湖區',
      '臺北市的區名不得接到臺中市上'
    );
    app.unmount();
  } finally {
    defaultConfig.location.district = original;
  }
});

test('R02 不同城市不得繼承預設區名，即使該區名在新城市也存在', async () => {
  // 中正區同時存在於臺北市與基隆市，所以 resolveTaiwanLocation 的 areaList 比對
  // 擋不下來——實測 {city:'基隆市', district:'中正區'} 會原樣保留。
  // 跨城市的限制必須由逐欄 fallback 自己做。
  const originalCity = defaultConfig.location.city;
  const originalDistrict = defaultConfig.location.district;
  defaultConfig.location.city = '臺北市';
  defaultConfig.location.district = '中正區';
  try {
    const app = mountStation({
      config: {
        ...baseConfig,
        geolocation: { enabled: false },
        location: { city: '基隆市' }
      },
      series: seriesAt('2026-11-01T15:00:00+08:00'),
      start: at('2026-11-01T15:20:00+08:00')
    });
    await flush();

    assert.equal(app.station.location.value.city, '基隆市');
    assert.equal(
      app.station.location.value.district,
      '',
      '設定只提供 city 且與集中來源不同城時，不得繼承來源的區名'
    );
    app.unmount();
  } finally {
    defaultConfig.location.city = originalCity;
    defaultConfig.location.district = originalDistrict;
  }
});

test('R02 同城時仍須繼承預設區名，台／臺 視為同城', async () => {
  const originalDistrict = defaultConfig.location.district;
  defaultConfig.location.district = '中正區';
  try {
    const app = mountStation({
      config: {
        ...baseConfig,
        geolocation: { enabled: false },
        location: { city: '台北市' } // 「台」，集中來源為「臺」
      },
      series: seriesAt('2026-11-01T15:00:00+08:00'),
      start: at('2026-11-01T15:20:00+08:00')
    });
    await flush();

    assert.equal(app.station.location.value.city, '臺北市');
    assert.equal(
      app.station.location.value.district,
      '中正區',
      '台／臺 正規化後同城，區名仍須繼承'
    );
    app.unmount();
  } finally {
    defaultConfig.location.district = originalDistrict;
  }
});

test('R02 同城判斷須沿用既有的英文別名解析能力', async () => {
  // TaiwanLocationResolver 本來就以 cityEngName 支援 Taipei／Taipei City 等別名，
  // city 會被正規化為臺北市。同城判斷不得限縮為中文比對，否則英文別名會丟掉缺值區名。
  const originalDistrict = defaultConfig.location.district;
  defaultConfig.location.district = '內湖區';
  try {
    const app = mountStation({
      config: {
        ...baseConfig,
        geolocation: { enabled: false },
        location: { city: 'Taipei' }
      },
      series: seriesAt('2026-11-01T15:00:00+08:00'),
      start: at('2026-11-01T15:20:00+08:00')
    });
    await flush();

    assert.equal(app.station.location.value.city, '臺北市', 'city 應已被既有 resolver 正規化');
    assert.equal(
      app.station.location.value.district,
      '內湖區',
      '英文別名與集中來源同城，區名仍須繼承'
    );
    app.unmount();
  } finally {
    defaultConfig.location.district = originalDistrict;
  }
});

test('R02 不同城市但顯式提供區名時，該區名須保留', async () => {
  const originalDistrict = defaultConfig.location.district;
  defaultConfig.location.district = '中正區';
  try {
    const app = mountStation({
      config: {
        ...baseConfig,
        geolocation: { enabled: false },
        location: { city: '基隆市', district: '信義區' }
      },
      series: seriesAt('2026-11-01T15:00:00+08:00'),
      start: at('2026-11-01T15:20:00+08:00')
    });
    await flush();

    assert.equal(app.station.location.value.city, '基隆市');
    assert.equal(
      app.station.location.value.district,
      '信義區',
      '顯式區名不受跨城市限制影響'
    );
    app.unmount();
  } finally {
    defaultConfig.location.district = originalDistrict;
  }
});

test('R01-F06 顯式的空字串 district 必須保留，不得被來源覆蓋', async () => {
  const original = defaultConfig.location.district;
  defaultConfig.location.district = '內湖區';
  try {
    const app = mountStation({
      config: {
        ...baseConfig,
        geolocation: { enabled: false },
        location: { city: '臺北市', district: '' }
      },
      series: seriesAt('2026-11-01T15:00:00+08:00'),
      start: at('2026-11-01T15:20:00+08:00')
    });
    await flush();

    assert.equal(app.station.location.value.district, '', '空字串是顯式選擇，不是缺值');
    app.unmount();
  } finally {
    defaultConfig.location.district = original;
  }
});

test('未設定的 geolocation.enabled 取自集中來源，不得隱含為 false', async () => {
  // 修改前的 Boolean(config.geolocation && ...) 在缺值時得到 false，
  // 與集中來源宣告的 true 相反。缺值時必須採用宣告值。
  const { geolocation, ...withoutGeolocation } = baseConfig;
  const storage = memoryStorage();
  storage.setItem('cachedLocation', JSON.stringify({ city: '臺中市', district: '' }));
  storage.setItem('cacheTimestamp', String(Date.parse('2026-11-01T15:00:00+08:00')));

  const app = mountStation({
    config: withoutGeolocation,
    series: seriesAt('2026-11-01T15:00:00+08:00'),
    start: at('2026-11-01T15:20:00+08:00'),
    storage
  });
  await flush();

  // geolocation 啟用時會讀取快取定位，所以地區來自快取而非設定位置
  assert.equal(
    app.station.location.value.city,
    '臺中市',
    'geolocation 缺值時應解析為集中來源的 true，因而採用快取定位'
  );
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
  assert.ok(app.station.advisory.value.text.length >= 44);
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
  // 過期提示已暫停顯示，預覽必須改用仍會出現在畫面上的異常文案
  assert.equal(app.station.advisory.value.text.includes('超過更新時間'), false);
  assert.ok(app.station.advisory.value.text.includes('目前無法'));
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

// --- 暫停顯示過期提示 ---------------------------------------------------

/** 首次抓取成功的站台；後續依成因各自製造 stale */
async function mountedWithWeather(overrides = {}) {
  const app = mountStation({
    config: baseConfig,
    series: seriesAt('2026-11-01T15:00:00+08:00'),
    start: at('2026-11-01T15:20:00+08:00'),
    ...overrides
  });
  await flush();
  return app;
}

test('過期成因為門檻超時時，提示區顯示一般建議', async () => {
  const app = await mountedWithWeather();
  const updatedBefore = app.station.updatedAtLabel.value;

  // 15:20 成功，推進到 17:00 已超過 90 分鐘門檻，但資料仍涵蓋當下
  app.advanceTo(at('2026-11-01T17:00:00+08:00'));
  await flush();

  assert.equal(app.station.anomaly.value.staleReason, 'threshold');
  assert.equal(app.station.advisory.value.kind, 'advice');
  assert.equal(app.station.advisory.value.text, '測試建議');
  assert.ok(app.station.anomaly.value.all.includes('stale'), '內部過期狀態仍須保留');
  assert.equal(app.station.updatedAtLabel.value, updatedBefore, '最後成功時間不得被改寫');
  app.unmount();
});

test('過期成因為新回應不涵蓋現在時，提示區顯示一般建議', async () => {
  const app = await mountedWithWeather();
  const updatedBefore = app.station.updatedAtLabel.value;

  // 回應本身成功，但內容落在過去，不構成成功更新
  app.setSeries(seriesAt('2026-11-01T06:00:00+08:00'));
  app.timers.fire(1800000);
  await flush();

  assert.equal(app.station.anomaly.value.staleReason, 'no-cover');
  assert.equal(app.station.advisory.value.kind, 'advice');
  assert.equal(app.station.advisory.value.text, '測試建議');
  assert.ok(app.station.anomaly.value.all.includes('stale'), '內部過期狀態仍須保留');
  assert.equal(app.station.updatedAtLabel.value, updatedBefore, '最後成功時間不得被改寫');
  app.unmount();
});

test('過期成因為既有涵蓋耗盡時，提示區顯示一般建議', async () => {
  const app = await mountedWithWeather();

  // 20:00 已超出 15:00–19:00 的涵蓋範圍
  app.advanceTo(at('2026-11-01T20:00:00+08:00'));
  await flush();

  assert.equal(app.station.coverageActive.value, false);
  assert.equal(app.station.anomaly.value.staleReason, 'coverage-exhausted');
  assert.equal(app.station.advisory.value.kind, 'advice');
  assert.equal(app.station.advisory.value.text, '測試建議');
  assert.ok(app.station.anomaly.value.all.includes('stale'), '內部過期狀態仍須保留');
  app.unmount();
});

test('過期且尚無 AI 建議時，提示區顯示既有預設訊息', async () => {
  const app = await mountedWithWeather({ advice: () => '' });

  app.advanceTo(at('2026-11-01T17:00:00+08:00'));
  await flush();

  assert.ok(app.station.anomaly.value.all.includes('stale'));
  assert.equal(app.station.advisory.value.kind, 'advice');
  assert.equal(app.station.advisory.value.text, '祝您有個美好的一天。');
  app.unmount();
});

test('過期與定位未知同時成立時，提示區顯示定位未知', async () => {
  const app = await mountedWithWeather({
    config: { ...baseConfig, location: { city: '', district: '' } }
  });
  assert.equal(app.station.location.value.known, false);

  app.advanceTo(at('2026-11-01T17:00:00+08:00'));
  await flush();

  assert.deepEqual(app.station.anomaly.value.all, ['stale', 'unlocated']);
  assert.equal(app.station.advisory.value.kind, 'anomaly');
  assert.equal(app.station.advisory.value.text, '目前無法確認所在地區。');
  app.unmount();
});

test('僅定位未知時，提示區仍顯示定位未知', async () => {
  const app = await mountedWithWeather({
    config: { ...baseConfig, location: { city: '', district: '' } }
  });

  assert.deepEqual(app.station.anomaly.value.all, ['unlocated']);
  assert.equal(app.station.advisory.value.kind, 'anomaly');
  assert.equal(app.station.advisory.value.text, '目前無法確認所在地區。');
  app.unmount();
});

test('從未成功取得天氣時，提示區仍顯示無法取得天氣', async () => {
  const app = mountStation({
    config: baseConfig,
    series: null,
    start: at('2026-11-01T15:20:00+08:00')
  });
  await flush();

  assert.equal(app.station.anomaly.value.kind, 'never');
  assert.equal(app.station.advisory.value.kind, 'anomaly');
  assert.equal(app.station.advisory.value.text, '目前無法取得天氣資料。');
  app.unmount();
});

test('過期解除後內部狀態恢復，提示區仍為一般建議', async () => {
  const app = await mountedWithWeather();

  app.advanceTo(at('2026-11-01T17:00:00+08:00'));
  await flush();
  assert.ok(app.station.anomaly.value.all.includes('stale'));

  app.setSeries(seriesAt('2026-11-01T17:00:00+08:00'));
  app.timers.fire(1800000);
  await flush();

  assert.equal(app.station.anomaly.value.kind, null);
  assert.equal(app.station.advisory.value.kind, 'advice');
  app.unmount();
});
