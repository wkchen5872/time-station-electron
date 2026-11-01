/**
 * 本地日期工具
 *
 * 預報分組必須以顯示時區的日期為準。使用 toISOString() 取日期會得到 UTC 日期，
 * 在 UTC+8 的 00:00-08:00 期間會落到前一天，使今日高低溫落空、明後天各錯一天。
 */

/**
 * 格式化為本地 YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
export function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 取得 N 天後的本地日期字串
 * @param {Date} date
 * @param {number} days
 * @returns {string}
 */
export function localDateAfter(date, days) {
  const shifted = new Date(date.getTime());
  shifted.setDate(shifted.getDate() + days);
  return formatLocalDate(shifted);
}
