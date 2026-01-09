<template>
  <div
    :class="[
      'h-screen w-screen overflow-hidden transition-colors duration-500 relative',
      isDarkMode ? 'bg-gray-900' : 'bg-gray-200'
    ]"
  >
    <!-- 主題切換按鈕 (開發工具) -->
    <button
      @click="toggleThemeMode"
      :class="[
        'absolute top-4 left-4 z-50',
        'px-4 py-2 rounded-lg',
        'text-sm font-medium',
        'transition-all duration-300',
        'backdrop-blur-sm',
        isDarkMode
          ? 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90 border border-gray-600'
          : 'bg-white/80 text-gray-800 hover:bg-white/95 border border-gray-300',
        'shadow-lg hover:shadow-xl'
      ]"
      :title="`當前模式: ${themeModeDisplay}`"
    >
      {{ themeModeIcon }} {{ themeModeDisplay }}
    </button>

    <!-- 主容器：Grid 佈局 (7:3 比例) -->
    <div class="h-full grid grid-cols-10 gap-0">

      <!-- 左側區域 (70%) - 時間與日期 -->
      <div class="col-span-7 flex flex-col justify-center items-center px-8 py-6">
        
        <!-- 超大時間顯示 -->
        <div 
          :class="[
            'font-bold leading-none tracking-tighter mb-8',
            'text-[140px] lg:text-12xl',
            isDarkMode ? 'text-white' : 'text-gray-900'
          ]"
        >
          {{ currentTime }}
        </div>

        <!-- 國曆日期 -->
        <div
          :class="[
            'text-3xl lg:text-4xl font-medium mb-4',
            isDarkMode ? 'text-white' : 'text-gray-900'
          ]"
        >
          {{ solarDate }}
        </div>

        <!-- 農曆日期 -->
        <div
          :class="[
            'text-2xl lg:text-3xl font-normal',
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          ]"
        >
          {{ lunarDate }}
        </div>

        <!-- AI 訊息欄 (預留區塊) -->
        <div
          v-if="aiMessage"
          :class="[
            'mt-8 px-6 py-3 rounded-lg text-center max-w-xl',
            isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-900',
            'border',
            isDarkMode ? 'border-gray-700' : 'border-gray-300'
          ]"
        >
          <p class="text-xl leading-relaxed">{{ aiMessage }}</p>
        </div>
      </div>

      <!-- 右側區域 (30%) - 天氣資訊 -->
      <div
        :class="[
          'col-span-3 flex flex-col justify-center px-6 py-6',
          'border-l-2',
          isDarkMode ? 'border-gray-800 bg-gray-850' : 'border-gray-300 bg-gray-200'
        ]"
      >
        <!-- 天氣容器 -->
        <div class="h-full flex flex-col justify-between py-3">

          <!-- 上方主區塊 -->
          <div class="space-y-2 text-center">
            <!-- 地區名稱 -->
            <div
              :class="[
                'text-xl font-medium',
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              ]"
            >
              {{ weather.location }}
            </div>

            <!-- 當前溫度 -->
            <div
              :class="[
                'text-7xl font-light tracking-tight',
                isDarkMode ? 'text-white' : 'text-gray-900'
              ]"
            >
              {{ weather.current }}°
            </div>

            <!-- 天氣狀態 -->
            <div
              :class="[
                'text-2xl font-normal',
                isDarkMode ? 'text-gray-200' : 'text-gray-800'
              ]"
            >
              {{ weather.condition }}
            </div>

            <!-- 今日高低溫 / 舒適度（動態切換）-->
            <div
              :class="[
                'text-lg font-normal',
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              ]"
            >
              <!-- 如果最高溫與最低溫相同，顯示舒適度描述；否則顯示溫度範圍 -->
              <template v-if="weather.todayHigh === weather.todayLow">
                {{ weather.comfort }}
              </template>
              <template v-else>
                {{ weather.todayHigh }}° / {{ weather.todayLow }}°
              </template>
            </div>

            <!-- 體感溫度 -->
            <div
              :class="[
                'text-base font-normal',
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              ]"
            >
              體感 {{ weather.feelsLike }}°
            </div>
          </div>

          <!-- 分隔線 -->
          <div
            :class="[
              'h-px my-3',
              isDarkMode ? 'bg-gray-600' : 'bg-gray-400'
            ]"
          ></div>

          <!-- 中間區塊：小時預報 -->
          <div class="flex-1">
            <div class="grid grid-cols-4 gap-1.5 text-center">
              <div
                v-for="hour in weather.hourly"
                :key="hour.time"
                class="flex flex-col items-center space-y-1"
              >
                <!-- 時間 -->
                <div
                  :class="[
                    'text-sm font-normal',
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  ]"
                >
                  {{ hour.time }}
                </div>
                <!-- 圖示 -->
                <div class="text-2xl emoji">
                  {{ hour.icon }}
                </div>
                <!-- 溫度 -->
                <div
                  :class="[
                    'text-base font-medium',
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  ]"
                >
                  {{ hour.temp }}°
                </div>
              </div>
            </div>
          </div>

          <!-- 分隔線 -->
          <div
            :class="[
              'h-px my-3',
              isDarkMode ? 'bg-gray-600' : 'bg-gray-400'
            ]"
          ></div>

          <!-- 下方區塊：未來預報 -->
          <div class="space-y-1.5">
            <div
              v-for="day in weather.forecast"
              :key="day.day"
              class="flex items-center justify-between"
            >
              <!-- 日期 -->
              <div
                :class="[
                  'text-base font-normal flex-1',
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                ]"
              >
                {{ day.day }}
              </div>
              <!-- 圖示 -->
              <div class="text-xl mx-2 emoji">
                {{ day.icon }}
              </div>
              <!-- 溫度範圍 -->
              <div
                :class="[
                  'text-base font-medium',
                  isDarkMode ? 'text-gray-200' : 'text-gray-800'
                ]"
              >
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
import { ref, onMounted, onUnmounted, computed } from 'vue';
import solarLunar from 'solarlunar';
import taiwanRegions from '../data/taiwan-regions.json';
import CWAWeatherAPI from '../services/CWAWeatherAPI.js';
import AIWeatherAdvisor from '../services/AIWeatherAdvisor.js';
import WeatherCodeMapper from '../services/WeatherCodeMapper.js';

