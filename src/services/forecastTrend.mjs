/**
 * 預報趨勢
 *
 * 欄位名必須與 caller 傳入的 forecast 一致。先前此處讀 `temp` 而 caller 送
 * `temperature`，兩端都退成 0，使趨勢恆為 0——未來天氣由升溫翻轉為明顯降溫時，
 * 快取也不會失效。
 *
 * 缺值不得當成 0 參與計算，否則「沒有資料」會被當成「沒有變化」。
 */

import { toFiniteNumber } from './value.mjs';

/**
 * 最後一格與第一格的溫差。無法判定時回傳 null。
 * @param {Array<{temperature:*}>} forecast
 * @returns {number|null}
 */
export function temperatureTrend(forecast) {
  if (!Array.isArray(forecast) || forecast.length < 2) return null;

  const first = toFiniteNumber(forecast[0] && forecast[0].temperature);
  const last = toFiniteNumber(forecast[forecast.length - 1] && forecast[forecast.length - 1].temperature);
  if (first === null || last === null) return null;

  return last - first;
}

/**
 * 趨勢是否出現足以使快取失效的翻轉
 * @param {Array} oldForecast
 * @param {Array} newForecast
 * @param {number} [minMagnitude]
 */
export function hasTrendReversal(oldForecast, newForecast, minMagnitude = 2) {
  const oldTrend = temperatureTrend(oldForecast);
  const newTrend = temperatureTrend(newForecast);
  if (oldTrend === null || newTrend === null) return false;

  return Math.sign(oldTrend) !== Math.sign(newTrend) && Math.abs(newTrend) > minMagnitude;
}
