/**
 * 以實際 Vue 掛載 useStation 的測試輔助
 *
 * 用無操作的 renderer，讓 setup 與生命週期真的執行，但不需要 DOM。
 * 只替換遠端與平台相依（天氣 API、LLM、設定、時鐘、timer、storage），
 * 接線本身走產品程式碼。
 */

import { createRenderer, nextTick } from 'vue';

import { useStation } from '../../src/composables/useStation.js';

const noopOps = {
  patchProp() {},
  insert() {},
  remove() {},
  createElement() { return {}; },
  createText() { return {}; },
  createComment() { return {}; },
  setText() {},
  setElementText() {},
  parentNode() { return null; },
  nextSibling() { return null; }
};

export const flush = async (rounds = 12) => {
  for (let i = 0; i < rounds; i += 1) {
    await Promise.resolve();
    await nextTick();
  }
};

export function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    dump: () => Object.fromEntries(map)
  };
}

export function fakeTimers() {
  const created = [];
  let nextId = 1;
  return {
    created,
    intervals: () => created.filter((t) => !t.cleared).map((t) => t.ms),
    setInterval(fn, ms) {
      const entry = { id: nextId++, fn, ms, cleared: false };
      created.push(entry);
      return entry.id;
    },
    clearInterval(id) {
      const entry = created.find((t) => t.id === id);
      if (entry) entry.cleared = true;
    },
    fire(ms) {
      for (const entry of created) if (entry.ms === ms && !entry.cleared) entry.fn();
    }
  };
}

export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

/**
 * @param {Object} options
 * @param {Object} options.config - ConfigManager.loadConfig 的回傳
 * @param {Object|null} options.series - 天氣 API 的回傳 series（null 代表請求失敗）
 * @param {Date} options.start - 起始時間
 * @param {Object} [options.storage]
 * @param {Function} [options.advice] - (payload, sleeping) => string | Promise<string>
 */
export function mountStation({
  config,
  series,
  start,
  storage = memoryStorage(),
  advice = () => '測試建議',
  env = {
    VITE_CWA_API_KEY: 'test-key',
    VITE_AI_PROVIDER: 'gemini',
    VITE_GEMINI_API_KEY: 'test-ai-key'
  }
} = {}) {
  const timers = fakeTimers();
  const clockRef = { value: new Date(start.getTime()) };
  const adviceCalls = [];
  // createAdvisor 每次被呼叫時收到的參數，供驗證設定值是否真的傳到服務
  const advisorArgs = [];
  let currentSeries = series;

  const deps = {
    env,
    storage,
    timers,
    clock: () => new Date(clockRef.value.getTime()),
    configManager: {
      loadConfig: async () => config,
      get: () => undefined
    },
    createWeatherApi: () => ({
      getWeatherForecast: async () => {
        if (currentSeries === null) throw new Error('network down');
        return { series: currentSeries };
      }
    }),
    createAdvisor: (...args) => {
      advisorArgs.push(args);
      return {
        getAdvice: async (payload, sleeping) => {
          const call = { payload, sleeping };
          adviceCalls.push(call);
          return advice(payload, sleeping);
        }
      };
    }
  };

  let api = null;
  const { createApp } = createRenderer(noopOps);
  const app = createApp({
    setup() {
      api = useStation(deps);
      return () => null;
    }
  });
  app.mount({});

  return {
    get station() { return api.station; },
    get display() { return api.display; },
    adviceCalls,
    advisorArgs,
    timers,
    storage,
    setSeries(next) { currentSeries = next; },
    advanceTo(date) {
      clockRef.value = new Date(date.getTime());
      timers.fire(1000);
    },
    unmount() { app.unmount(); }
  };
}
