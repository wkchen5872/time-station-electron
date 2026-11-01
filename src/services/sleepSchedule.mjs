/**
 * 睡眠模式判定
 *
 * 行為沿用既有契約，拆分不得改變它：
 *   - 自 sleepMode.enabled / startHour / endHour 設定判定，23／6 為預設值而非常數
 *   - sleepModeOverride 維持 null | true | false，保留 false 的強制清醒邏輯
 *   - 按鈕僅循環 Auto 與 On，Off 不在 UI 上開放但邏輯保留
 */

/**
 * 時段是否落在設定的睡眠窗內（支援跨午夜）
 * @param {number} hour - 0-23
 * @param {number} startHour
 * @param {number} endHour
 */
export function isWithinSleepWindow(hour, startHour, endHour) {
  if (startHour === endHour) return false;
  return startHour > endHour
    ? hour >= startHour || hour < endHour
    : hour >= startHour && hour < endHour;
}

/**
 * 解析睡眠狀態
 * @param {Object} input
 * @param {null|boolean} input.override - null 為自動；true 強制睡眠；false 強制清醒
 * @param {boolean} input.enabled
 * @param {number} input.startHour
 * @param {number} input.endHour
 * @param {number} input.hour
 * @returns {boolean}
 */
export function resolveSleepState({ override, enabled, startHour, endHour, hour }) {
  if (override === true) return true;
  if (override === false) return false;
  if (!enabled) return false;
  return isWithinSleepWindow(hour, startHour, endHour);
}

/**
 * 按鈕循環：僅 Auto (null) 與 On (true)。
 * 既有的 false（強制清醒）保留於狀態模型，但不經由按鈕到達。
 */
export function cycleSleepOverride(current) {
  return current === true ? null : true;
}
