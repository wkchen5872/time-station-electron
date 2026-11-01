/**
 * 資料有效性與異常狀態
 *
 * 現行實作在缺少 API 金鑰時直接返回，使畫面續用硬編碼的初始值並被當成真實天氣；
 * 更新失敗也只留下一行 log。這裡以可判定的狀態取代那組二分法。
 *
 * 「成功更新」必須同時滿足：請求完成、回應可解析、且解析後存在涵蓋當下時段的資料。
 * 僅 HTTP 200 不構成成功。
 */

import { hasUsableData } from './forecastSlots.mjs';
import { hasValue } from './value.mjs';

export const ANOMALY = {
  NEVER: 'never',
  STALE: 'stale',
  UNLOCATED: 'unlocated'
};

/** 預設過期門檻：刷新週期 30 分鐘，連續三次失敗才視為持續性問題。 */
export const DEFAULT_STALE_THRESHOLD_MS = 90 * 60 * 1000;

/**
 * 判定一次回應是否構成成功更新
 * @param {Object|null} series - 解析後的元素序列
 * @param {number} now
 */
export function isSuccessfulUpdate(series, now) {
  if (!series) return false;
  return hasUsableData(series, now);
}

/**
 * 解析當前異常狀態
 *
 * 優先順序 never > stale > unlocated，各異常獨立成立與解除。
 *
 * @param {Object} input
 * @param {boolean} input.everSucceeded
 * @param {number|null} input.lastSuccessAt
 * @param {number} input.now
 * @param {boolean} input.locationKnown - 定位可用（含設定位置與快取）
 * @param {number} [input.staleThresholdMs]
 * @param {boolean} [input.latestResponseUsable] - 最近一次回應是否涵蓋當下且帶值
 * @param {boolean} [input.coverageActive] - 現有資料是否仍涵蓋當下時段
 * @returns {{kind: string|null, all: string[], staleReason: string|null}}
 */
export function resolveAnomaly({
  everSucceeded,
  lastSuccessAt,
  now,
  locationKnown,
  staleThresholdMs = DEFAULT_STALE_THRESHOLD_MS,
  latestResponseUsable = true,
  coverageActive = true
}) {
  const all = [];
  let staleReason = null;

  if (!everSucceeded) {
    all.push(ANOMALY.NEVER);
  } else {
    // 過期有三個獨立成因，任一成立即為 stale；僅靠時間門檻會漏掉前兩者
    if (!latestResponseUsable) staleReason = 'no-cover';
    else if (!coverageActive) staleReason = 'coverage-exhausted';
    else if (lastSuccessAt === null || now - lastSuccessAt > staleThresholdMs) {
      staleReason = 'threshold';
    }
    if (staleReason) all.push(ANOMALY.STALE);
  }

  if (!locationKnown) all.push(ANOMALY.UNLOCATED);

  const priority = [ANOMALY.NEVER, ANOMALY.STALE, ANOMALY.UNLOCATED];
  const kind = priority.find((k) => all.includes(k)) || null;

  return { kind, all, staleReason };
}

export { hasValue } from './value.mjs';

/** 缺值的畫面呈現 */
export const MISSING_DISPLAY = '—';

/**
 * 缺值安全的顯示字串
 * @param {*} value
 * @param {(v:*) => string} [format]
 */
export function display(value, format = (v) => String(v)) {
  return hasValue(value) ? format(value) : MISSING_DISPLAY;
}
