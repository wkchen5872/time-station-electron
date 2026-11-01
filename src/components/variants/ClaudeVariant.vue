<template>
  <div class="grid h-full grid-cols-5" :style="{ backgroundColor: p.pageBg }">
    <!-- 左欄 480px：農曆併入日期行 -->
    <div class="col-span-3 relative flex flex-col items-center justify-center px-10">
      <div class="font-medium leading-none tracking-tight"
           :style="{ color: p.primary, fontSize: '140px', letterSpacing: '-2px', fontVariantNumeric: 'tabular-nums' }">
        {{ station.time.value }}
      </div>

      <div class="mt-[34px] max-w-full truncate text-[28px]"
           :style="{ color: p.date, letterSpacing: '1.5px' }">
        {{ station.solarDate.value }}
        <span class="text-[19px]" :style="{ color: p.lunar }"> · {{ station.lunarDate.value }}</span>
      </div>

      <div class="absolute bottom-5 left-4 right-4">
        <div class="mb-6 h-[1.5px]" :style="{ backgroundColor: p.divider }"></div>
        <!-- 版位固定兩行高：單行時在其中上下置中，分隔線與其上方元素不隨行數位移 -->
        <div class="flex h-14 items-center justify-center">
          <p class="line-clamp-2 text-center text-[19px] leading-[28px]"
             :style="{ color: advisoryColor }">
            {{ station.advisory.value.text }}
          </p>
        </div>
      </div>
    </div>

    <!-- 右欄 320px -->
    <div class="col-span-2 flex flex-col border-l-2 px-4 py-4"
         :style="{ backgroundColor: p.panelBg, borderColor: p.divider }">
      <div class="truncate text-right text-sm" :style="{ color: p.muted }">{{ locationLabel }}</div>

      <div class="mt-2 flex items-center justify-center gap-3">
        <WeatherIcon :code="station.current.value.weatherCode" :size="52"
                     :style="{ color: p.primary }" />
        <span class="leading-none"
              :style="{ color: p.primary, fontSize: '64px', fontVariantNumeric: 'tabular-nums' }">
          {{ d(station.current.value.temperature, '°') }}
        </span>
      </div>

      <div class="mt-2 truncate text-center text-[22px]" :style="{ color: p.condition }">
        {{ d(station.current.value.weather) }}
      </div>

      <div class="mt-1 text-center text-[19px]" :style="{ color: p.secondary }">
        {{ todayRange }}
      </div>

      <!-- 體感：條件顯示，版位固定保留以免其他區塊位移 -->
      <div class="h-7 text-center text-[17px]" :style="{ color: p.accent }">
        <span v-if="showFeelsLike" class="truncate">
          體感 {{ station.current.value.feelsLike }}°
          <span v-if="comfortLabel">{{ comfortLabel }}</span>
        </span>
      </div>

      <div class="my-2 h-0.5" :style="{ backgroundColor: p.blockDivider }"></div>

      <div class="grid grid-cols-4 gap-1 text-center">
        <div v-for="slot in paddedSlots" :key="slot.key" class="flex flex-col items-center">
          <span class="h-5 w-full truncate text-[15px]" :style="{ color: p.tertiary }">
            {{ slot.placeholder ? missing : slot.label }}
          </span>
          <div class="my-1 flex h-10 items-center">
            <WeatherIcon :code="slot.values.weatherCode" :size="40" :style="{ color: p.primary }" />
          </div>
          <span class="text-[22px]" :style="{ color: p.primary }">
            {{ d(slot.values.temperature, '°') }}
          </span>
          <!-- Claude 專屬門檻：低於 20% 留空，底層值仍為有效值 -->
          <span class="h-6 text-base" :style="{ color: p.accent }">
            {{ showRain(slot.values.rainProbability) ? `${slot.values.rainProbability}%` : '' }}
          </span>
        </div>
      </div>

      <div class="my-2 h-0.5" :style="{ backgroundColor: p.blockDivider }"></div>

      <div class="space-y-3">
        <div v-for="day in station.daily.value" :key="day.date" class="flex items-center">
          <span class="w-12 shrink-0 text-[19px]" :style="{ color: p.secondary }">{{ day.day }}</span>
          <WeatherIcon :code="day.weatherCode" :size="34" class="mx-2 shrink-0"
                       :style="{ color: p.primary }" />
          <span class="w-14 shrink-0 text-base" :style="{ color: p.accent }">
            {{ showRain(day.rainProbability) ? `${day.rainProbability}%` : '' }}
          </span>
          <span class="ml-auto shrink-0 text-[19px]" :style="{ color: p.primary }">
            {{ range(day.low, day.high) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import WeatherIcon from '../WeatherIcon.vue';
import { display, MISSING_DISPLAY, hasValue } from '../../services/dataState.mjs';
import { padSlots } from '../../services/forecastSlots.mjs';
import { shouldShowRain, shouldShowFeelsLike } from '../../services/layoutVariant.mjs';
import { paletteFor } from '../../services/palette.mjs';

export default {
  name: 'ClaudeVariant',
  components: { WeatherIcon },
  props: {
    station: { type: Object, required: true },
    sleep: { type: Boolean, default: false }
  },
  setup(props) {
    const p = computed(() => paletteFor(props.sleep));

    // 資料層只回傳真實格子；呈現層補足四個固定位置，不虛構時間或天氣
    const paddedSlots = computed(() => padSlots(props.station.slots.value, 4));

    const locationLabel = computed(() => props.station.location.value.label || MISSING_DISPLAY);

    const todayRange = computed(() => {
      const { high, low } = props.station.today.value;
      return high === null || low === null ? MISSING_DISPLAY : `${high}° / ${low}°`;
    });

    const showFeelsLike = computed(() =>
      shouldShowFeelsLike('claude', {
        feelsLike: props.station.current.value.feelsLike,
        temperature: props.station.current.value.temperature,
        comfort: props.station.current.value.comfort
      })
    );

    const comfortLabel = computed(() => {
      const comfort = props.station.current.value.comfort;
      return hasValue(comfort) ? String(comfort) : '';
    });

    const advisoryColor = computed(() =>
      props.station.advisory.value.kind === 'anomaly' ? p.value.accent : p.value.advisory
    );

    const d = (value, suffix = '') => display(value, (v) => `${v}${suffix}`);
    const range = (low, high) =>
      low === null || high === null ? MISSING_DISPLAY : `${low}°–${high}°`;
    const showRain = (probability) => shouldShowRain('claude', probability);

    return {
      p, paddedSlots, missing: MISSING_DISPLAY, locationLabel, todayRange, showFeelsLike, comfortLabel,
      advisoryColor, d, range, showRain
    };
  }
};
</script>
