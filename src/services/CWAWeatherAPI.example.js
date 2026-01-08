/**
 * CWAWeatherAPI 使用範例
 *
 * 這個檔案展示如何使用台灣中央氣象署 API Wrapper
 */

import CWAWeatherAPI from './CWAWeatherAPI.js';

// ====================================
// 方法 1：使用環境變數中的 API Key
// ====================================
const apiKey = import.meta.env.VITE_CWA_API_KEY;
const weatherAPI = new CWAWeatherAPI(apiKey);

// ====================================
// 範例 1：查詢台北市未來 3 天天氣預報
// ====================================
async function example1() {
  try {
    const forecast = await weatherAPI.getWeatherForecast('台北市', 3);

    console.log('=== 台北市未來 3 天天氣預報 ===');
    console.log('縣市：', forecast.locationName);
    console.log('預報資料：');

    forecast.forecast.forEach((slot, index) => {
      console.log(`\n第 ${index + 1} 時段:`);
      console.log('  時間：', slot.startTime, '~', slot.endTime);
      console.log('  溫度：', slot.temperature, '°C');
      console.log('  體感：', slot.feelsLike, '°C');
      console.log('  天氣：', slot.weather);
      console.log('  降雨機率：', slot.rainProbability, '%');
      console.log('  濕度：', slot.humidity, '%');
    });

    return forecast;
  } catch (error) {
    console.error('查詢失敗：', error);
  }
}

// ====================================
// 範例 2：查詢新竹市未來 7 天天氣預報
// ====================================
async function example2() {
  try {
    const forecast = await weatherAPI.getWeatherForecast('新竹市', 7);

    console.log('=== 新竹市未來 7 天天氣預報 ===');
    console.log('共 ' + forecast.forecast.length + ' 個時段');

    // 只顯示前 5 個時段
    forecast.forecast.slice(0, 5).forEach((slot, index) => {
      console.log(`${slot.startTime}: ${slot.weather}, ${slot.temperature}°C`);
    });

    return forecast;
  } catch (error) {
    console.error('查詢失敗：', error);
  }
}

// ====================================
// 範例 3：查詢台北市日出日落時間
// ====================================
async function example3() {
  try {
    const sunData = await weatherAPI.getSunriseSunset('台北市');

    console.log('=== 台北市日出日落時間 ===');
    console.log('縣市：', sunData.countyName);

    sunData.sunTimes.forEach(day => {
      console.log(`${day.date}: 日出 ${day.sunrise} / 日落 ${day.sunset}`);
    });

    return sunData;
  } catch (error) {
    console.error('查詢失敗：', error);
  }
}

// ====================================
// 範例 4：查詢指定日期範圍的日出日落
// ====================================
async function example4() {
  try {
    const sunData = await weatherAPI.getSunriseSunset(
      '新竹市',
      '2026-01-07', // 起始日期
      '2026-01-10'  // 結束日期
    );

    console.log('=== 新竹市 2026/1/7-1/10 日出日落 ===');
    sunData.sunTimes.forEach(day => {
      console.log(`${day.date}: ${day.sunrise} ~ ${day.sunset}`);
    });

    return sunData;
  } catch (error) {
    console.error('查詢失敗：', error);
  }
}

// ====================================
// 範例 5：在 Vue 元件中使用
// ====================================
/*
在 TimeStation.vue 中的使用方式：

import CWAWeatherAPI from '../services/CWAWeatherAPI.js';

export default {
  setup() {
    const weather = ref({});

    const updateWeather = async () => {
      const apiKey = import.meta.env.VITE_CWA_API_KEY;
      const weatherAPI = new CWAWeatherAPI(apiKey);

      try {
        // 查詢天氣預報
        const forecast = await weatherAPI.getWeatherForecast('台北市', 3);

        // 取得今天的天氣
        const today = forecast.forecast[0];
        weather.value = {
          temperature: today.temperature,
          feelsLike: today.feelsLike,
          weather: today.weather,
          humidity: today.humidity,
          rainProbability: today.rainProbability
        };

        // 查詢日出日落
        const sunData = await weatherAPI.getSunriseSunset('台北市');
        const todaySun = sunData.sunTimes[0];
        weather.value.sunrise = todaySun.sunrise;
        weather.value.sunset = todaySun.sunset;

      } catch (error) {
        console.error('更新天氣失敗：', error);
      }
    };

    onMounted(() => {
      updateWeather();
    });

    return { weather };
  }
};
*/

// ====================================
// 執行範例（開發測試用）
// ====================================
export async function runExamples() {
  console.log('\n========== CWA Weather API 範例 ==========\n');

  await example1();
  console.log('\n------------------------------------------\n');

  await example2();
  console.log('\n------------------------------------------\n');

  await example3();
  console.log('\n------------------------------------------\n');

  await example4();

  console.log('\n========== 範例執行完畢 ==========\n');
}

// 如果直接執行此檔案，運行所有範例
// runExamples();
