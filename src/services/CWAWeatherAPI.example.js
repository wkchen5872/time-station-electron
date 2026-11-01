/**
 * CWAWeatherAPI 使用範例
 *
 * 這個檔案展示如何使用台灣中央氣象署 API Wrapper。
 *
 * getWeatherForecast() 回傳的 `series` 是「每個元素各自攜帶來源區間」的結構：
 *
 *   series.temperature     -> [{ value, start, end }, ...]
 *   series.rainProbability -> [{ value, start, end }, ...]
 *
 * 同一回應內各元素的粒度可能不同（溫度近期逐時、降雨機率為三小時區間），
 * 因此不要把某個元素的值當成另一個元素時間點上的值。畫面要顯示的時間格請用
 * forecastSlots.composeSlots()，它會把格的區間取為最粗者並標示實際區間。
 */

import CWAWeatherAPI from './CWAWeatherAPI.js';
import { composeSlots, dailyRepresentative, seriesForLocalDate } from './forecastSlots.mjs';
import { localDateAfter } from './localDate.mjs';

// ====================================
// 方法 1：使用環境變數中的 API Key
// ====================================
const apiKey = import.meta.env.VITE_CWA_API_KEY;
const weatherAPI = new CWAWeatherAPI(apiKey);

const fmt = (ms) => new Date(ms).toLocaleString('zh-TW');

// ====================================
// 範例 1：讀出各元素及其來源區間
// ====================================
async function example1() {
  try {
    const forecast = await weatherAPI.getWeatherForecast('台北市', 3);

    console.log('=== 台北市未來 3 天天氣預報 ===');
    console.log('縣市：', forecast.locationName);

    const { series } = forecast;

    series.temperature.slice(0, 5).forEach((entry, index) => {
      console.log(`\n第 ${index + 1} 筆溫度:`);
      console.log('  區間：', fmt(entry.start), '~', fmt(entry.end));
      console.log('  溫度：', entry.value, '°C');
    });

    series.rainProbability.slice(0, 3).forEach((entry) => {
      // 降雨機率有自己的區間，通常比溫度粗
      console.log(`\n降雨機率 ${fmt(entry.start)} ~ ${fmt(entry.end)}：${entry.value}%`);
    });

    return forecast;
  } catch (error) {
    console.error('查詢失敗：', error);
  }
}

// ====================================
// 範例 2：組成畫面要顯示的時間格
// ====================================
async function example2() {
  try {
    const forecast = await weatherAPI.getWeatherForecast('新竹市', 3);

    console.log('=== 新竹市短期預報 ===');
    const slots = composeSlots(forecast.series, { now: Date.now(), count: 4 });

    slots.forEach((slot) => {
      // 標籤已反映該格的實際區間；1 小時顯示該小時，長於 1 小時顯示起訖
      console.log(
        `${slot.label}: ${slot.values.weather}, ${slot.values.temperature}°C, `
        + `降雨 ${slot.values.rainProbability}%`
      );
    });

    return slots;
  } catch (error) {
    console.error('查詢失敗：', error);
  }
}

// ====================================
// 範例 3：取得明天的每日代表值
// ====================================
async function example3() {
  try {
    const forecast = await weatherAPI.getWeatherForecast('台北市', 3);

    const tomorrow = localDateAfter(new Date(), 1);
    const daySeries = seriesForLocalDate(forecast.series, tomorrow);
    const rep = dailyRepresentative(daySeries);

    console.log('=== 明天 ===');
    console.log('日期：', tomorrow);
    console.log('天氣：', rep.weather, `(code ${rep.weatherCode})`);
    console.log('高低溫：', `${rep.low}°C ~ ${rep.high}°C`);
    console.log('降雨機率：', `${rep.rainProbability}%`);

    return rep;
  } catch (error) {
    console.error('查詢失敗：', error);
  }
}

// ====================================
// 範例 4：在 Vue 元件中使用
// ====================================
/*
實際使用請見 src/composables/useWeatherStation.js。要點：

import CWAWeatherAPI from '../services/CWAWeatherAPI.js';
import { composeSlots, entryCovering } from '../services/forecastSlots.mjs';

const forecast = await new CWAWeatherAPI(apiKey).getWeatherForecast('台北市', 3);

// 現況取涵蓋當下的那一筆，而不是陣列的第 0 筆
const nowMs = Date.now();
const temperature = entryCovering(forecast.series.temperature, nowMs)?.value ?? null;

// 畫面上的時間格由共用層組成，與版面變體的顯隱規則無關
const slots = composeSlots(forecast.series, { now: nowMs, count: 4 });
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

  console.log('\n========== 範例執行完畢 ==========\n');
}

// 如果直接執行此檔案，運行所有範例
// runExamples();
