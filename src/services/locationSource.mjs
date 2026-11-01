/**
 * 定位來源取用順序
 *
 * 定位失敗本身不構成異常——只要還有設定位置或快取可用，畫面就有正確的地區。
 * 只有在三者皆不可用時才是 unlocated。
 */

export const LOCATION_SOURCE = {
  FRESH_CACHE: 'fresh-cache',
  LIVE: 'live',
  STALE_CACHE: 'stale-cache',
  CONFIGURED: 'configured',
  NONE: 'none'
};

/**
 * @param {Object} input
 * @param {Object|null} input.configured - 設定檔中的位置
 * @param {Object|null} input.cached - 快取的定位結果
 * @param {number|null} input.cachedAt
 * @param {number} input.now
 * @param {number} input.cacheDuration
 * @param {Object|null} input.live - 本次 IP 定位結果（失敗為 null）
 * @param {boolean} input.geolocationEnabled
 * @returns {{source:string, data:Object|null, known:boolean}}
 */
export function resolveLocationSource({
  configured = null,
  cached = null,
  cachedAt = null,
  now = Date.now(),
  cacheDuration = 24 * 60 * 60 * 1000,
  live = null,
  geolocationEnabled = true
}) {
  const hasConfigured = Boolean(configured && configured.city);

  if (!geolocationEnabled) {
    return hasConfigured
      ? { source: LOCATION_SOURCE.CONFIGURED, data: configured, known: true }
      : { source: LOCATION_SOURCE.NONE, data: null, known: false };
  }

  const cacheFresh =
    cached !== null && cachedAt !== null && now - cachedAt < cacheDuration;

  if (cacheFresh) {
    return { source: LOCATION_SOURCE.FRESH_CACHE, data: cached, known: true };
  }
  if (live) {
    return { source: LOCATION_SOURCE.LIVE, data: live, known: true };
  }
  // 定位失敗時過期快取仍可用
  if (cached) {
    return { source: LOCATION_SOURCE.STALE_CACHE, data: cached, known: true };
  }
  if (hasConfigured) {
    return { source: LOCATION_SOURCE.CONFIGURED, data: configured, known: true };
  }
  return { source: LOCATION_SOURCE.NONE, data: null, known: false };
}
