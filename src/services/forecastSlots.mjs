/**
 * 預報時間格組成
 *
 * 來源資料的各個元素粒度不同：溫度近期逐時、遠期逐三小時；降雨機率為三小時區間。
 * 若以溫度列為主軸再把涵蓋該時間點的三小時機率複製進去，畫面上就會出現
 * 「逐時格子掛三小時機率」，暗示來源沒有提供的精度。
 *
 * 因此格的組成固定在共用層進行，與任何版面變體的顯隱規則無關：
 *   - 格區間取該格可取得元素中最粗者
 *   - 粒度不細於格者，其區間必須涵蓋整個格，否則不放入該格
 *   - 粒度細於格者，取格起點的值（明定的取樣規則）
 */

import { formatLocalDate } from './localDate.mjs';
import { hasValue, hasTextValue, toFiniteNumber } from './value.mjs';

const HOUR_MS = 60 * 60 * 1000;

/** 數值元素：必須可轉為有限數才算可用；'abc'、'NaN'、true、[] 皆不可用。 */
export const NUMERIC_SERIES_KEYS = ['temperature', 'feelsLike', 'rainProbability', 'humidity'];

/** 共用資料契約所列的元素；格組成一律以此全集為準。 */
export const SERIES_KEYS = [
  'temperature',
  'feelsLike',
  'weather',
  'weatherCode',
  'rainProbability',
  'humidity',
  'windSpeed',
  'comfort'
];

/**
 * 找出涵蓋某個時間點的區間條目（半開區間 [start, end)）
 * @param {Array<{value:*, start:number, end:number}>} series
 * @param {number} atMs
 */
export function entryCovering(series, atMs) {
  if (!Array.isArray(series)) return null;
  return series.find((e) => atMs >= e.start && atMs < e.end) || null;
}

/**
 * 組成時間格
 *
 * @param {Object} series - { [key]: Array<{value, start, end}> }
 * @param {Object} options
 * @param {number} options.now - 現在時間 (ms)
 * @param {number} [options.count=4] - 格數
 * @returns {Array<{start:number, end:number, durationMs:number, label:string, values:Object}>}
 */
export function composeSlots(series, { now, count = 4 } = {}) {
  const slots = [];
  let cursor = now;

  for (let i = 0; i < count; i += 1) {
    const covering = SERIES_KEYS
      .map((key) => ({ key, entry: entryCovering(series[key], cursor) }))
      .filter((x) => x.entry);

    if (covering.length === 0) break;

    // 格的起訖：起點取最粗元素的起點（使標籤與來源區間一致），終點取最粗者的終點
    let driver = covering[0].entry;
    for (const { entry } of covering) {
      if (entry.end - entry.start > driver.end - driver.start) driver = entry;
    }
    const slotStart = i === 0 ? driver.start : cursor;
    const slotEnd = driver.end;
    if (slotEnd <= slotStart) break;

    const slotDuration = slotEnd - slotStart;
    const values = {};
    for (const key of SERIES_KEYS) {
      const entry = entryCovering(series[key], slotStart);
      if (!entry) {
        values[key] = null;
        continue;
      }
      const entryDuration = entry.end - entry.start;
      if (entryDuration >= slotDuration) {
        // 粒度不細於格：必須涵蓋整個格，僅部分重疊者不放入
        values[key] = entry.end >= slotEnd ? entry.value : null;
      } else {
        // 粒度細於格：取格起點的值
        values[key] = entry.value;
      }
    }

    slots.push({
      start: slotStart,
      end: slotEnd,
      durationMs: slotDuration,
      label: formatSlotLabel(slotStart, slotEnd),
      values
    });

    cursor = slotEnd;
  }

  return slots;
}

/**
 * 格標籤：1 小時顯示該小時，長於 1 小時顯示起訖。
 * 不顯示總跨度；每格標籤已足以識別其實際區間。
 */
export function formatSlotLabel(startMs, endMs) {
  const start = new Date(startMs);
  const end = new Date(endMs);
  const startLabel = `${String(start.getHours()).padStart(2, '0')}:00`;
  if (endMs - startMs <= HOUR_MS) return startLabel;
  return `${String(start.getHours()).padStart(2, '0')}–${String(end.getHours()).padStart(2, '0')}`;
}

/**
 * 以本地日期分組某個元素序列
 * @param {Array<{value:*, start:number, end:number}>} series
 * @returns {Map<string, Array>}
 */