export default {
  name: 'TimeStation',
  setup() {
    // 時間相關
    const currentTime = ref('00:00');
    const solarDate = ref('');
    const lunarDate = ref('');

    // 主題模式：'auto' (自動), 'light' (強制淺色), 'dark' (強制深色)
    const themeMode = ref('auto');

    // 日夜模式（自動計算或手動覆蓋）
    const isDarkMode = ref(false);
    
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

    // 更新時間
    const updateTime = () => {
      const now = new Date();
      
      // 時間格式化 (HH:MM)
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      currentTime.value = `${hours}:${minutes}`;

      // 國曆日期
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      const weekday = weekdays[now.getDay()];
      solarDate.value = `${year}年 ${month}月 ${day}日 ${weekday}`;

      // 農曆日期
      const lunar = solarLunar.solar2lunar(year, month, day);
      const ganZhi = lunar.gzYear; // 天干地支年
      const lunarMonth = lunar.monthCn; // 農曆月
      const lunarDay = lunar.dayCn; // 農曆日
      const term = lunar.term || ''; // 節氣（只在節氣當天才有值）

      // 組合農曆日期，有節氣時才顯示
      lunarDate.value = term
        ? `${ganZhi}年 ${lunarMonth} ${lunarDay}  ${term}`
        : `${ganZhi}年 ${lunarMonth} ${lunarDay}`;

      // 更新日夜模式
      checkDarkMode(now);
    };

    // 解析時間字串為分鐘數 (HH:mm -> minutes)
    const parseSunTime = (timeStr) => {
      if (!timeStr) return null;
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // 檢查日夜模式
    const checkDarkMode = (now) => {
      // 如果是手動模式，優先使用手動設定
      if (themeMode.value === 'light') {
        isDarkMode.value = false;
        return;
      }
      if (themeMode.value === 'dark') {
        isDarkMode.value = true;
        return;
      }

      // Auto 模式：根據日出日落時間自動切換
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // 優先使用 API 取得的日出日落時間
      const sunrise = parseSunTime(weather.value.sunrise);
      const sunset = parseSunTime(weather.value.sunset);

      if (sunrise && sunset) {
         // 白天：日出 ~ 日落
         // 晚上：日落 ~ 日出
         isDarkMode.value = currentMinutes < sunrise || currentMinutes >= sunset;
      } else {
        // Fallback: 根據固定時間 (18:00-6:00)
        // 18:00 = 1080 min, 06:00 = 360 min
        const darkModeStart = 18 * 60;
        const darkModeEnd = 6 * 60;
        isDarkMode.value = currentMinutes >= darkModeStart || currentMinutes < darkModeEnd;
      }
    };

    // 主題模式顯示文字
    const themeModeDisplay = computed(() => {
      const modeMap = {
        'auto': 'Auto',
        'light': 'Light',
        'dark': 'Dark'
      };
      return modeMap[themeMode.value] || 'Auto';
    });

    // 主題模式圖示
    const themeModeIcon = computed(() => {
      const iconMap = {
        'auto': '🌗',
        'light': '☀️',
        'dark': '🌙'
      };
      return iconMap[themeMode.value] || '🌗';
    });

    // 切換主題模式 (Auto -> Light -> Dark -> Auto)
    const toggleThemeMode = () => {
      const modes = ['auto', 'light', 'dark'];
      const currentIndex = modes.indexOf(themeMode.value);
      const nextIndex = (currentIndex + 1) % modes.length;
      themeMode.value = modes[nextIndex];

      // 持久化設定
      localStorage.setItem('themeMode', themeMode.value);

      // 立即更新顯示
      checkDarkMode(new Date());

      console.log(`Theme mode changed to: ${themeMode.value}`);
    };

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

    // 英文地名轉繁體中文
    const convertLocationToTW = (cityEn, districtEn) => {
      // 搜尋城市
      const cityData = taiwanRegions.regions.find(region => {
        // 支援多種英文地名格式比對
        const cityEngName = region.cityEngName.toLowerCase();
        const cityEnLower = (cityEn || '').toLowerCase();

        // 完全匹配或包含關鍵字
        return cityEngName === cityEnLower ||
               cityEngName.includes(cityEnLower) ||
               cityEnLower.includes(cityEngName.replace(' city', '').replace(' county', ''));
      });

      if (!cityData) {
        console.log(`City not found in Taiwan regions: ${cityEn}`);
        return { city: cityEn, district: districtEn };
      }

      const result = {
        city: cityData.cityName,
        district: ''
      };

      // 如果有區域資訊，搜尋對應的中文區域名稱
      if (districtEn && cityData.areaList) {
        const areaData = cityData.areaList.find(area => {
          const areaEngName = area.areaEngName.toLowerCase();
          const districtEnLower = districtEn.toLowerCase();

          // 完全匹配或包含關鍵字
          return areaEngName === districtEnLower ||
                 areaEngName.includes(districtEnLower) ||
                 districtEnLower.includes(areaEngName.replace(' dist', '').replace(' township', ''));
        });

        if (areaData) {
          result.district = areaData.areaName;
        } else {
          console.log(`District not found in ${cityData.cityName}: ${districtEn}`);
          result.district = districtEn; // 找不到就保留英文
        }
      }

      console.log(`Location converted: ${cityEn} ${districtEn || ''} → ${result.city} ${result.district || ''}`);
      return result;
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
      const cityEn = data.city || data.state_prov || 'Taipei City';
      const districtEn = data.district || '';

      const converted = convertLocationToTW(cityEn, districtEn);

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
    const updateAIMessage = async () => {
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

        console.log('Fetching AI weather advice with trend analysis...');

        // 取得 AI 建議
        const advice = await aiAdvisor.getAdvice(weatherData);
        aiMessage.value = advice;

        console.log(`AI advice updated: "${advice}"`);

      } catch (error) {
        console.error('AI message update failed:', error);
        // 發生錯誤時，使用 fallback 訊息
        aiMessage.value = '目前無法取得建議，但祝您有個美好的一天！';
      }
    };

    // 生命週期
    onMounted(async () => {
      // 載入持久化的主題模式設定
      const savedThemeMode = localStorage.getItem('themeMode');
      if (savedThemeMode && ['auto', 'light', 'dark'].includes(savedThemeMode)) {
        themeMode.value = savedThemeMode;
        console.log(`Loaded theme mode from localStorage: ${savedThemeMode}`);
      }

      // 立即更新時間
      updateTime();

      // 先取得位置資訊，再更新天氣
      await getLocationByIP();
      updateWeather();

      // 設定定時器
      timeInterval = setInterval(updateTime, 1000); // 每秒更新時間
      weatherInterval = setInterval(updateWeather, 30 * 60 * 1000); // 每 30 分鐘更新天氣
    });

    onUnmounted(() => {
      if (timeInterval) clearInterval(timeInterval);
      if (weatherInterval) clearInterval(weatherInterval);
    });

    return {
      currentTime,
      solarDate,
      lunarDate,
      isDarkMode,
      themeMode,
      themeModeDisplay,
      themeModeIcon,
      toggleThemeMode,
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
</style>
