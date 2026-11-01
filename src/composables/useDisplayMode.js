import { ref, computed } from 'vue';

import { cycleSleepOverride } from '../services/sleepSchedule.mjs';
import { createSleepState } from '../services/sleepState.mjs';
import {
  VARIANT_STORAGE_KEY,
  normalizeVariant,
  nextVariant
} from '../services/layoutVariant.mjs';

const SLEEP_STORAGE_KEY = 'sleepModeOverride';

function readStored(store, key) {
  if (!store) return undefined;
  try {
    const raw = store.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch (error) {
    console.warn(`Failed to read ${key} from localStorage`, error);
    return undefined;
  }
}

function writeStored(store, key, value) {
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to persist ${key}`, error);
  }
}

/**
 * 版面變體與睡眠狀態
 *
 * 不再提供淺色呈現，也不再依日出日落或時段自動切換呈現；版面只因使用者明確選擇而變。
 * 睡眠行為沿用既有契約：依 sleepMode 設定判定，保留 false 的強制清醒，按鈕僅循環 Auto 與 On。
 *
 * 設定以 reactive 來源傳入——直接在 computed 內讀取非 reactive 的設定物件，
 * 會在 async 載入完成後不重算，使自訂的 enabled／時窗要等小時變動才生效。
 */
export function useDisplayMode({ currentHour, sleepConfig, storage } = {}) {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);

  // 還原在 setup 階段同步完成：若延到 onMounted 才還原，狀態會由預設翻轉為還原值，
  // 使監看者把「還原」誤判為使用者手動切換，進而送出一次多餘的建議請求。
  const storedVariant = readStored(store, VARIANT_STORAGE_KEY);
  const storedSleep = readStored(store, SLEEP_STORAGE_KEY);

  const variant = ref(normalizeVariant(storedVariant));
  // null 為自動、true 強制睡眠、false 強制清醒（保留既有邏輯，不由按鈕到達）
  const sleepOverride = ref(
    storedSleep === null || typeof storedSleep === 'boolean' ? (storedSleep ?? null) : null
  );
  // 已退役的 displayModeOverride 不讀取，其殘留值不影響呈現

  const isSleepMode = createSleepState({
    sleepConfig,
    currentHour,
    override: sleepOverride
  });

  const sleepLabel = computed(() => (sleepOverride.value === true ? '睡眠 開啟' : '睡眠 自動'));

  function selectVariant(next) {
    const normalized = normalizeVariant(next);
    if (normalized === variant.value) return;
    variant.value = normalized;
    writeStored(store, VARIANT_STORAGE_KEY, normalized);
  }

  function toggleVariant() {
    selectVariant(nextVariant(variant.value));
  }

  function toggleSleep() {
    sleepOverride.value = cycleSleepOverride(sleepOverride.value);
    writeStored(store, SLEEP_STORAGE_KEY, sleepOverride.value);
  }

  return {
    variant,
    sleepOverride,
    isSleepMode,
    sleepLabel,
    selectVariant,
    toggleVariant,
    toggleSleep
  };
}

export default useDisplayMode;
