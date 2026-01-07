/**
 * AIWeatherAdvisor 使用範例 (使用 LangChain.js)
 *
 * 展示如何使用 AI 天氣建議服務
 *
 * 注意：現在使用 LangChain.js 來處理 AI API 呼叫
 * - 更穩定的 API 整合
 * - 統一的錯誤處理
 * - 更好的開發體驗
 */

import AIWeatherAdvisor from './AIWeatherAdvisor.js';

// ====================================
// 方法 1：使用 Gemini (推薦 - 免費額度高)
// ====================================
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
const advisorGemini = new AIWeatherAdvisor('gemini', geminiKey);

// ====================================
// 方法 2：使用 OpenAI
// ====================================
const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
const advisorOpenAI = new AIWeatherAdvisor('openai', openaiKey);

// ====================================
// 範例 1：取得基本天氣建議
// ====================================
async function example1() {
  const weatherData = {
    temperature: 28,
    weather: '晴時多雲',
    feelsLike: 29,
    rainProbability: 20,
    humidity: 65,
    windSpeed: '2-3',
    comfort: '舒適'
  };

  try {
    const advice = await advisorGemini.getAdvice(weatherData);
    console.log('=== 範例 1：基本天氣建議 ===');
    console.log('天氣資料：', weatherData);
    console.log('AI 建議：', advice);
    return advice;
  } catch (error) {
    console.error('取得建議失敗：', error);
  }
}

// ====================================
// 範例 2：高降雨機率情境
// ====================================
async function example2() {
  const weatherData = {
    temperature: 25,
    weather: '多雲時陰短暫陣雨',
    feelsLike: 26,
    rainProbability: 80,
    humidity: 85,
    windSpeed: '3-4',
    comfort: '悶熱'
  };

  try {
    const advice = await advisorGemini.getAdvice(weatherData);
    console.log('\n=== 範例 2：高降雨機率 ===');
    console.log('降雨機率：', weatherData.rainProbability, '%');
    console.log('AI 建議：', advice);
    return advice;
  } catch (error) {
    console.error('取得建議失敗：', error);
  }
}

// ====================================
// 範例 3：極端高溫情境
// ====================================
async function example3() {
  const weatherData = {
    temperature: 35,
    weather: '晴朗炎熱',
    feelsLike: 38,
    rainProbability: 10,
    humidity: 70,
    windSpeed: '1-2',
    comfort: '悶熱'
  };

  try {
    const advice = await advisorGemini.getAdvice(weatherData);
    console.log('\n=== 範例 3：極端高溫 ===');
    console.log('體感溫度：', weatherData.feelsLike, '°C');
    console.log('AI 建議：', advice);
    return advice;
  } catch (error) {
    console.error('取得建議失敗：', error);
  }
}

// ====================================
// 範例 4：寒冷天氣情境
// ====================================
async function example4() {
  const weatherData = {
    temperature: 10,
    weather: '多雲偶雨',
    feelsLike: 8,
    rainProbability: 50,
    humidity: 80,
    windSpeed: '4-5',
    comfort: '偏冷'
  };

  try {
    const advice = await advisorGemini.getAdvice(weatherData);
    console.log('\n=== 範例 4：寒冷天氣 ===');
    console.log('體感溫度：', weatherData.feelsLike, '°C');
    console.log('AI 建議：', advice);
    return advice;
  } catch (error) {
    console.error('取得建議失敗：', error);
  }
}

// ====================================
// 範例 5：測試快取機制
// ====================================
async function example5() {
  const weatherData = {
    temperature: 28,
    weather: '晴時多雲',
    feelsLike: 29,
    rainProbability: 20,
    humidity: 65,
    windSpeed: '2-3',
    comfort: '舒適'
  };

  console.log('\n=== 範例 5：測試快取機制 ===');

  // 第一次呼叫（會實際呼叫 API）
  console.log('第一次呼叫（呼叫 API）...');
  const advice1 = await advisorGemini.getAdvice(weatherData);
  console.log('結果 1：', advice1);

  // 第二次呼叫（應該使用快取）
  console.log('\n立即第二次呼叫（應使用快取）...');
  const advice2 = await advisorGemini.getAdvice(weatherData);
  console.log('結果 2：', advice2);
  console.log('是否相同？', advice1 === advice2);

  // 修改天氣資料（溫度大幅變化）
  console.log('\n修改天氣資料（溫度變化超過 3 度）...');
  weatherData.temperature = 32;
  const advice3 = await advisorGemini.getAdvice(weatherData);
  console.log('結果 3：', advice3);
  console.log('是否不同？', advice1 !== advice3);
}

// ====================================
// 範例 6：在 Vue 元件中使用
// ====================================
/*
在 TimeStation.vue 中的使用方式：

import AIWeatherAdvisor from '../services/AIWeatherAdvisor.js';

export default {
  setup() {
    const aiMessage = ref('');
    const advisor = ref(null);

    const updateAIMessage = async () => {
      // 初始化 AI Advisor（只需初始化一次）
      if (!advisor.value) {
        const provider = import.meta.env.VITE_AI_PROVIDER || 'gemini';
        const apiKey = provider === 'openai'
          ? import.meta.env.VITE_OPENAI_API_KEY
          : import.meta.env.VITE_GEMINI_API_KEY;

        advisor.value = new AIWeatherAdvisor(provider, apiKey);
      }

      // 準備天氣資料
      const weatherData = {
        temperature: weather.value.current,
        weather: weather.value.condition,
        feelsLike: weather.value.feelsLike,
        rainProbability: weather.value.rainProbability,
        humidity: weather.value.humidity,
        windSpeed: weather.value.windSpeed,
        comfort: weather.value.comfort
      };

      try {
        // 取得 AI 建議
        const advice = await advisor.value.getAdvice(weatherData);
        aiMessage.value = advice;
      } catch (error) {
        console.error('更新 AI 訊息失敗：', error);
      }
    };

    onMounted(() => {
      updateAIMessage();
    });

    return { aiMessage };
  }
};
*/

// ====================================
// 執行範例（開發測試用）
// ====================================
export async function runExamples() {
  console.log('\n========== AI Weather Advisor 範例 ==========\n');

  await example1();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await example2();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await example3();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await example4();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await example5();

  console.log('\n========== 範例執行完畢 ==========\n');
}

// 如果直接執行此檔案，運行所有範例
// runExamples();
