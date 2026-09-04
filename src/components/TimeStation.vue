<template>
  <div
    :class="[
      'h-screen w-screen overflow-hidden transition-colors duration-500 relative',
      bgClass
    ]"
  >
    <!-- 開發工具列 -->
    <div class="absolute top-4 left-4 z-50 flex gap-4">
      <!-- 按鈕 A: 顯示模式控制 (Auto -> Light -> Dark) -->
      <button
        @click="toggleDisplayMode"
        :class="[
          'px-4 py-2 rounded-lg',
          'text-sm font-medium',
          'transition-all duration-200',
          'backdrop-blur-sm',
          'cursor-pointer',
          'hover:scale-105 active:scale-95',
          displayModeButtonClass,
          'shadow-lg hover:shadow-xl'
        ]"
        :title="`顯示模式: ${displayModeButtonText}`"
      >
        {{ displayModeButtonIcon }} {{ displayModeButtonText }}
      </button>

      <!-- 按鈕 B: 睡眠模式控制 (Auto -> On -> Off) -->
      <!-- 睡眠模式權限較高，啟動時設為深色背景樣式 -->
      <button
        @click="toggleSleepMode"
        :class="[
          'px-4 py-2 rounded-lg',
          'text-sm font-medium',
          'transition-all duration-200',
          'backdrop-blur-sm',
          'cursor-pointer',
          'hover:scale-105 active:scale-95',
          sleepModeButtonClass,
          'shadow-lg hover:shadow-xl'
        ]"
        :title="`睡眠模式: ${sleepModeButtonText}`"
      >
        {{ sleepModeButtonIcon }} {{ sleepModeButtonText }}
      </button>
    </div>

    <!-- 主容器：Grid 佈局 (7:3 比例) -->
    <div class="h-full grid grid-cols-10 gap-0">

      <!-- 左側區域 (70%) - 時間與日期 -->
      <div class="col-span-7 flex flex-col justify-center items-center px-8 py-6">
        
        <!-- 超大時間顯示 -->
        <div
          :class="[
            'font-bold leading-tight tracking-tight mb-10',
            'text-[140px] lg:text-12xl',
            primaryTextClass
          ]"
        >
          {{ currentTime }}
        </div>

        <!-- 國曆日期 -->
        <div :class="['text-3xl lg:text-4xl font-medium mb-4', primaryTextClass]">
          {{ solarDate }}
        </div>

        <!-- 農曆日期 -->
        <div :class="['text-2xl lg:text-3xl font-normal', secondaryTextClass]">
          {{ lunarDate }}
        </div>

        <!-- AI 訊息欄 -->
        <div
          v-if="aiMessage"
          :class="['mt-8 px-6 py-3 rounded-lg text-center max-w-xl', aiMessageClass]"
        >
          <p class="text-xl leading-relaxed">{{ aiMessage }}</p>
        </div>
      </div>

      <!-- 右側區域 (30%) - 天氣資訊 -->
      <div
        :class="[
          'col-span-3 flex flex-col justify-center px-6 py-6',
          'border-l-2',
          sidebarClass
        ]"
      >
        <!-- 天氣容器 -->
        <div class="h-full flex flex-col justify-between py-3">

          <!-- 上方主區塊 -->
          <div class="space-y-3 text-center">
            <!-- 地區名稱 -->
            <div :class="['text-xl font-medium', secondaryTextClass]">
              {{ weather.location }}
            </div>

            <!-- 當前溫度 -->
            <div :class="['text-7xl font-light tracking-tight', primaryTextClass]">
              {{ weather.current }}°
            </div>

            <!-- 天氣狀態 -->
            <div :class="['text-2xl font-normal', accentTextClass]">
              {{ weather.condition }}
            </div>

            <!-- 今日高低溫 / 舒適度（動態切換）-->
            <div :class="['text-lg font-normal', secondaryTextClass]">
              <template v-if="weather.todayHigh === weather.todayLow">
                {{ weather.comfort }}
              </template>
              <template v-else>
                {{ weather.todayHigh }}° / {{ weather.todayLow }}°
              </template>
            </div>

            <!-- 體感溫度 -->
            <div :class="['text-base font-normal', secondaryTextClass]">
              體感 {{ weather.feelsLike }}°
            </div>
          </div>

          <!-- 分隔線 -->
          <div :class="['h-px my-3', dividerClass]"></div>

          <!-- 中間區塊：小時預報 -->
          <div class="flex-1">
            <div class="grid grid-cols-4 gap-3 text-center">
              <div
                v-for="hour in weather.hourly"
                :key="hour.time"
                class="flex flex-col items-center space-y-1"
              >
                <div :class="['text-sm font-normal', secondaryTextClass]">
                  {{ hour.time }}
                </div>
                <div :class="['text-2xl emoji', isSleepMode ? 'opacity-50 filter-grayscale' : '']">
                  {{ hour.icon }}
                </div>
                <div :class="['text-base font-medium', primaryTextClass]">
                  {{ hour.temp }}°
                </div>
              </div>
            </div>
          </div>

          <!-- 分隔線 -->
          <div :class="['h-px my-3', dividerClass]"></div>

          <!-- 下方區塊：未來預報 -->
          <div class="space-y-2.5">
            <div
              v-for="day in weather.forecast"
              :key="day.day"
              class="flex items-center justify-between"
            >
              <div :class="['text-base font-normal flex-1', secondaryTextClass]">
                {{ day.day }}
              </div>
              <div :class="['text-xl mx-2 emoji', isSleepMode ? 'opacity-50 filter-grayscale' : '']">
                {{ day.icon }}
              </div>
              <div :class="['text-base font-medium', accentTextClass]">
                {{ day.low }}° - {{ day.high }}°
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import solarLunar from 'solarlunar';
import taiwanRegions from '../data/taiwan-regions.json';
import CWAWeatherAPI from '../services/CWAWeatherAPI.js';
import AIWeatherAdvisor from '../services/AIWeatherAdvisor.js';
import WeatherCodeMapper from '../services/WeatherCodeMapper.js';
import ConfigManager from '../services/ConfigManager.js';
import { resolveTaiwanLocation } from '../services/TaiwanLocationResolver.mjs';


