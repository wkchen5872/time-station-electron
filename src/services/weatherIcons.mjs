/**
 * 單色線條天氣圖示
 *
 * 取代彩色 emoji：emoji 在 800x480 低對比面板上以 20-24px 呈現時，多雲系列彼此只差
 * 雲層明暗，無法分辨；部分代碼還是雙 emoji 組合，更不可能讀。
 *
 * viewBox 保留 2 單位內距（-2 -2 28 28）。幾何以 0-24 繪製時，雲弧頂點約落在 y≈0，
 * 加上 stroke-width 2 的外擴 1 單位後會達 y≈-1；若 viewBox 為 0 0 24 24 即被裁切，
 * ic-thunder 與 ic-shower 因雲體上移更嚴重。
 */

export const ICON_VIEWBOX = '-2 -2 28 28';
export const ICON_STROKE_WIDTH = 2;

/** 幾何以 0-24 繪製；viewBox 的內距由 ICON_VIEWBOX 提供。 */
export const ICONS = {
  sun: {
    circles: [{ cx: 12, cy: 12, r: 4.6 }],
    paths: [
      'M12 2.2v2.2M12 19.6v2.2M2.2 12h2.2M19.6 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6'
    ]
  },
  partly: {
    circles: [{ cx: 8.4, cy: 7.6, r: 3.1 }],
    paths: [
      'M8.4 1.9v1.4M2.7 7.6h1.4M4.3 3.5l1 1M13.5 3.5l-1 1'
    ],
    groups: [
      {
        transform: 'translate(5.6,8.6) scale(0.72)',
        strokeWidth: 2.8,
        paths: ['M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z']
      }
    ]
  },
  cloud: {
    paths: ['M18 9h-1.26A8 8 0 1 0 9 19h9a5 5 0 0 0 0-10z']
  },
  shower: {
    paths: [
      'M18 7h-1.26A8 8 0 1 0 9 17h9a5 5 0 0 0 0-10z',
      'M9.5 19.2l-1.3 3M15 19.2l-1.3 3'
    ]
  },
  rain: {
    paths: [
      'M18 6h-1.26A8 8 0 1 0 9 16h9a5 5 0 0 0 0-10z',
      'M8.6 18.4v3.2M12.6 19.4v3.2M16.6 18.4v3.2'
    ]
  },
  thunder: {
    paths: [
      'M18 5.5h-1.26A8 8 0 1 0 9 15.5h9a5 5 0 0 0 0-10z',
      'M13.4 17l-3.6 4.6h3.1l-1.4 2.6'
    ]
  },
  fog: {
    paths: [
      'M18 8h-1.26A8 8 0 1 0 9 18h9a5 5 0 0 0 0-10z',
      'M4.5 21.6h8.5M16.5 21.6h3.5'
    ]
  },
  snow: {
    paths: [
      'M18 6.5h-1.26A8 8 0 1 0 9 16.5h9a5 5 0 0 0 0-10z',
      'M9 19.4v3M7.5 20.9h3M15 19.4v3M13.5 20.9h3'
    ]
  },
  unknown: {
    paths: ['M9 9a3 3 0 1 1 3 3v2M12 18.5v.2']
  }
};

export const ICON_IDS = Object.keys(ICONS);

/** CWA 天氣代碼 -> 圖示 id */
const CODE_TO_ICON = {
  1: 'sun',
  2: 'partly',
  3: 'partly',
  4: 'cloud',
  5: 'cloud',
  6: 'cloud',
  7: 'cloud',
  8: 'shower',
  9: 'rain',
  10: 'rain',
  11: 'rain',
  12: 'rain',
  13: 'rain',
  14: 'rain',
  15: 'thunder',
  16: 'thunder',
  17: 'thunder',
  18: 'thunder',
  19: 'shower',
  20: 'shower',
  21: 'thunder',
  22: 'thunder',
  23: 'snow',
  24: 'fog',
  25: 'fog',
  26: 'fog',
  27: 'fog',
  28: 'fog',
  29: 'shower',
  30: 'rain',
  31: 'fog',
  32: 'fog',
  33: 'thunder',
  34: 'thunder',
  35: 'thunder',
  36: 'thunder',
  37: 'snow',
  38: 'rain',
  39: 'rain',
  41: 'thunder',
  42: 'snow'
};

/**
 * @param {string|number|null} code
 * @returns {string} 圖示 id
 */
export function codeToIconId(code) {
  if (code === null || code === undefined || code === '') return 'unknown';
  const normalized = parseInt(code, 10);
  if (!Number.isFinite(normalized)) return 'unknown';
  return CODE_TO_ICON[normalized] || 'unknown';
}
