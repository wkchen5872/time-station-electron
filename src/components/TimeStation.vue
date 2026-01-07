<template>
  <div 
    :class="[
      'h-screen w-screen overflow-hidden transition-colors duration-500',
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    ]"
  >
    <!-- 主容器：Grid 佈局 (7:3 比例) -->
    <div class="h-full grid grid-cols-10 gap-0">

      <!-- 左側區域 (70%) - 時間與日期 -->
      <div class="col-span-7 flex flex-col justify-center items-center px-12 py-8">
        
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
            isDarkMode ? 'text-gray-200' : 'text-gray-800'
          ]"
        >
          {{ solarDate }}
        </div>

        <!-- 農曆日期 -->
        <div 
          :class="[
            'text-2xl lg:text-3xl',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          ]"
        >
          {{ lunarDate }}
        </div>

        <!-- AI 訊息欄 (預留區塊) -->
        <div 
          v-if="aiMessage"
          :class="[
            'mt-8 px-6 py-3 rounded-lg text-center max-w-xl',
            isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700',
            'border',
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          ]"
        >
          <p class="text-sm leading-relaxed">{{ aiMessage }}</p>
        </div>
      </div>

      <!-- 右側區域 (30%) - 天氣資訊 -->
      <div
        :class="[
          'col-span-3 flex flex-col justify-center px-8 py-8',
          'border-l-2',
          isDarkMode ? 'border-gray-800 bg-gray-850' : 'border-gray-200 bg-white'
        ]"
      >
        <!-- 天氣容器 -->
        <div class="h-full flex flex-col justify-between py-4">

          <!-- 上方主區塊 -->
          <div class="space-y-3 text-center">
            <!-- 地區名稱 -->
            <div
              :class="[
                'text-lg font-medium',
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
                'text-xl',
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              ]"
            >
              {{ weather.condition }}
            </div>

            <!-- 今日高低溫 -->
            <div
              :class="[
                'text-base',
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              ]"
            >
              {{ weather.todayHigh }}° / {{ weather.todayLow }}°
            </div>

            <!-- 體感溫度 -->
            <div
              :class="[
                'text-sm',
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              ]"
            >
              體感 {{ weather.feelsLike }}°
            </div>
          </div>

          <!-- 分隔線 -->
          <div
            :class="[
              'h-px my-4',
              isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
            ]"
          ></div>

          <!-- 中間區塊：小時預報 -->
          <div class="flex-1">
            <div class="grid grid-cols-4 gap-2 text-center">
              <div
                v-for="hour in weather.hourly"
                :key="hour.time"
                class="flex flex-col items-center space-y-1"
              >
                <!-- 時間 -->
                <div
                  :class="[
                    'text-xs',
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  ]"
                >
                  {{ hour.time }}
                </div>
                <!-- 圖示 -->
                <div class="text-2xl">
                  {{ hour.icon }}
                </div>
                <!-- 溫度 -->
                <div
                  :class="[
                    'text-sm font-medium',
                    isDarkMode ? 'text-gray-200' : 'text-gray-800'
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
              'h-px my-4',
              isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
            ]"
          ></div>

          <!-- 下方區塊：未來預報 -->
          <div class="space-y-1">
            <div
              v-for="day in weather.forecast"
              :key="day.day"
              class="flex items-center justify-between"
            >
              <!-- 日期 -->
              <div
                :class="[
                  'text-sm flex-1',
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                ]"
              >
                {{ day.day }}
              </div>
              <!-- 圖示 -->
              <div class="text-xl mx-2">
                {{ day.icon }}
              </div>
              <!-- 溫度範圍 -->
              <div
                :class="[
                  'text-sm',
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
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

export default {
  name: 'TimeStation',
  setup() {
    // 時間相關
    const currentTime = ref('00:00');
    const solarDate = ref('');
    const lunarDate = ref('');
    
    // 日夜模式
    const isDarkMode = ref(false);
    
    // 天氣資料
    const weather = ref({
      city: '台北市',
      district: '',  // 區域/鄉鎮（例如：大安區）
      location: '台北市',  // 完整顯示名稱
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

    // AI 訊息 (Mock Data，預留 API 介接)
    const aiMessage = ref('今日氣溫舒適，適合外出活動。建議穿著輕薄外套。');

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

    // 檢查日夜模式
    const checkDarkMode = (now) => {
      const hour = now.getHours();
      
      // 方法一：根據固定時間 (18:00-6:00)
      const darkModeStart = 18;
      const darkModeEnd = 6;
      isDarkMode.value = hour >= darkModeStart || hour < darkModeEnd;

      // 方法二：根據日出日落時間（需要天氣 API 回傳）
      // const sunrise = parseSunTime(weather.value.sunrise);
      // const sunset = parseSunTime(weather.value.sunset);
      // isDarkMode.value = hour >= sunset || hour < sunrise;
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
        const cityName = weather.value.city || '台北市';

        console.log(`Updating weather for ${cityName}...`);

        // 1. 取得天氣預報（未來 3 天）
        const forecast = await weatherAPI.getWeatherForecast(cityName, 3);

        if (forecast && forecast.forecast.length > 0) {
          // 取得當前時段的天氣
          const current = forecast.forecast[0];

          weather.value.current = parseInt(current.temperature) || 28;
          weather.value.feelsLike = parseInt(current.feelsLike) || 29;
          weather.value.condition = current.weather || '晴時多雲';
          weather.value.humidity = parseInt(current.humidity) || 40;

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

          // 更新小時預報（取接下來 4 個時段）
          weather.value.hourly = forecast.forecast.slice(0, 4).map(slot => {
            const time = new Date(slot.startTime);
            return {
              time: `${time.getHours()}:00`,
              icon: getWeatherIcon(slot.weather),
              temp: parseInt(slot.temperature)
            };
          });

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
            const weathers = tomorrowForecasts.map(f => f.weather);
            weather.value.forecast[0] = {
              day: '明天',
              icon: getWeatherIcon(weathers[0]),
              high: Math.max(...temps),
              low: Math.min(...temps)
            };
          }

          if (dayAfterForecasts.length > 0) {
            const temps = dayAfterForecasts.map(f => parseInt(f.temperature)).filter(t => !isNaN(t));
            const weathers = dayAfterForecasts.map(f => f.weather);
            weather.value.forecast[1] = {
              day: '後天',
              icon: getWeatherIcon(weathers[0]),
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

      } catch (error) {
        console.error('Weather update failed:', error);
        console.log('Using existing weather data');
      }
    };

    // 天氣現象轉換為 Emoji 圖示
    const getWeatherIcon = (weatherText) => {
      if (!weatherText) return '☀️';

      if (weatherText.includes('晴')) return '☀️';
      if (weatherText.includes('多雲')) return '⛅';
      if (weatherText.includes('陰')) return '☁️';
      if (weatherText.includes('雨')) return '🌧️';
      if (weatherText.includes('雷')) return '⛈️';
      if (weatherText.includes('雪')) return '❄️';
      if (weatherText.includes('霧')) return '🌫️';

      return '🌤️'; // 預設
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
          // 沒有快取，使用預設位置（台北市）
          console.log('Using default location: Taipei');
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
      const cityEn = data.city || data.state_prov || 'Taipei';
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

    // AI 訊息更新 (預留)
    const updateAIMessage = async () => {
      try {
        // TODO: 串接 AI API
        // const response = await fetch('AI_API_ENDPOINT');
        // const data = await response.json();
        // aiMessage.value = data.message;
        
        console.log('AI message update available');
      } catch (error) {
        console.error('AI message update failed:', error);
      }
    };

    // 生命週期
    onMounted(async () => {
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
