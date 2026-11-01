/**
 * 深色底的兩組色票：清醒與睡眠。
 *
 * 不提供淺色呈現。睡眠模式整面壓暗但不關閉顯示，異常提示沿用睡眠樣式，
 * 不提高亮度或對比。
 *
 * 色值以 inline style 套用而非 Tailwind arbitrary class：JIT 只掃描原始碼中
 * 字面出現的類名，執行期組出來的 `text-[#xxxxxx]` 不會被產生。
 */

export const AWAKE = {
  pageBg: '#0E1216',
  panelBg: '#141A20',
  divider: '#2A323B',
  blockDivider: '#262E36',
  primary: '#F2F4F7',
  date: '#DDE2E8',
  condition: '#E3E7EC',
  secondary: '#9AA4B2',
  tertiary: '#8B95A3',
  muted: '#5F6B77',
  lunar: '#7E8894',
  accent: '#F0C879',
  advisory: '#A8B2BE'
};

export const ASLEEP = {
  pageBg: '#000000',
  panelBg: '#05070A',
  divider: '#141A20',
  blockDivider: '#12161B',
  primary: '#4A5058',
  date: '#3E444C',
  condition: '#3E444C',
  secondary: '#333940',
  tertiary: '#2E343B',
  muted: '#262C33',
  lunar: '#2E343B',
  accent: '#3A4047',
  advisory: '#343A42'
};

export function paletteFor(sleep) {
  return sleep ? ASLEEP : AWAKE;
}
