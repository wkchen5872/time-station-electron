/**
 * AI 建議快取時效取自集中來源
 *
 * 對應 decisions D-002 與 design D5。`cache.aiAdvice.duration` 原本是沒有消費者的
 * 設定欄位，真正生效的是 AIWeatherAdvisor 內的裸字面值 `60 * 60 * 1000`。
 * 僅刪掉死欄位會留下那個字面值，未達成集中化。
 *
 * 行為不變：仍是 1 小時。這裡只驗證那個 1 小時由集中來源決定。
 */

process.env.TZ = 'Asia/Taipei';

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRenderer } from 'vue';

import { defaultConfig } from '../src/defaultConfig.js';
import AIWeatherAdvisor from '../src/services/AIWeatherAdvisor.js';
import { useStation } from '../src/composables/useStation.js';
import { flush, memoryStorage, fakeTimers } from './helpers/mountStation.mjs';

const KEY = 'test-advisor-key';

test('快取時效預設取自集中來源', () => {
  const advisor = new AIWeatherAdvisor('gemini', KEY);
  assert.equal(
    advisor.cacheValidDuration,
    defaultConfig.cache.aiAdvice.duration,
    '未指定時必須等於集中來源的值'
  );
});

test('改變集中來源即改變快取時效', () => {
  const original = defaultConfig.cache.aiAdvice.duration;
  defaultConfig.cache.aiAdvice.duration = 15 * 60 * 1000;
  try {
    const advisor = new AIWeatherAdvisor('gemini', KEY);
    assert.equal(
      advisor.cacheValidDuration,
      15 * 60 * 1000,
      '集中來源改為 15 分鐘後，新建的 advisor 必須採用該值'
    );
  } finally {
    defaultConfig.cache.aiAdvice.duration = original;
  }
});

test('行為維持 1 小時（D-002 要求不改變快取時效）', () => {
  const advisor = new AIWeatherAdvisor('gemini', KEY);
  assert.equal(advisor.cacheValidDuration, 60 * 60 * 1000, '集中化不得改變快取時效');
});

test('可由建構子明確指定，覆寫集中來源', () => {
  const advisor = new AIWeatherAdvisor('gemini', KEY, 5 * 60 * 1000);
  assert.equal(advisor.cacheValidDuration, 5 * 60 * 1000);
});

test('以兩個參數建構的既有呼叫端行為不變', () => {
  // createAdvisor 是測試注入縫；既有替身只傳 provider 與 apiKey
  const advisor = new AIWeatherAdvisor('gemini', KEY);
  assert.equal(advisor.provider, 'gemini');
  assert.equal(advisor.cacheValidDuration, defaultConfig.cache.aiAdvice.duration);
});

test('R01-F02 數值 0 必須傳到服務，不得退回預設', () => {
  // 0 表示不快取建議，是合法值。預設參數只對 undefined 生效，所以 0 會穿透
  const advisor = new AIWeatherAdvisor('gemini', KEY, 0);
  assert.equal(advisor.cacheValidDuration, 0, '0 是有效設定，不是缺值');
});

/**
 * 以實際 Vue 掛載 useWeatherStation，**保留產品的預設 createAdvisor**。
 *
 * 前一版此處複製了一份 factory 再測自己，抓不到產品預設工廠日後漏傳第三參數；
 * stationIntegration 的 advisorArgs 也只到注入替身的入口。這裡讓產品工廠真的
 * 建構 AIWeatherAdvisor，由服務實例內的 this.cacheValidDuration 斷言。
 *
 * 只 stub 服務的 _initializeLLM 與 getAdvice（避免連外與 LLM 初始化），finally 還原。
 * 不新增產品 export、不改 helper、不連外。
 */
const noopOps = {
  patchProp() {}, insert() {}, remove() {},
  createElement() { return {}; }, createText() { return {}; }, createComment() { return {}; },
  setText() {}, setElementText() {},
  parentNode() { return null; }, nextSibling() { return null; }
};

function hourly(startIso, values) {
  const start = Date.parse(startIso);
  const span = 3600 * 1000;
  return values.map((value, i) => ({
    value, start: start + i * span, end: start + (i + 1) * span
  }));
}

const SERIES_AT = '2026-11-01T15:00:00+08:00';
const offlineSeries = () => ({
  temperature: hourly(SERIES_AT, [28, 27, 26, 25]),
  weatherCode: hourly(SERIES_AT, ['2', '4', '4', '8']),
  weather: hourly(SERIES_AT, ['晴時多雲', '多雲', '多雲', '短暫陣雨']),
  rainProbability: hourly(SERIES_AT, [10, 20, 30, 40])
});

/**
 * 掛載站台並回傳 getAdvice 被呼叫時服務實例上的 cacheValidDuration。
 * 回傳 null 表示未曾建立 advisor 或未請求建議。
 */
async function durationSeenByService(configOverride) {
  const seen = [];
  const realInit = AIWeatherAdvisor.prototype._initializeLLM;
  const realGetAdvice = AIWeatherAdvisor.prototype.getAdvice;

  AIWeatherAdvisor.prototype._initializeLLM = function stubInit() { return {}; };
  AIWeatherAdvisor.prototype.getAdvice = async function stubGetAdvice() {
    seen.push(this.cacheValidDuration);
    return '測試建議';
  };

  try {
    const { createApp } = createRenderer(noopOps);
    let api = null;
    const app = createApp({
      setup() {
        api = useStation({
          env: {
            VITE_CWA_API_KEY: 'test-cwa-key',
            VITE_AI_PROVIDER: 'gemini',
            VITE_GEMINI_API_KEY: 'test-ai-key'
          },
          configManager: { loadConfig: async () => configOverride },
          createWeatherApi: () => ({
            getWeatherForecast: async () => ({ series: offlineSeries() })
          }),
          // createAdvisor 刻意不注入：走產品的預設工廠
          storage: memoryStorage(),
          timers: fakeTimers(),
          clock: () => new Date(Date.parse('2026-11-01T15:20:00+08:00'))
        });
        return () => null;
      }
    });
    app.mount({});
    await flush();
    app.unmount();
    return seen.length ? seen[0] : null;
  } finally {
    AIWeatherAdvisor.prototype._initializeLLM = realInit;
    AIWeatherAdvisor.prototype.getAdvice = realGetAdvice;
  }
}

const offlineConfig = (cache) => ({
  location: { city: '臺北市', district: '' },
  geolocation: { enabled: false },
  sleepMode: { enabled: false, startHour: 23, endHour: 6 },
  weather: { updateInterval: 1800 },
  ...(cache === undefined ? {} : { cache: { aiAdvice: { duration: cache } } })
});

test('R03 產品預設工廠確實把設定值帶進服務實例', async () => {
  assert.equal(await durationSeenByService(offlineConfig(5000)), 5000);
});

test('R03 產品預設工廠的 0 值不被攔截', async () => {
  assert.equal(await durationSeenByService(offlineConfig(0)), 0);
});

test('R03 設定未提供時，產品預設工廠退回集中來源', async () => {
  assert.equal(
    await durationSeenByService(offlineConfig(undefined)),
    defaultConfig.cache.aiAdvice.duration
  );
});
