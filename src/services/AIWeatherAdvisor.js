/**
 * AI 天氣建議服務 (修正版 - 使用正確的 LangChain 參數)
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

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
          openAIApiKey: this.apiKey,
          modelName: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 1024
        });
      } else if (this.provider === 'gemini') {
        // 修正：使用正確的參數名稱
        console.log('[AIWeatherAdvisor] Initializing Gemini with API Key length:', this.apiKey.length);

        return new ChatGoogleGenerativeAI({
          apiKey: this.apiKey,
          model: 'gemini-2.5-flash',
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

  getSystemPrompt() {
    return `你是一個貼心的家庭智慧管家。你的任務是根據當前的天氣數據，給出一句簡短、溫暖且實用的生活建議。

回應限制：
1. 繁體中文 (台灣用語)。
2. 字數限制：25 字以內 (因為螢幕空間有限)。
3. 語氣：溫暖、像朋友一樣，不要太像機器人。

判斷準則 (優先級由高至低)：
請依照以下順序檢視數據，決定建議的重點：
1. 危險/極端天氣 (如豪大雨、颱風等級強風)：必須優先警告安全。
2. 降雨 (rainProbability > 60% 或 weather 為雨)：提醒帶傘或行車安全。
3. 極端溫度 (體感 < 12°C 或 > 32°C)：提醒保暖或防曬/補水。
4. 溫差 (若當日溫差大)：提醒洋蔥式穿法。
5. 舒適/一般：給予祝賀或心情小語。

重要：請直接回覆建議文字，不要加上「建議：」或其他前綴詞。`;
  }

  async getAdvice(weatherData) {
    try {
      // 檢查快取
      const cachedAdvice = this._getCachedAdvice(weatherData);
      if (cachedAdvice) {
        console.log('[AIWeatherAdvisor] Using cached advice');
        return cachedAdvice;
      }

      // 呼叫 LLM API
      console.log(`[AIWeatherAdvisor] Fetching advice from ${this.provider}...`);

      const messages = [
        ['system', this.getSystemPrompt()],
        ['user', `根據以下天氣數據，給我一句建議：\n\n${JSON.stringify(weatherData, null, 2)}`]
      ];

      const response = await this.llm.invoke(messages);
      const advice = response.content.trim();

      // 快取結果
      this._cacheAdvice(advice, weatherData);

      console.log(`[AIWeatherAdvisor] Advice generated: "${advice}"`);
      return advice;

    } catch (error) {
      console.error('[AIWeatherAdvisor] Failed to fetch advice:', error);
      return this._getRandomFallback();
    }
  }

  _getCachedAdvice(weatherData) {
    try {
      const cachedAdvice = localStorage.getItem(this.cacheKey);
      const cacheTimestamp = localStorage.getItem(this.cacheTimestampKey);
      const cachedWeatherData = localStorage.getItem(this.cacheWeatherDataKey);

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

  _cacheAdvice(advice, weatherData) {
    try {
      localStorage.setItem(this.cacheKey, advice);
      localStorage.setItem(this.cacheTimestampKey, Date.now().toString());
      localStorage.setItem(this.cacheWeatherDataKey, JSON.stringify(weatherData));
    } catch (error) {
      console.error('[AIWeatherAdvisor] Cache write error:', error);
    }
  }

  _hasSignificantWeatherChange(oldWeather, newWeather) {
    if (Math.abs((oldWeather.temperature || 0) - (newWeather.temperature || 0)) > 3) {
      return true;
    }

    if (Math.abs((oldWeather.rainProbability || 0) - (newWeather.rainProbability || 0)) > 30) {
      return true;
    }

    const oldWeatherType = this._categorizeWeather(oldWeather.weather || '');
    const newWeatherType = this._categorizeWeather(newWeather.weather || '');
    if (oldWeatherType !== newWeatherType) {
      return true;
    }

    if (Math.abs((oldWeather.feelsLike || 0) - (newWeather.feelsLike || 0)) > 4) {
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

  _getRandomFallback() {
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
