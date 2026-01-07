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
      location: '台北市',
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
        // TODO: 實際 API 呼叫
        // const response = await fetch('API_ENDPOINT');
        // const data = await response.json();
        
        // 目前使用 Mock Data
        console.log('Weather updated at:', new Date().toLocaleTimeString());
        
        // 範例：OpenWeatherMap API 整合
        // const apiKey = 'YOUR_API_KEY';
        // const lat = 25.0330;
        // const lon = 121.5654;
        // const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=metric&lang=zh_tw&appid=${apiKey}`;
        // const response = await fetch(url);
        // const data = await response.json();
        // 解析並更新 weather.value
        
      } catch (error) {
        console.error('Weather update failed:', error);
      }
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
    onMounted(() => {
      // 立即更新一次
      updateTime();
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
