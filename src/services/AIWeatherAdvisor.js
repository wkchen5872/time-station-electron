/**
 * AI 天氣建議服務 (修正版 - 使用正確的 LangChain 參數)
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { hasTrendReversal } from './forecastTrend.mjs';
import { getSystemPrompt as buildSystemPrompt } from './advisorPrompts.mjs';

class AIWeatherAdvisor {
  constructor(provider = 'gemini', apiKey) {
    this.provider = provider.toLowerCase();
    this.apiKey = apiKey;

    // 驗證 API Key
    if (!this.apiKey || typeof this.apiKey !== 'string' || this.apiKey.trim() === '') {
      throw new Error(`Invalid API Key for ${this.provider}. Please check your .env configuration.`);
    }

    if (this.apiKey.includes('YOUR_') || this.apiKey.includes('_KEY_HERE')) {
      throw new Error(`API Key not configured for ${this.provider}. Please set VITE_${this.provider.toUpperCase()}_API_KEY in .env file.`);
    }

    // 初始化 LLM 模型
    this.llm = this._initializeLLM();
    console.log('[AIWeatherAdvisor] LLM initialized:', this.llm ? '✅ Success' : '❌ Failed');

    // 快取相關
    this.cacheKey = 'aiWeatherAdviceCache';
    this.cacheTimestampKey = 'aiWeatherAdviceCacheTimestamp';
    this.cacheWeatherDataKey = 'aiWeatherAdviceCacheWeatherData';
    this.cacheValidDuration = 60 * 60 * 1000; // 1 小時

    // Fallback 訊息列表
    this.fallbackMessages = [
      '目前無法連線，但祝您有個美好的一天！',
      '網路似乎不穩定，不過別忘了保持好心情！',
      '暫時無法取得建議，但記得照顧好自己喔！',
      '連線中斷了，但祝您今天一切順利！'
    ];
  }

  _initializeLLM() {
    try {
      if (this.provider === 'openai') {
        return new ChatOpenAI({
          apiKey: this.apiKey,
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 1024
        });
      } else if (this.provider === 'gemini') {
        // 修正：使用正確的參數名稱
        console.log('[AIWeatherAdvisor] Initializing Gemini with API Key length:', this.apiKey.length);

        return new ChatGoogleGenerativeAI({
          apiKey: this.apiKey,
          model: 'gemini-2.5-flash-lite',
          temperature: 0.7,
          maxOutputTokens: 1024
        });
      } else {
        throw new Error(`Unsupported AI provider: ${this.provider}`);
      }
    } catch (error) {
      console.error('[AIWeatherAdvisor] Failed to initialize LLM:', error);
      throw error;
    }
  }

  getSystemPrompt(isSleepMode = false) {
    return buildSystemPrompt(isSleepMode);
  }

  async getAdvice(weatherData, isSleepMode = false) {
    try {
      // 檢查快取 (睡眠模式與一般模式分開快取)
      console.log(weatherData)
      const cachedAdvice = this._getCachedAdvice(weatherData, isSleepMode);
      if (cachedAdvice) {
        console.log('[AIWeatherAdvisor] Using cached advice');
        return cachedAdvice;
      }

      // 呼叫 LLM API
      console.log(`[AIWeatherAdvisor] Fetching advice from ${this.provider} (Sleep Mode: ${isSleepMode})...`);

      const userPrompt = isSleepMode
        ? `根據以下天氣數據，給我一句溫暖的晚安建議：\n\n${JSON.stringify(weatherData, null, 2)}`
        : `根據以下天氣數據，給我一句建議：\n\n${JSON.stringify(weatherData, null, 2)}`;

      const messages = [
        ['system', this.getSystemPrompt(isSleepMode)],
        ['user', userPrompt]
      ];

      const response = await this.llm.invoke(messages);
      const advice = response.content.trim();

      // 快取結果
      this._cacheAdvice(advice, weatherData, isSleepMode);

      console.log(`[AIWeatherAdvisor] Advice generated: "${advice}"`);
      return advice;

    } catch (error) {
      console.error('[AIWeatherAdvisor] Failed to fetch advice:', error);
      return this._getRandomFallback(isSleepMode);
    }
  }

  _getCachedAdvice(weatherData, isSleepMode = false) {
    try {
      // 睡眠模式與一般模式使用不同的快取 key
      const suffix = isSleepMode ? 'Sleep' : '';
      const cachedAdvice = localStorage.getItem(this.cacheKey + suffix);
      const cacheTimestamp = localStorage.getItem(this.cacheTimestampKey + suffix);
      const cachedWeatherData = localStorage.getItem(this.cacheWeatherDataKey + suffix);

      if (!cachedAdvice || !cacheTimestamp || !cachedWeatherData) {
        return null;
      }

      const now = Date.now();
      const timestamp = parseInt(cacheTimestamp);

      if (now - timestamp > this.cacheValidDuration) {
        console.log('[AIWeatherAdvisor] Cache expired');
        return null;
      }

      const oldWeather = JSON.parse(cachedWeatherData);
      if (this._hasSignificantWeatherChange(oldWeather, weatherData)) {
        console.log('[AIWeatherAdvisor] Weather changed, invalidating cache');
        return null;
      }

      return cachedAdvice;

    } catch (error) {
      console.error('[AIWeatherAdvisor] Cache read error:', error);
      return null;
    }
  }

  _cacheAdvice(advice, weatherData, isSleepMode = false) {
    try {
      // 睡眠模式與一般模式使用不同的快取 key
      const suffix = isSleepMode ? 'Sleep' : '';
      localStorage.setItem(this.cacheKey + suffix, advice);
      localStorage.setItem(this.cacheTimestampKey + suffix, Date.now().toString());
      localStorage.setItem(this.cacheWeatherDataKey + suffix, JSON.stringify(weatherData));
    } catch (error) {
      console.error('[AIWeatherAdvisor] Cache write error:', error);
    }
  }

  _hasSignificantWeatherChange(oldWeather, newWeather) {
    // 兼容舊格式（純物件）和新格式（有 current/forecast 結構）
    const oldCurrent = oldWeather.current || oldWeather;
    const newCurrent = newWeather.current || newWeather;

    // 檢查當前天氣變化
    if (Math.abs((oldCurrent.temperature || 0) - (newCurrent.temperature || 0)) > 3) {
      return true;
    }

    if (Math.abs((oldCurrent.rainProbability || 0) - (newCurrent.rainProbability || 0)) > 30) {
      return true;
    }

    const oldWeatherType = this._categorizeWeather(oldCurrent.weather || '');
    const newWeatherType = this._categorizeWeather(newCurrent.weather || '');
    if (oldWeatherType !== newWeatherType) {
      return true;
    }

    if (Math.abs((oldCurrent.feelsLike || 0) - (newCurrent.feelsLike || 0)) > 4) {
      return true;
    }

    // 檢查未來預報趨勢是否翻轉
    if (hasTrendReversal(oldWeather.forecast, newWeather.forecast)) {
      console.log('[AIWeatherAdvisor] Forecast trend changed');
      return true;
    }

    return false;
  }

  _categorizeWeather(weatherText) {
    if (weatherText.includes('雨') || weatherText.includes('雷')) return 'rainy';
    if (weatherText.includes('晴')) return 'sunny';
    if (weatherText.includes('多雲') || weatherText.includes('陰')) return 'cloudy';
    return 'other';
  }

  _getRandomFallback(isSleepMode = false) {
    // 睡眠模式的 fallback 訊息
    if (isSleepMode) {
      const sleepFallbacks = [
        '祝您有個美好的夜晚，晚安。',
        '好好休息，祝您一覺到天亮。',
        '祝您今晚睡個好覺，晚安。',
        '放鬆心情，祝您好夢。'
      ];
      const index = Math.floor(Math.random() * sleepFallbacks.length);
      return sleepFallbacks[index];
    }

    // 一般模式的 fallback 訊息
    const index = Math.floor(Math.random() * this.fallbackMessages.length);
    return this.fallbackMessages[index];
  }

  clearCache() {
    localStorage.removeItem(this.cacheKey);
    localStorage.removeItem(this.cacheTimestampKey);
    localStorage.removeItem(this.cacheWeatherDataKey);
    console.log('[AIWeatherAdvisor] Cache cleared');
  }
}

export default AIWeatherAdvisor;
