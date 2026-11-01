/**
 * 缺值判定
 *
 * 數值 0（0°C、0%）是有效值，必須以非空值判定而非 falsy 判定。
 * 「有效」只決定它不是缺值；是否顯示由變體的顯示規則決定。
 *
 * 獨立成一個模組，讓 forecastSlots 與 dataState 都能取用而不互相循環引用。
 */

export function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

/**
 * 轉為數值，缺值回傳 null。
 * Number(null) === 0 會把缺值變成假的 0，必須先排除。
 */
export function toFiniteNumber(value) {
  // 只接受 number 與 string：Boolean、Array 等經 Number() 會變成假的 0／1
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (!hasValue(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** 文字元素：保留文字語意，不要求可轉為數值 */
export function hasTextValue(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  return hasValue(value);
}
