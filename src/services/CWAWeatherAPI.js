/**
 * 台灣中央氣象署開放資料 API Wrapper
 *
 * 文件：https://opendata.cwa.gov.tw/dist/opendata-swagger.html
 */

import taiwanRegions from '../data/taiwan-regions.json';

// 縣市 API 代碼對應表 (F-D0047)
const COUNTY_API_MAP = {
  '宜蘭縣': { day3: 'F-D0047-001', week1: 'F-D0047-003' },
  '桃園市': { day3: 'F-D0047-005', week1: 'F-D0047-007' },
  '新竹縣': { day3: 'F-D0047-009', week1: 'F-D0047-011' },
  '苗栗縣': { day3: 'F-D0047-013', week1: 'F-D0047-015' },
  '彰化縣': { day3: 'F-D0047-017', week1: 'F-D0047-019' },
  '南投縣': { day3: 'F-D0047-021', week1: 'F-D0047-023' },
  '雲林縣': { day3: 'F-D0047-025', week1: 'F-D0047-027' },
  '嘉義縣': { day3: 'F-D0047-029', week1: 'F-D0047-031' },
  '屏東縣': { day3: 'F-D0047-033', week1: 'F-D0047-035' },
  '臺東縣': { day3: 'F-D0047-037', week1: 'F-D0047-039' },
  '花蓮縣': { day3: 'F-D0047-041', week1: 'F-D0047-043' },
  '澎湖縣': { day3: 'F-D0047-045', week1: 'F-D0047-047' },
  '基隆市': { day3: 'F-D0047-049', week1: 'F-D0047-051' },
  '新竹市': { day3: 'F-D0047-053', week1: 'F-D0047-055' },
  '嘉義市': { day3: 'F-D0047-057', week1: 'F-D0047-059' },
  '臺北市': { day3: 'F-D0047-061', week1: 'F-D0047-063' },
  '高雄市': { day3: 'F-D0047-065', week1: 'F-D0047-067' },
  '新北市': { day3: 'F-D0047-069', week1: 'F-D0047-071' },
  '臺中市': { day3: 'F-D0047-073', week1: 'F-D0047-075' },
  '臺南市': { day3: 'F-D0047-077', week1: 'F-D0047-079' },
  '連江縣': { day3: 'F-D0047-081', week1: 'F-D0047-083' },
  '金門縣': { day3: 'F-D0047-085', week1: 'F-D0047-087' }
};

