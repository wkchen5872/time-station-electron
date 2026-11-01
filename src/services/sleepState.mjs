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

export const DEFAULT_SLEEP_CONFIG = { enabled: true, startHour: 23, endHour: 6 };

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
      enabled: config.enabled !== false,
      startHour: config.startHour ?? DEFAULT_SLEEP_CONFIG.startHour,
      endHour: config.endHour ?? DEFAULT_SLEEP_CONFIG.endHour,
      hour: unref(currentHour)
    });
  });
}
