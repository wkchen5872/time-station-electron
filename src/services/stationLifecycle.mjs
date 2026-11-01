/**
 * 啟動順序
 *
 * 主時鐘不得依賴任何遠端工作。先前的實作在 onMounted 內依序 await 設定、定位、
 * 天氣（其末端再 await AI），完成後才建立 1000ms interval；只要 CWA 或 AI 的
 * Promise 不返回，時間就停在掛載當下。可選的 AI 服務更不應擋住主要功能。
 *
 * 這裡把順序抽成純函式，讓測試能注入永不 resolve 的 Promise 驗證時鐘仍前進。
 */

import { defaultConfig } from '../defaultConfig.js';

export function startStation({
  tick,
  // 時鐘頻率只在此處定義，不屬於 defaultConfig 的設定值
  tickMs = 1000,
  loadConfig,
  resolveLocation,
  updateWeather,
  // 原為 `30 * 60 * 1000`，是 weather.updateInterval 的第二個定義點，且單位不同
  // （毫秒 vs 秒）。兩者數值恰好相等，所以不一致看不出來。
  //
  // 預設是純數值而非 `(config) => ...`：解析「設定值優先、缺值退回集中來源」的邏輯
  // 屬呼叫端（useWeatherStation）職責，在此再寫一份會變成第三個定義點。
  weatherIntervalMs = defaultConfig.weather.updateInterval * 1000,
  setTimer = setInterval,
  clearTimer = clearInterval,
  onError = (error) => console.error('Station startup failed:', error)
}) {
  let disposed = false;
  const handles = [];

  // 時鐘最先啟動，之後才碰任何遠端工作
  handles.push(setTimer(tick, tickMs));

  const ready = (async () => {
    try {
      const config = await loadConfig();
      if (disposed) return;

      await resolveLocation(config);
      if (disposed) return;

      // 週期在設定載入後才求值；排程仍先於首次請求建立
      const intervalMs = typeof weatherIntervalMs === 'function'
        ? weatherIntervalMs(config)
        : weatherIntervalMs;
      handles.push(setTimer(() => { updateWeather(); }, intervalMs));

      await updateWeather();
    } catch (error) {
      onError(error);
    }
  })();

  return {
    ready,
    get disposed() {
      return disposed;
    },
    dispose() {
      disposed = true;
      for (const handle of handles) clearTimer(handle);
      handles.length = 0;
    }
  };
}