// 顯示模式常數
const DisplayMode = {
  LIGHT: 'light',
  DARK: 'dark',
  SLEEP: 'sleep'
};

export default {
  name: 'TimeStation',
  setup() {
    // 時間相關
    const currentTime = ref('00:00');
    const solarDate = ref('');
    const lunarDate = ref('');

    // 顯示模式覆蓋：null (自動) | 'light' | 'dark'
    const displayModeOverride = ref(null);
    // 睡眠模式覆蓋：null (自動) | true (強制開啟) | false (強制關閉)
    const sleepModeOverride = ref(null);

    // 最後一次睡眠訊息的日期 (用於避免重複呼叫 API)
    let lastSleepMessageDate = null;
    
    // 天氣資料
    const weather = ref({
      city: 'Taipei City',
      district: '',  // 區域/鄉鎮（例如：大安區）
      location: 'Taipei City',  // 完整顯示名稱
      latitude: 25.0330,
      longitude: 121.5654,
      current: 28,
      icon: '☀️',
      condition: '晴時多雲偶陣雨',
      humidity: 40,
      todayHigh: 30,
      todayLow: 26,
      feelsLike: 29,
      sunrise: '06:30',
      sunset: '17:30',
      rainProbability: 20,  // 降雨機率 (%)
      windSpeed: '2-3',     // 風速
      comfort: '',      // 舒適度指數
      // 小時預報（接下來 4 小時）
      hourly: [
        { time: '14:00', icon: '☀️', temp: 28 },
        { time: '15:00', icon: '⛅', temp: 27 },
        { time: '16:00', icon: '🌤️', temp: 26 },
        { time: '17:00', icon: '⛅', temp: 25 }
      ],
      // 未來天氣預報
      forecast: [
        { day: '明天', icon: '⛅', high: 28, low: 24 },
        { day: '後天', icon: '🌤️', high: 27, low: 23 }
      ]
    });

    // AI 訊息
    const aiMessage = ref('');

    // AI Advisor 實例（延遲初始化）
    let aiAdvisor = null;

    let timeInterval = null;
    let weatherInterval = null;

    // 用於追蹤時間以更新自動模式
    const currentHour = ref(new Date().getHours());
    const currentMinute = ref(new Date().getMinutes());

    // 解析時間字串為分鐘數 (HH:mm -> minutes)
    function parseSunTime(timeStr) {
      if (!timeStr) return null;
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    }

    // 計算自動是否應該睡眠
    function getAutoSleepState() {
      if (!ConfigManager.get('sleepMode.enabled')) return false;
      const { startHour, endHour } = ConfigManager.get('sleepMode');
      const hour = currentHour.value;
      return (startHour > endHour)
          ? (hour >= startHour || hour < endHour)
          : (hour >= startHour && hour < endHour);
    }

    // 計算自動模式下的顯示主題 (Light/Dark)
    function getAutoThemeMode() {
      const sunrise = parseSunTime(weather.value.sunrise);
      const sunset = parseSunTime(weather.value.sunset);
      const currentMinutes = currentHour.value * 60 + currentMinute.value;

      if (sunrise && sunset) {
        // 日出前或日落後為夜間
        return (currentMinutes < sunrise || currentMinutes >= sunset)
          ? DisplayMode.DARK
          : DisplayMode.LIGHT;
      }

      // Fallback: 18:00-06:00 為 Dark Mode
      return (currentHour.value >= 18 || currentHour.value < 6) ? DisplayMode.DARK : DisplayMode.LIGHT;
    }

    // 是否處於睡眠模式
    const isSleepMode = computed(() => {
      // 1. 強制設定
      if (sleepModeOverride.value === true) return true;
      if (sleepModeOverride.value === false) return false;
      // 2. 自動判斷
      return getAutoSleepState();
    });

    // 當前實際顯示的模式（計算屬性）
    const currentDisplayMode = computed(() => {
      // 1. 睡眠模式優先級最高 (強制全黑 UI)
      if (isSleepMode.value) return DisplayMode.SLEEP;

      // 2. 顯示模式覆蓋
      if (displayModeOverride.value !== null) {
        return displayModeOverride.value;
      }

      // 3. 自動主題
      return getAutoThemeMode();
    });

    // 便利計算屬性：是否為深色模式
    const isDarkMode = computed(() => currentDisplayMode.value === DisplayMode.DARK);

    // --- 按鈕 A: 顯示模式 ---
    const displayModeButtonText = computed(() => {
      if (displayModeOverride.value === null) return 'Theme: Auto';
      return displayModeOverride.value === DisplayMode.LIGHT ? 'Theme: Light' : 'Theme: Dark';
    });

    const displayModeButtonIcon = computed(() => {
      if (displayModeOverride.value === null) return '🌗';
      return displayModeOverride.value === DisplayMode.LIGHT ? '☀️' : '🌙';
    });

    const displayModeButtonClass = computed(() => {
      // 即使在睡眠模式下，此按鈕顯示狀態仍反映其設定，但建議稍微淡化或保持可見
      // 這裡維持與之前類似的邏輯，基於 currentDisplayMode 決定按鈕本身樣式
      // 如果 isSleepMode 為真，所有按鈕背景都會變深，這裡特別處理
      if (isSleepMode.value) {
         return 'bg-gray-900/50 text-gray-500 hover:bg-gray-800/80 border border-gray-800';
      }
      // 非睡眠模式：根據當前顯示是亮或暗決定按鈕樣式
      return currentDisplayMode.value === DisplayMode.DARK
        ? 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 border border-gray-600'
        : 'bg-white/80 text-gray-800 hover:bg-white/95 border border-gray-300';
    });

    // --- 按鈕 B: 睡眠模式 ---
    const sleepModeButtonText = computed(() => {
      if (sleepModeOverride.value === null) return 'Sleep: Auto';
      return sleepModeOverride.value === true ? 'Sleep: ON' : 'Sleep: OFF';
    });

    const sleepModeButtonIcon = computed(() => {
      if (sleepModeOverride.value === null) return '⏰';
      return sleepModeOverride.value === true ? '😴' : '👀';
    });

    const sleepModeButtonClass = computed(() => {
      if (isSleepMode.value) {
        // 睡眠中 (ON or Auto-Sleep)
        return 'bg-indigo-900/80 text-indigo-200 hover:bg-indigo-800/90 border border-indigo-700';
      }
      // 非睡眠 (OFF or Auto-Awake)
      return currentDisplayMode.value === DisplayMode.DARK
        ? 'bg-gray-800/80 text-gray-400 hover:bg-gray-700/90 border border-gray-600'
        : 'bg-white/80 text-gray-500 hover:bg-white/95 border border-gray-300';
    });

    // 根據當前顯示模式返回樣式類別的輔助函數
    function getModeClass(sleepClass, darkClass, lightClass) {
      switch (currentDisplayMode.value) {
        case DisplayMode.SLEEP: return sleepClass;
        case DisplayMode.DARK: return darkClass;
        case DisplayMode.LIGHT:
        default: return lightClass;
      }
    }

    // 常用樣式類別 (計算屬性)
    const bgClass = computed(() => getModeClass('bg-black', 'bg-gray-900', 'bg-gray-200'));
    const primaryTextClass = computed(() => getModeClass('text-gray-600', 'text-white', 'text-gray-900'));
    const secondaryTextClass = computed(() => getModeClass('text-gray-600', 'text-gray-300', 'text-gray-700'));
    const accentTextClass = computed(() => getModeClass('text-gray-600', 'text-gray-200', 'text-gray-800'));
    const dividerClass = computed(() => getModeClass('bg-gray-800', 'bg-gray-600', 'bg-gray-400'));
    const sidebarClass = computed(() => getModeClass('border-gray-900 bg-black', 'border-gray-800 bg-gray-850', 'border-gray-300 bg-gray-200'));
    const aiMessageClass = computed(() => getModeClass(
      'bg-gray-900 text-gray-500 border border-gray-800',
      'bg-gray-800 text-gray-200 border border-gray-700',
      'bg-white text-gray-900 border border-gray-300'
    ));

    // --- 切換功能 ---

    // 切換顯示模式 (Auto -> Light -> Dark)
    function toggleDisplayMode() {
      const modes = [null, DisplayMode.LIGHT, DisplayMode.DARK];
      const currentIndex = modes.indexOf(displayModeOverride.value);
      const nextIndex = (currentIndex + 1) % modes.length;
      displayModeOverride.value = modes[nextIndex];

      // 持久化
      localStorage.setItem('displayModeOverride', JSON.stringify(displayModeOverride.value));
      console.log(`Display mode override set to: ${displayModeOverride.value}`);
    }

    // 切換睡眠模式 (Auto -> On -> Auto)
    // Note: Off (Force Awake) state is temporarily hidden but logic preserved
    function toggleSleepMode() {
      const modes = [null, true]; // Simplified: removed 'false' for better UX
      const currentIndex = modes.indexOf(sleepModeOverride.value);
      const nextIndex = (currentIndex + 1) % modes.length;
      sleepModeOverride.value = modes[nextIndex];

      // 持久化
      localStorage.setItem('sleepModeOverride', JSON.stringify(sleepModeOverride.value));
      console.log(`Sleep mode override set to: ${sleepModeOverride.value}`);
    }

    // 監聽顯示模式變化，更新 AI 訊息
    let previousDisplayMode = null;
    watch(currentDisplayMode, (newMode) => {
      if (previousDisplayMode !== null && previousDisplayMode !== newMode) {
        console.log(`Display mode changed: ${previousDisplayMode} -> ${newMode}`);
        updateAIMessage(true);
      }
      previousDisplayMode = newMode;
    });

    // 更新時間
    function updateTime() {
      const now = new Date();

      // 時間格式化 (HH:MM)
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      currentTime.value = `${hours}:${minutes}`;

      // 更新時間 refs（用於自動模式計算）
      currentHour.value = now.getHours();
      currentMinute.value = now.getMinutes();

      // 國曆日期
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      const weekday = weekdays[now.getDay()];
      solarDate.value = `${year}年 ${month}月 ${day}日 ${weekday}`;

      // 農曆日期
      const lunar = solarLunar.solar2lunar(year, month, day);
      const ganZhi = lunar.gzYear;
      const lunarMonth = lunar.monthCn;
      const lunarDay = lunar.dayCn;
      const term = lunar.term || '';

      lunarDate.value = term
        ? `${ganZhi}年 ${lunarMonth} ${lunarDay}  ${term}`
        : `${ganZhi}年 ${lunarMonth} ${lunarDay}`;
    }

    // 更新天氣資料
    const updateWeather = async () => {
      try {
        const apiKey = import.meta.env.VITE_CWA_API_KEY;

        if (!apiKey || apiKey === 'YOUR_CWA_API_KEY_HERE') {
          console.warn('CWA API Key not configured, using mock data');
          return;
        }

        const weatherAPI = new CWAWeatherAPI(apiKey);
        // 如果 district 存在且包含中文，優先使用 district
        // 解決因 IP 查詢到的 district 為英文導致 CWA API 失敗的問題
        let cityName = weather.value.city || '臺北市';
        if (weather.value.district && /[\u4e00-\u9fa5]/.test(weather.value.district)) {
          cityName = weather.value.district;
        }

        console.log(`Updating weather for ${cityName}...`);

        // 1. 取得天氣預報（未來 3 天）
        const forecast = await weatherAPI.getWeatherForecast(cityName, 3);

        console.log(forecast);

        if (forecast && forecast.forecast.length > 0) {
          // 取得當前時間
          const now = new Date();

          // 找出當前時段：取得最後一個 startTime <= 現在時間的時段
          // 例如：現在 9:36，應該找到 9:00-10:00 這個時段
          let currentIndex = 0;
          for (let i = forecast.forecast.length - 1; i >= 0; i--) {
            const slotTime = new Date(forecast.forecast[i].startTime);
            if (slotTime <= now) {
              currentIndex = i;
              break;
            }
          }

          const current = forecast.forecast[currentIndex];
          console.log(`Current time: ${now.toISOString()}`);
          console.log(`Current slot: ${current.startTime} (index: ${currentIndex})`);

          weather.value.current = parseInt(current.temperature) || 28;
          weather.value.feelsLike = parseInt(current.feelsLike) || 29;
          weather.value.condition = current.weather || '晴時多雲';
          weather.value.humidity = parseInt(current.humidity) || 40;
          weather.value.rainProbability = parseInt(current.rainProbability) || 0;
          weather.value.windSpeed = current.windSpeed || '微風';
          weather.value.comfort = current.comfort || '舒適';

          // 解析今日高低溫（從所有時段中找出今天的最高和最低溫）
          const today = new Date().toISOString().split('T')[0];
          const todayForecasts = forecast.forecast.filter(f =>
            f.startTime.startsWith(today)
          );

          if (todayForecasts.length > 0) {
            const temps = todayForecasts.map(f => parseInt(f.temperature)).filter(t => !isNaN(t));
            weather.value.todayHigh = Math.max(...temps);
            weather.value.todayLow = Math.min(...temps);
          }

          // 更新小時預報（從當前時段開始，取接下來 4 個時段）
          // 例如：現在 9:36，當前時段是 9:00，接下來 4 個時段是 9:00, 10:00, 11:00, 12:00
          const next4Hours = forecast.forecast.slice(currentIndex, currentIndex + 4);
          weather.value.hourly = next4Hours.map(slot => {
            const time = new Date(slot.startTime);
            return {
              time: `${time.getHours()}:00`,
              icon: getWeatherIcon(slot.weatherCode),
              temp: parseInt(slot.temperature),
              weather: slot.weather,
              comfort: slot.comfort,
              rainProbability: slot.rainProbability,
              humidity: slot.humidity,
              windSpeed: slot.windSpeed
            };
          });

          console.log(`Next 4 hours forecast:`, weather.value.hourly.map(h => h.time).join(', '));

          // 更新未來天氣預報（明天、後天）
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];

          const dayAfter = new Date();
          dayAfter.setDate(dayAfter.getDate() + 2);
          const dayAfterStr = dayAfter.toISOString().split('T')[0];

          const tomorrowForecasts = forecast.forecast.filter(f =>
            f.startTime.startsWith(tomorrowStr)
          );
          const dayAfterForecasts = forecast.forecast.filter(f =>
            f.startTime.startsWith(dayAfterStr)
          );

          if (tomorrowForecasts.length > 0) {
            const temps = tomorrowForecasts.map(f => parseInt(f.temperature)).filter(t => !isNaN(t));
            const weather_codes = tomorrowForecasts.map(f => f.weatherCode);
            weather.value.forecast[0] = {
              day: '明天',
              icon: getWeatherIcon(weather_codes[0]),
              high: Math.max(...temps),
              low: Math.min(...temps)
            };
          }

          if (dayAfterForecasts.length > 0) {
            const temps = dayAfterForecasts.map(f => parseInt(f.temperature)).filter(t => !isNaN(t));
            const weather_codes = dayAfterForecasts.map(f => f.weatherCode);
            weather.value.forecast[1] = {
              day: '後天',
              icon: getWeatherIcon(weather_codes[0]),
              high: Math.max(...temps),
              low: Math.min(...temps)
            };
          }

          console.log(`Weather updated: ${weather.value.condition}, ${weather.value.current}°C`);
        }

        // 2. 取得日出日落時間
        const sunData = await weatherAPI.getSunriseSunset(cityName);

        if (sunData && sunData.sunTimes.length > 0) {
          const today = sunData.sunTimes[0];
          weather.value.sunrise = today.sunrise;
          weather.value.sunset = today.sunset;

          console.log(`Sun times: ${today.sunrise} ~ ${today.sunset}`);
        }

        // 3. 更新 AI 建議訊息
        await updateAIMessage();

      } catch (error) {
        console.error('Weather update failed:', error);
        console.log('Using existing weather data');
      }
    };

    // 天氣現象轉換為 Emoji 圖示
    const getWeatherIcon = (weatherCode) => {
      const mapper = new WeatherCodeMapper();
      // const weatherCode = mapper.getCodeByDescription(weatherText);
      return mapper.getIconByCode(weatherCode);
    };

    // 透過 IP 取得位置資訊
    const getLocationByIP = async () => {
      try {
        // 檢查快取（避免頻繁重啟浪費 API 配額）
        const cachedLocation = localStorage.getItem('cachedLocation');
        const cacheTimestamp = localStorage.getItem('cacheTimestamp');
        const now = Date.now();
        const cacheValidDuration = 24 * 60 * 60 * 1000; // 24 小時

        // 如果有有效快取，直接使用
        if (cachedLocation && cacheTimestamp && (now - parseInt(cacheTimestamp) < cacheValidDuration)) {
          const locationData = JSON.parse(cachedLocation);
          console.log('Using cached location (valid for 24h):', locationData);
          updateLocationData(locationData);
          return;
        }

        // 查詢最新 IP 位置
        const apiKey = import.meta.env.VITE_IPGEOLOCATION_API_KEY;
        console.log('Fetching current location by IP...');
        const url = `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('IP Geolocation data:', data);

        // 快取位置資訊（24 小時有效）
        localStorage.setItem('cachedLocation', JSON.stringify(data));
        localStorage.setItem('cacheTimestamp', now.toString());

        // 直接更新位置
        updateLocationData(data);

      } catch (error) {
        console.error('Failed to get location by IP:', error);

        // API 失敗時，嘗試使用快取的位置（即使過期也用）
        const cachedLocation = localStorage.getItem('cachedLocation');
        if (cachedLocation) {
          console.log('Using cached location due to API error (may be expired)');
          const locationData = JSON.parse(cachedLocation);
          updateLocationData(locationData);
        } else {
          // 沒有快取，使用預設位置（臺北市）
          console.log('Using default location: Taipei City');
        }
      }
    };

    // 更新位置資料到 weather 物件
    const updateLocationData = (data) => {
      // ipgeolocation.io 返回的欄位：
      // city: 城市
      // district: 區域/鄉鎮
      // state_prov: 州/省
      // country_name: 國家
      // latitude, longitude: 經緯度

      // 將英文地名轉換為繁體中文
      const converted = resolveTaiwanLocation(taiwanRegions.regions, {
        city: data.city,
        district: data.district,
        state: data.state_prov
      });

      weather.value.city = converted.city;
      weather.value.district = converted.district;
      weather.value.latitude = parseFloat(data.latitude) || 25.0330;
      weather.value.longitude = parseFloat(data.longitude) || 121.5654;

      // 組合顯示名稱：如果有 district，顯示「城市 區域」，否則只顯示城市
      if (weather.value.district) {
        weather.value.location = `${weather.value.city} ${weather.value.district}`;
      } else {
        weather.value.location = weather.value.city;
      }

      console.log(`Location updated: ${weather.value.location} (${weather.value.latitude}, ${weather.value.longitude})`);
    };

    // AI 訊息更新
    const updateAIMessage = async (forceUpdate = false) => {
      try {
        // 初始化 AI Advisor（只需初始化一次）
        if (!aiAdvisor) {
          const provider = import.meta.env.VITE_AI_PROVIDER || 'gemini';
          let apiKey;

          if (provider === 'openai') {
            apiKey = import.meta.env.VITE_OPENAI_API_KEY;
          } else {
            apiKey = import.meta.env.VITE_GEMINI_API_KEY;
          }

          // 檢查 API Key 是否已設定
          if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '' || apiKey.includes('YOUR_') || apiKey.includes('_KEY_HERE')) {
            console.warn(`${provider.toUpperCase()} API Key not configured, skipping AI advice`);
            console.warn(`Please set VITE_${provider.toUpperCase()}_API_KEY in your .env file`);
            aiMessage.value = ''; // 清空 AI 訊息
            return;
          }

          console.log(`Initializing AI Weather Advisor with ${provider}...`);
          aiAdvisor = new AIWeatherAdvisor(provider, apiKey);
        }

        // === 睡眠模式更新頻率優化 ===
        if (isSleepMode.value && !forceUpdate) {
          const today = new Date().toISOString().split('T')[0];

          // 如果今晚已經說過晚安，且不是強制更新，則跳過
          if (lastSleepMessageDate === today) {
            console.log('[Sleep Mode] Already greeted tonight, skipping update');
            return;
          }

          // 更新日期記錄
          lastSleepMessageDate = today;
          console.log('[Sleep Mode] First greeting of the night');
        }

        // === 喚醒時必須強制更新 ===
        // 如果從睡眠模式切換到喚醒模式，必須立即更新訊息
        // (這個邏輯已經在 updateTime 中的 sleepModeChanged 處理)

        // 準備天氣資料（包含當前 + 未來 4 小時趨勢）
        const weatherData = {
          // 當前狀態
          current: {
            temperature: weather.value.current,
            weather: weather.value.condition,
            feelsLike: weather.value.feelsLike,
            rainProbability: weather.value.rainProbability,
            humidity: weather.value.humidity,
            windSpeed: weather.value.windSpeed,
            comfort: weather.value.comfort
          },
          // 未來 4 小時預報（用於趨勢分析）
          forecast: weather.value.hourly.map(hour => ({
            time: hour.time,
            temperature: hour.temp,
            weather: hour.weather,
            comfort: hour.comfort,
            rainProbability: hour.rainProbability,
            humidity: hour.humidity,
            windSpeed: hour.windSpeed
            // 如果有更詳細的資料，可以從原始 forecast 取得
          }))
        };

        console.log(`Fetching AI weather advice (Sleep Mode: ${isSleepMode.value})...`);

        // 取得 AI 建議（傳遞睡眠模式狀態）
        const advice = await aiAdvisor.getAdvice(weatherData, isSleepMode.value);
        aiMessage.value = advice;

        console.log(`AI advice updated: "${advice}"`);

      } catch (error) {
        console.error('AI message update failed:', error);
        // 發生錯誤時，使用 fallback 訊息
        if (isSleepMode.value) {
          aiMessage.value = '祝您有個美好的夜晚，晚安。';
        } else {
          aiMessage.value = '目前無法取得建議，但祝您有個美好的一天！';
        }
      }
    };

    // 生命週期
    onMounted(async () => {
      const config = await ConfigManager.loadConfig();

      // 載入持久化的顯示模式設定
      // 載入持久化的顯示模式設定
      const savedDisplay = localStorage.getItem('displayModeOverride');
      if (savedDisplay !== null) {
        try {
          const parsed = JSON.parse(savedDisplay);
          if (parsed === null || [DisplayMode.LIGHT, DisplayMode.DARK].includes(parsed)) {
            displayModeOverride.value = parsed;
          }
        } catch (e) { console.warn('Failed to parse displayModeOverride', e); }
      }

      // 載入持久化的睡眠模式設定
      const savedSleep = localStorage.getItem('sleepModeOverride');
      if (savedSleep !== null) {
        try {
          const parsed = JSON.parse(savedSleep);
          if (parsed === null || typeof parsed === 'boolean') {
             sleepModeOverride.value = parsed;
          }
        } catch (e) { console.warn('Failed to parse sleepModeOverride', e); }
      }

      // 立即更新時間
      updateTime();

      // 初始化 previousDisplayMode 追蹤
      previousDisplayMode = currentDisplayMode.value;

      // 先套用固定位置；啟用 IP 定位時再以定位結果覆寫
      updateLocationData(config.location);
      if (config.geolocation.enabled) {
        await getLocationByIP();
      }
      updateWeather();

      // 設定定時器
      timeInterval = setInterval(updateTime, 1000);
      weatherInterval = setInterval(updateWeather, 30 * 60 * 1000);
    });

    onUnmounted(() => {
      if (timeInterval) clearInterval(timeInterval);
      if (weatherInterval) clearInterval(weatherInterval);
    });

    return {
      // 時間與日期
      currentTime,
      solarDate,
      lunarDate,
      // 顯示模式
      isSleepMode,
      toggleDisplayMode,
      toggleSleepMode,
      // 按鈕 A: 顯示模式
      displayModeButtonText,
      displayModeButtonIcon,
      displayModeButtonClass,
      // 按鈕 B: 睡眠模式
      sleepModeButtonText,
      sleepModeButtonIcon,
      sleepModeButtonClass,
      // 樣式類別
      bgClass,
      primaryTextClass,
      secondaryTextClass,
      accentTextClass,
      dividerClass,
      sidebarClass,
      aiMessageClass,
      // 天氣與 AI
      weather,
      aiMessage
    };
  }
};
</script>

<style scoped>
/* 隱藏游標（觸控螢幕用） */
* {
  cursor: none;
}

/* 確保字體平滑渲染 */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 自訂深色背景色 */
.bg-gray-850 {
  background-color: #1f2937;
}

/* 睡眠模式：灰階濾鏡 */
.filter-grayscale {
  filter: grayscale(100%) brightness(50%);
}
</style>
