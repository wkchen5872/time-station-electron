/**
 * 版面變體與各變體的顯示規則
 *
 * 共用層只負責「資料是否可取得」；是否顯示由各變體自行決定。
 * 一個變體的取捨規則不得自動成為其他變體的要求——保留兩版差異正是比較的目的。
 */

import { hasValue } from './dataState.mjs';

export const VARIANTS = ['codex', 'claude'];
export const DEFAULT_VARIANT = 'codex';

/** 持久化鍵。不沿用已退役的 displayModeOverride。 */
export const VARIANT_STORAGE_KEY = 'layoutVariant';

/**
 * 正規化持久化讀回的值；缺值或未知值一律回退預設。
 */
export function normalizeVariant(value) {
  return VARIANTS.includes(value) ? value : DEFAULT_VARIANT;
}

/** 切換到另一個變體 */
export function nextVariant(current) {
  const index = VARIANTS.indexOf(normalizeVariant(current));
  return VARIANTS[(index + 1) % VARIANTS.length];
}

/**
 * 各變體的顯示規則
 *
 * codex 依 docs/theme/v2/desgin-codex-v4.svg
 * claude 依 docs/theme/v2/design-claude-v4.svg
 */
export const VARIANT_RULES = {
  codex: {
    showTodayHighLow: false,
    showFeelsLike: false,
    showUpdatedAt: true,
    showForecastLabel: true,
    rainThreshold: null,
    lunarPlacement: 'above-clock'
  },
  claude: {
    showTodayHighLow: true,
    showFeelsLike: 'conditional',
    showUpdatedAt: false,
    showForecastLabel: false,
    rainThreshold: 20,
    feelsLikeDelta: 3,
    uncomfortableComfort: ['悶熱', '寒冷'],
    lunarPlacement: 'inline'
  }
};

export function rulesFor(variant) {
  return VARIANT_RULES[normalizeVariant(variant)];
}

/**
 * 降雨機率是否顯示。
 * 門檻為變體專屬：codex 無門檻（0% 亦顯示），claude 低於 20% 留空。
 * 無論顯示與否，底層值都保持有效，不視為缺值。
 */
export function shouldShowRain(variant, probability) {
  if (!hasValue(probability)) return false;
  const { rainThreshold } = rulesFor(variant);
  if (rainThreshold === null) return true;
  return Number(probability) >= rainThreshold;
}

/**
 * 體感是否顯示。
 * claude 專屬條件：與同時段的現況預報溫度相差達 3 度，或舒適度為悶熱／寒冷。
 * 版位固定保留，條件不成立時留空而不收合。
 */
export function shouldShowFeelsLike(variant, { feelsLike, temperature, comfort } = {}) {
  const rules = rulesFor(variant);
  if (rules.showFeelsLike !== 'conditional') return Boolean(rules.showFeelsLike);
  if (!hasValue(feelsLike)) return false;

  if (hasValue(comfort) && rules.uncomfortableComfort.some((w) => String(comfort).includes(w))) {
    return true;
  }
  if (!hasValue(temperature)) return false;
  return Math.abs(Number(feelsLike) - Number(temperature)) >= rules.feelsLikeDelta;
}
