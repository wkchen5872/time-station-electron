/**
 * 開發模式的長文字測試資料
 *
 * 文字截斷需要以「最長」的字串驗證，但最長的天氣描述、地區名、含節氣的農曆、
 * 外出提示與異常訊息不會自然同時出現，等天氣碰巧湊齊並不實際。
 *
 * 此開關只在開發模式生效，正式建置下 `env.DEV` 為 false，`resolveLongTextMode()`
 * 一律回傳 null，不影響任何呈現。
 *
 * 用法（開發模式的 DevTools console）：
 *   localStorage.setItem('devLongText', 'advice');   // 最長外出提示
 *   localStorage.setItem('devLongText', 'anomaly');  // 最長異常訊息
 *   location.reload();
 *   localStorage.removeItem('devLongText');          // 關閉
 */

const STORAGE_KEY = 'devLongText';

export const LONG_TEXT_MODES = ['advice', 'anomaly'];

/**
 * 各欄位的最長值
 *
 * - location：取自 `taiwan-regions.json` 實際最長的縣市＋鄉鎮組合
 * - weather：CWA 天氣現象描述中最長者
 * - lunar：農曆最長日名加上節氣
 * - advice：AI 一般模式的字數上限 44 字（提示區兩行）
 * - anomaly：`useWeatherStation` 仍會顯示的異常文案中最長者。過期提示已暫停顯示，
 *   其文案不列入；兩則可見文案等長，取優先序較高的那則
 */
export const LONG_TEXT = {
  location: '嘉義縣 阿里山鄉',
  weather: '多雲時陰有陣雨或雷雨有霧',
  lunar: '十一月三十 小雪',
  advice: '入夜後氣溫轉涼且有短暫陣雨，外出請記得帶傘並加件外套，返家前留意路面濕滑與突來的強陣風。',
  anomaly: '目前無法取得天氣資料。'
};

/**
 * 解析目前的長文字模式
 * @param {Object} env - 建置環境（需有 DEV 旗標）
 * @param {Storage|null} storage
 * @returns {'advice'|'anomaly'|null}
 */
export function resolveLongTextMode(env, storage) {
  if (!env || env.DEV !== true) return null;
  if (!storage) return null;

  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  return LONG_TEXT_MODES.includes(raw) ? raw : 'advice';
}
