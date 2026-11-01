<template>
  <div class="grid h-full grid-cols-5" :style="{ backgroundColor: p.pageBg }">
    <!-- 左欄 480px：農曆置於時鐘上方 -->
    <div class="col-span-3 relative flex flex-col items-center justify-center px-10">
      <div class="absolute left-10 right-10 top-[104px] truncate text-center text-xl"
           :style="{ color: p.secondary }">
        農曆{{ station.lunarDate.value }}
      </div>

      <div class="font-medium leading-none tracking-tight"
           :style="{ color: p.primary, fontSize: '140px', fontVariantNumeric: 'tabular-nums' }">
        {{ station.time.value }}
      </div>

      <div class="mt-7 max-w-full truncate text-[28px] tracking-wide" :style="{ color: p.date }">
        {{ station.solarDate.value }}
      </div>

      <div class="absolute bottom-5 left-4 right-4">
        <div class="mb-6 h-[1.5px]" :style="{ backgroundColor: p.divider }"></div>
        <!-- 版位固定兩行高：單行時在其中上下置中，分隔線與其上方元素不隨行數位移 -->
        <div class="flex h-14 items-center justify-center">
          <p class="line-clamp-2 text-center text-[19px] font-semibold leading-[28px]"
             :style="{ color: advisoryColor }">
            {{ station.advisory.value.text }}
          </p>
        </div>
      </div>
    </div>

    <!-- 右欄 320px -->
    <div class="col-span-2 flex flex-col border-l-2 px-4 py-5"
         :style="{ backgroundColor: p.panelBg, borderColor: p.divider }">
      <div class="flex items-baseline justify-between">
        <span class="truncate text-base" :style="{ color: p.secondary }">{{ locationLabel }}</span>
        <span class="shrink-0 pl-2 text-xs" :style="{ color: p.muted }">{{ updatedLabel }}</span>
      </div>

      <!--
        現況區為左右兩欄，依 docs/theme/v2/desgin-codex-v4.svg：
        左欄「目前預報」標示與溫度（x≈504-508），右欄圖示與天氣描述上下堆疊
        且彼此左緣對齊（x≈690/696）。圖示不與溫度並排。
      -->
      <div class="mt-2 flex items-start justify-between gap-3">
        <div class="shrink-0">
          <div class="text-sm" :style="{ color: p.tertiary }">目前預報</div>
          <div class="leading-none"
               :style="{ color: p.primary, fontSize: '64px', fontVariantNumeric: 'tabular-nums' }">
            {{ d(station.current.value.temperature, '°') }}
          </div>
        </div>

        <div class="flex min-w-0 flex-col items-start pt-1">
          <WeatherIcon :code="station.current.value.weatherCode" :size="52"
                       :style="{ color: p.primary }" />
          <div class="mt-2 max-w-full truncate text-[22px]" :style="{ color: p.condition }">
            {{ d(station.current.value.weather) }}
          </div>
        </div>
      </div>

      <div class="my-3 h-0.5" :style="{ backgroundColor: p.blockDivider }"></div>

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
          <!-- Codex 無隱藏門檻：有效值一律顯示，含 0% -->
          <span class="h-6 text-base" :style="{ color: p.accent }">
            {{ showRain(slot.values.rainProbability) ? `${slot.values.rainProbability}%` : '' }}
          </span>
        </div>
      </div>

      <div class="my-3 h-0.5" :style="{ backgroundColor: p.blockDivider }"></div>

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
import { display, MISSING_DISPLAY } from '../../services/dataState.mjs';
import { padSlots } from '../../services/forecastSlots.mjs';
import { shouldShowRain } from '../../services/layoutVariant.mjs';
import { paletteFor } from '../../services/palette.mjs';

export default {
  name: 'CodexVariant',
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
    const updatedLabel = computed(() => {
      const label = props.station.updatedAtLabel.value;
      return label ? `${label} 更新` : '';
    });
    const advisoryColor = computed(() =>
      props.station.advisory.value.kind === 'anomaly' ? p.value.accent : p.value.condition
    );

    const d = (value, suffix = '') => display(value, (v) => `${v}${suffix}`);
    const range = (low, high) =>
      low === null || high === null ? MISSING_DISPLAY : `${low}°–${high}°`;
    const showRain = (probability) => shouldShowRain('codex', probability);

    return { p, paddedSlots, missing: MISSING_DISPLAY, locationLabel, updatedLabel, advisoryColor, d, range, showRain };
  }
};
</script>
