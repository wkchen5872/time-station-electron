const normalizeEnglish = (value) => (value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\b(city|county|dist(?:rict)?|township|town)\b/g, '')
  .replace(/[^a-z0-9]/g, '');

const normalizeChinese = (value) => (value || '').trim().replace(/^台/, '臺');

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
    return {
      city: location.city || location.state || '臺北市',
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