class CWAWeatherAPI {
  /**
   * 建立氣象 API 實例
   * @param {string} apiKey - 氣象署 API Key
   */
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';
    this.townshipToCountyMap = this._buildTownshipMap();
  }

  /**
   * 建立 鄉鎮 -> 縣市 對應表
   * @private
   */
  _buildTownshipMap() {
    const map = {};
    if (taiwanRegions && taiwanRegions.regions) {
      taiwanRegions.regions.forEach(city => {
        if (city.areaList) {
          city.areaList.forEach(area => {
            map[area.areaName] = city.cityName;
          });
        }
      });
    }
    return map;
  }

  /**
   * 查詢天氣預報
   * @param {string} locationName - 縣市或鄉鎮的中文名稱（例如：台北市、宜蘭縣、羅東鎮）
   * @param {number} days - 查詢天數，3 或 7（預設：3）
   * @param {string} timeFrom - 起始日期 YYYY-MM-DD（預設：今天）
   * @param {string} timeTo - 結束日期 YYYY-MM-DD（預設：後天）
   * @returns {Promise<Object>} 天氣預報資料
   */
  async getWeatherForecast(locationName, days = 3, timeFrom = null, timeTo = null) {
    try {
      // 判斷是否為縣市名稱
      const countyInfo = COUNTY_API_MAP[locationName];
      let endpoint;
      let queryLocation = locationName;

      if (countyInfo) {
        // 如果是縣市，使用對應天數的 API (通常是全台 F-D0047-089/091)
        endpoint = days === 3 ? 'F-D0047-089' : 'F-D0047-091';
      } else {
        // 如果不是縣市，假設是鄉鎮區，嘗試尋找所屬縣市
        const parentCounty = this.townshipToCountyMap[locationName];
        if (parentCounty) {
          // 找到所屬縣市，使用該縣市的專屬 API
          const parentInfo = COUNTY_API_MAP[parentCounty];
          if (parentInfo) {
            endpoint = days === 3 ? parentInfo.day3 : parentInfo.week1;
          }
        }

        // 如果找不到 mapping，預設使用全台縣市 API
        if (!endpoint) {
          console.warn(`Location '${locationName}' not found in county map, defaulting to global API.`);
          endpoint = days === 3 ? 'F-D0047-089' : 'F-D0047-091';
        }
      }

      console.log(`Resolved API Endpoint for ${locationName}: ${endpoint}`);

      const params = new URLSearchParams({
        Authorization: this.apiKey,
        format: 'JSON',
        LocationName: queryLocation,
        ElementName: '舒適度指數,3小時降雨機率,溫度,風速,天氣現象,相對濕度,體感溫度',
        sort: 'time'
      });

      // 加入時間範圍參數（如果有提供）
      if (timeFrom) params.append('timeFrom', timeFrom);
      if (timeTo) params.append('timeTo', timeTo);

      const url = `${this.baseURL}/${endpoint}?${params}`;
      console.log(`Fetching weather forecast for ${locationName} (${days} days)...`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      // 檢查 API 回應是否成功
      if (data.success !== 'true') {
        throw new Error('CWA API returned unsuccessful response');
      }

      return this._parseWeatherForecast(data, locationName);

    } catch (error) {
      console.error('Failed to fetch weather forecast:', error);
      throw error;
    }
  }

  /**
   * 查詢日出日落時間
   * @param {string} countyName - 縣市中文名稱（例如：台北市、新竹市）
   * @param {string} timeFrom - 起始日期 YYYY-MM-DD（預設：今天）
   * @param {string} timeTo - 結束日期 YYYY-MM-DD（預設：後天）
   * @returns {Promise<Object>} 日出日落資料
   */
  async getSunriseSunset(countyName, timeFrom = null, timeTo = null) {
    try {
      const params = new URLSearchParams({
        Authorization: this.apiKey,
        CountyName: countyName,
        parameter: 'SunRiseTime,SunSetTime',
        timeFrom: timeFrom || this._getTodayString(),
        timeTo: timeTo || this._getAfterDaysString(2),
        sort: 'CountyName'
      });

      const url = `${this.baseURL}/A-B0062-001?${params}`;
      console.log(`Fetching sunrise/sunset for ${countyName}...`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      // 檢查 API 回應是否成功
      if (data.success !== 'true') {
        throw new Error('CWA API returned unsuccessful response');
      }

      return this._parseSunriseSunset(data);

    } catch (error) {
      console.error('Failed to fetch sunrise/sunset:', error);
      throw error;
    }
  }

  /**
   * 解析天氣預報資料
   * @private
   */
  _parseWeatherForecast(data, targetLocationName) {
    if (!data.records || !data.records.Locations || data.records.Locations.length === 0) {
      return null;
    }

    const locations = data.records.Locations[0];

    // 尋找符合地點名稱的 location
    let location = locations.Location.find(l => l.LocationName === targetLocationName);

    // 如果找不到，嘗試只取第一個 (如果是單一地點查詢)
    if (!location && locations.Location.length === 1) {
      location = locations.Location[0];
    }

    if (!location && locations.Location.length > 0) {
      console.warn(`Location ${targetLocationName} not found in response locations.`);
      location = locations.Location[0];
    }

    const weatherElement = location.WeatherElement;

    if (!location || !weatherElement) {
      return null;
    }

    // 提取各種天氣元素
    const elements = {};
    weatherElement.forEach(element => {
      const name = element.ElementName;
      const time = element.Time;
      elements[name] = time;
    });

    return {
      locationName: location.LocationName,
      raw: data, // 保留原始資料以供進階使用
      elements: elements,
      // 解析後的簡化資料
      forecast: this._extractForecastData(elements)
    };
  }

  /**
   * 提取預報資料（簡化版本）
   * @private
   */
  _extractForecastData(elements) {
    const forecast = [];

    // 取得溫度資料（作為基準）
    const tempData = elements['溫度'] || [];

    tempData.forEach((timeSlot, index) => {
      const startTime = timeSlot.DataTime;
      const endTime = timeSlot.DataTime;

      // 找出對應時間的其他元素
      const weatherSlot = {
        startTime,
        endTime,
        temperature: this._getElementValue(elements['溫度'], index),
        feelsLike: this._getElementValue(elements['體感溫度'], index),
        weather: this._getElementValue(elements['天氣現象'], index),
        rainProbability: this._getElementValue(elements['3小時降雨機率'], index),
        humidity: this._getElementValue(elements['相對濕度'], index),
        windSpeed: this._getElementValue(elements['風速'], index),
        comfort: this._getElementValue(elements['舒適度指數'], index, 'ComfortIndexDescription')
      };

      forecast.push(weatherSlot);
    });

    return forecast;
  }

  /**
   * 取得特定元素的值
   * @param {Array} elementArray - 元素陣列
   * @param {number} index - 索引
   * @param {string} key - 要取得的欄位名稱（選填），例如 'ComfortIndexDescription'
   * @private
   */
  _getElementValue(elementArray, index, key = null) {
    if (!elementArray || !elementArray[index]) return null;

    const timeSlot = elementArray[index];

    const elementValue = timeSlot.ElementValue;

    if (elementValue && elementValue[0]) {
      const valObj = elementValue[0];

      // 如果指定了 key，先嘗試取得該欄位的值
      if (key && valObj[key] !== undefined) {
        return valObj[key];
      }

      // 先嘗試讀取 'value' (標準 CWA 格式)
      if (valObj.value !== undefined) {
        return valObj.value;
      }

      // 若無 'value'，則取第一個 Key 的值 (處理 User 提供的 {"Temperature": "14"} 格式)
      const values = Object.values(valObj);
      if (values.length > 0) {
        return values[0];
      }
    }

    return null;
  }

  /**
   * 解析日出日落資料
   * @private
   */
  _parseSunriseSunset(data) {
    if (!data.records || !data.records.locations || !data.records.locations.location) {
      return null;
    }

    const location = data.records.locations.location[0];

    if (!location || !location.time) {
      return null;
    }

    return {
      countyName: location.CountyName,
      sunTimes: location.time.map(t => ({
        date: t.Date,
        sunrise: t.SunRiseTime,
        sunset: t.SunSetTime
      })),
      raw: data // 保留原始資料
    };
  }

  /**
   * 取得今天日期字串 (YYYY-MM-DD)
   * @private
   */
  _getTodayString() {
    return this._formatDate(new Date());
  }

  /**
   * 取得 N 天後的日期字串 (YYYY-MM-DD)
   * @private
   */
  _getAfterDaysString(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return this._formatDate(date);
  }

  /**
   * 格式化日期為 YYYY-MM-DD
   * @private
   */
  _formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export default CWAWeatherAPI;
