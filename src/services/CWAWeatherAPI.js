/**
 * 台灣中央氣象署開放資料 API Wrapper
 *
 * 文件：https://opendata.cwa.gov.tw/dist/opendata-swagger.html
 */

class CWAWeatherAPI {
  /**
   * 建立氣象 API 實例
   * @param {string} apiKey - 氣象署 API Key
   */
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';
  }

  /**
   * 查詢天氣預報
   * @param {string} locationName - 縣市或鄉鎮的中文名稱（例如：台北市、宜蘭縣）
   * @param {number} days - 查詢天數，3 或 7（預設：3）
   * @param {string} timeFrom - 起始日期 YYYY-MM-DD（預設：今天）
   * @param {string} timeTo - 結束日期 YYYY-MM-DD（預設：後天）
   * @returns {Promise<Object>} 天氣預報資料
   */
  async getWeatherForecast(locationName, days = 3, timeFrom = null, timeTo = null) {
    try {
      // 根據天數選擇對應的 API endpoint
      const endpoint = days === 3 ? 'F-D0047-089' : 'F-D0047-091';

      const params = new URLSearchParams({
        Authorization: this.apiKey,
        format: 'JSON',
        LocationName: locationName,
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

      return this._parseWeatherForecast(data);

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
  _parseWeatherForecast(data) {
    if (!data.records || !data.records.locations || !data.records.locations[0]) {
      return null;
    }

    const locations = data.records.locations[0];
    const location = locations.location[0];

    if (!location || !location.weatherElement) {
      return null;
    }

    // 提取各種天氣元素
    const elements = {};
    location.weatherElement.forEach(element => {
      elements[element.elementName] = element.time;
    });

    return {
      locationName: location.locationName,
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
      const startTime = timeSlot.startTime;
      const endTime = timeSlot.endTime;

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
        comfort: this._getElementValue(elements['舒適度指數'], index)
      };

      forecast.push(weatherSlot);
    });

    return forecast;
  }

  /**
   * 取得特定元素的值
   * @private
   */
  _getElementValue(elementArray, index) {
    if (!elementArray || !elementArray[index]) return null;

    const timeSlot = elementArray[index];
    if (timeSlot.elementValue && timeSlot.elementValue[0]) {
      return timeSlot.elementValue[0].value;
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
