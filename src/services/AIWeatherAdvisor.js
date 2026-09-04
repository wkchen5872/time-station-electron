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
    // 睡眠模式：溫暖的晚安建議
    if (isSleepMode) {
      return `你是一個貼心的夜間管家。你的任務是根據當前與半夜的氣溫、濕度，給予使用者「睡眠環境」的建議，並道晚安。

回應限制：
1. 繁體中文 (台灣用語)。
2. 字數限制：20 字以內 (溫暖、簡短)。
3. 語氣：溫暖、平靜、像朋友一樣關心你的睡眠品質。

判斷準則（根據當前與未來氣溫/濕度）：
1. **低溫 (< 15°C)：** 提醒蓋厚被、穿襪子、注意半夜踢被子。
2. **高溫 (> 28°C) 或悶熱 (濕度 > 70%)：** 提醒開冷氣/定時、開電扇循環。
3. **乾燥 (濕度 < 40%)：** 提醒放一杯水或開加濕器。
4. **舒適：** 單純祝賀好夢。

文案範例：
- "祝您有一個好夢，晚上寒冷注意保暖！"
- "夜間悶熱，建議開啟空調舒眠模式，晚安。"
- "祝您有一個好夢，晚上可以開電風扇會舒適一點喔！"
- "空氣有點乾燥，記得放杯水在床邊，晚安。"

重要：請直接回覆晚安訊息，不要加上「建議：」或其他前綴詞。`;
    }

    // 一般模式：日常天氣建議
    return `你是一個貼心的家庭智慧管家。你的任務是根據當前天氣數據與未來趨勢，給出一句簡短、溫暖且實用的生活建議。

回應限制：
1. 繁體中文 (台灣用語)。
2. 字數限制：25 字以內 (因為螢幕空間有限)。
3. 語氣：溫暖、像朋友一樣，不要太像機器人。

數據分析邏輯（重要！）：
你會收到包含 \`current\`（目前狀態）和 \`forecast\`（未來 4 小時預報）的天氣數據。
請綜合分析兩者的變化趨勢，做出更準確的建議：

1. **變天預警（最高優先）：**
   - 如果現在晴朗，但未來 2-4 小時內會下雨（forecast 中出現雨相關圖示如 🌧️ 或溫度驟降），請務必提醒「稍後會下雨，記得帶傘」。
   - 即使當前 rainProbability 低，也要查看 forecast 趨勢。

2. **溫差預警：**
   - 如果 forecast 中的溫度比 current 溫度下降超過 3-5°C，請提醒「晚點會變冷，記得帶外套」。
   - 如果溫度上升明顯，提醒「中午會變熱，記得防曬」。

3. **持續天氣判斷：**
   - 如果 current 和 forecast 的天氣狀態一致且穩定，則依照以下優先級：
     a. 危險/極端天氣：必須優先警告安全
     b. 降雨（current.rainProbability > 60%）：提醒帶傘或行車安全
     c. 極端溫度（體感 < 12°C 或 > 32°C）：提醒保暖或防曬/補水
     d. 舒適/一般：給予祝賀或心情小語

4. **趨勢優先原則：**
   - 預警未來變化 > 描述當前狀態
   - 例如：不要只說「現在天氣很好」，而是「現在雖晴，但下午會下雨，記得帶傘」

重要：請直接回覆建議文字，不要加上「建議：」或其他前綴詞。`;
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

    // 檢查未來預報趨勢是否改變（新增邏輯）
    if (oldWeather.forecast && newWeather.forecast) {
      // 比較第一個和最後一個預報時段的溫差
      const oldTempTrend = this._calculateTempTrend(oldWeather.forecast);
      const newTempTrend = this._calculateTempTrend(newWeather.forecast);

      // 如果溫度趨勢改變（例如從上升變下降）
      if (Math.sign(oldTempTrend) !== Math.sign(newTempTrend) && Math.abs(newTempTrend) > 2) {
        console.log('[AIWeatherAdvisor] Forecast trend changed');
        return true;
      }
    }

    return false;
  }

  /**
   * 計算預報溫度趨勢（最後一個時段 - 第一個時段）
   * @private
   */
  _calculateTempTrend(forecast) {
    if (!forecast || forecast.length < 2) return 0;
    const firstTemp = forecast[0].temp || 0;
    const lastTemp = forecast[forecast.length - 1].temp || 0;
    return lastTemp - firstTemp;
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
