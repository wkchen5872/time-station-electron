/**
 * 睡眠狀態（reactive）
 *
 * 設定是非同步載入的。若 computed 直接讀取 ConfigManager 這類普通物件，載入後
 * 替換的物件不是 reactive dependency，computed 不會重算——在 23 時會先以預設的
 * enabled=true 判為睡眠，之後即使載入 enabled=false 也要等 hour 變動才更正。
 *
 * 因此設定必須以 reactive 來源傳入。
 */

import { computed, unref } from 'vue';
import { resolveSleepState } from './sleepSchedule.mjs';
import { defaultConfig } from '../defaultConfig.js';

/**
 * 保留此匯出供既有呼叫端使用，但值一律取自集中來源，本模組不自行宣告。
 *
 * 必須是 getter：若在模組載入時取一份快照，之後改寫集中來源就不會生效，
 * 等於換個位置重建幽靈預設。
 */
export const DEFAULT_SLEEP_CONFIG = {
  get enabled() { return defaultConfig.sleepMode.enabled; },
  get startHour() { return defaultConfig.sleepMode.startHour; },
  get endHour() { return defaultConfig.sleepMode.endHour; }
};

/**
 * @param {Object} input
 * @param {import('vue').Ref<Object>|Object} input.sleepConfig
 * @param {import('vue').Ref<number>|number} input.currentHour
 * @param {import('vue').Ref<null|boolean>|null|boolean} input.override
 */
export function createSleepState({ sleepConfig, currentHour, override }) {
  return computed(() => {
    const config = unref(sleepConfig) || DEFAULT_SLEEP_CONFIG;
    return resolveSleepState({
      override: unref(override),
      // 三者一律 `??`：缺值必須解析到集中來源。
      // enabled 原為 `config.enabled !== false`，該寫法的 true 來自運算式本身而非
      // 集中來源，改寫集中來源不會生效（幽靈預設）。
      enabled: config.enabled ?? DEFAULT_SLEEP_CONFIG.enabled,
      startHour: config.startHour ?? DEFAULT_SLEEP_CONFIG.startHour,
      endHour: config.endHour ?? DEFAULT_SLEEP_CONFIG.endHour,
      hour: unref(currentHour)
    });
  });
}