export function groupByLocalDate(series) {
  const grouped = new Map();
  if (!Array.isArray(series)) return grouped;
  for (const entry of series) {
    const key = formatLocalDate(new Date(entry.start));
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(entry);
  }
  return grouped;
}

/** 代表時段為當日 06:00–18:00 */
export function isDaytime(entry) {
  const hour = new Date(entry.start).getHours();
  return hour >= 6 && hour < 18;
}

/**
 * 每日預報的代表值
 *
 * 天氣代碼取 06:00-18:00 中降雨機率最高的時段；全部相同時取該區間第一個時段。
 * 降雨機率取該區間最大值。高低溫取全日所有時段。
 *
 * @param {Object} daySeries - { temperature: [], weatherCode: [], weather: [], rainProbability: [] }
 * @returns {{high:number|null, low:number|null, weatherCode:*, weather:*, rainProbability:number|null}}
 */
export function dailyRepresentative(daySeries) {
  const temps = (daySeries.temperature || [])
    .map((e) => toFiniteNumber(e.value))
    .filter((n) => n !== null);

  const daytimeRain = (daySeries.rainProbability || []).filter(isDaytime);
  const daytimeCodes = (daySeries.weatherCode || []).filter((e) => isDaytime(e) && hasValue(e.value));
  const daytimeWeather = (daySeries.weather || []).filter((e) => isDaytime(e) && hasValue(e.value));

  let rainProbability = null;
  let pickAt = null;
  for (const entry of daytimeRain) {
    const n = toFiniteNumber(entry.value);
    if (n === null) continue;
    if (rainProbability === null || n > rainProbability) {
      rainProbability = n;
      pickAt = entry.start;
    }
  }
  // 全部相同（或無降雨資料）時取區間第一個時段
  if (pickAt === null && daytimeCodes.length > 0) pickAt = daytimeCodes[0].start;

  const codeEntry = pickAt === null
    ? daytimeCodes[0] || null
    : entryCovering(daytimeCodes, pickAt) || daytimeCodes[0] || null;
  const weatherEntry = pickAt === null
    ? daytimeWeather[0] || null
    : entryCovering(daytimeWeather, pickAt) || daytimeWeather[0] || null;

  return {
    high: temps.length ? Math.max(...temps) : null,
    low: temps.length ? Math.min(...temps) : null,
    weatherCode: codeEntry ? codeEntry.value : null,
    weather: weatherEntry ? weatherEntry.value : null,
    rainProbability
  };
}

/**
 * 取出指定本地日期的各元素序列
 * @param {Object} series
 * @param {string} localDate - YYYY-MM-DD
 */
export function seriesForLocalDate(series, localDate) {
  const result = {};
  for (const key of SERIES_KEYS) {
    const grouped = groupByLocalDate(series[key]);
    result[key] = grouped.get(localDate) || [];
  }
  return result;
}

/** 是否有任何元素的區間涵蓋當下時段（不論該區間是否帶值） */
export function coversNow(series, now) {
  if (!series) return false;
  return SERIES_KEYS.some((key) => entryCovering(series[key], now) !== null);
}

/**
 * 是否有涵蓋當下時段且帶有可用值的資料。
 *
 * 只有時間框而全部缺值的回應不算可用：那種回應若被當成成功，會清除 never／stale、
 * 更新成功時間，畫面還會顯示捏造的 0°／0%。
 */
export function isUsableValue(key, value) {
  return NUMERIC_SERIES_KEYS.includes(key)
    ? toFiniteNumber(value) !== null
    : hasTextValue(value);
}

export function hasUsableData(series, now) {
  if (!series) return false;
  return SERIES_KEYS.some((key) => {
    const entry = entryCovering(series[key], now);
    return entry !== null && isUsableValue(key, entry.value);
  });
}

/**
 * 補足固定格數：資料層只回傳可取得的真實格子，呈現層補上缺值位置。
 * 不虛構時間或天氣——placeholder 不帶 label 與數值。
 */
export function padSlots(slots, count = 4) {
  const padded = (slots || []).slice(0, count).map((slot, index) => ({
    ...slot,
    key: `slot-${index}`,
    placeholder: false
  }));
  while (padded.length < count) {
    padded.push({
      key: `slot-${padded.length}`,
      placeholder: true,
      label: null,
      start: null,
      end: null,
      durationMs: null,
      values: {}
    });
  }
  return padded;
}
