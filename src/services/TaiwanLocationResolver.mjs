import { defaultConfig } from '../defaultConfig.js';

const normalizeEnglish = (value) => (value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\b(city|county|dist(?:rict)?|township|town)\b/g, '')
  .replace(/[^a-z0-9]/g, '');

const normalizeChinese = (value) => (value || '').trim().replace(/^台/, '臺');

/**
 * 兩個縣市名是否指同一個縣市。
 *
 * 供設定的逐欄 fallback 判斷「預設區名是否屬於同一個城市」使用（見
 * useWeatherStation 的 resolveConfiguredLocation）。
 *
 * 判定沿用本模組既有的 `matchesLocation`，因此中文（台／臺）與英文別名
 * （Taipei／Taipei City）都比得出來——不另寫一套只認中文的規則。
 *
 * 兩者都無法對應到 `regions` 內的縣市時，退回字面（中文正規化後）比較。
 */
export function isSameCity(regions, a, b) {
  if (!a || !b) return false;

  const find = (value) => regions.find(
    (region) => matchesLocation(value, region.cityName, region.cityEngName)
  );
  const regionA = find(a);
  const regionB = find(b);

  if (regionA || regionB) return regionA === regionB;
  return normalizeChinese(a) === normalizeChinese(b);
}

const matchesLocation = (value, chineseName, englishName) => {
  const chineseValue = normalizeChinese(value);
  const englishValue = normalizeEnglish(value);
  return chineseValue === normalizeChinese(chineseName) ||
    (englishValue && englishValue === normalizeEnglish(englishName));
};

export function resolveTaiwanLocation(regions, location) {
  const candidates = [location.city, location.district, location.state].filter(Boolean);
  const city = regions.find(region =>
    candidates.some(value => matchesLocation(value, region.cityName, region.cityEngName))
  );

  if (!city) {
    // 完全無法識別時的後備縣市取自集中來源：寫死第二份會在集中來源改動後靜默分歧
    return {
      city: location.city || location.state || defaultConfig.location.city,
      district: location.district || ''
    };
  }

  const district = city.areaList?.find(area =>
    candidates.some(value => matchesLocation(value, area.areaName, area.areaEngName))
  );

  return {
    city: city.cityName,
    district: district?.areaName || ''
  };
}
