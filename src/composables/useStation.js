import { computed, watch } from 'vue';

import { useWeatherStation } from './useWeatherStation.js';
import { useDisplayMode } from './useDisplayMode.js';

/**
 * 資料層與模式層的接線
 *
 * 獨立成一個模組，讓這段接線本身可被測試——先前它只存在於 SFC 的 setup 內，
 * 無法在 node 下載入，使得接線層的缺陷只能靠閱讀程式發現。
 */
export function useStation(deps = {}) {
  const station = useWeatherStation(deps);
  const display = useDisplayMode({
    currentHour: station.currentHour,
    sleepConfig: station.sleepConfig,
    storage: deps.storage
  });

  // 定期刷新也要沿用當前睡眠狀態，故把它回傳給資料層
  station.bindSleepState(display.isSleepMode);

  // 進出睡眠時更新提示語氣；切換版面不觸發任何請求。
  // 還原持久化的狀態發生在 setup 階段，不會經過這個監看者。
  watch(
    () => display.isSleepMode.value,
    (sleeping, wasSleeping) => {
      if (wasSleeping === undefined || sleeping === wasSleeping) return;
      station.updateAdvice(sleeping, true);
    }
  );

  const sleeping = computed(() => display.isSleepMode.value);

  return { station, display, sleeping };
}

export default useStation;
