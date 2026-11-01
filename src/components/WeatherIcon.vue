<template>
  <svg v-if="iconId" :width="size" :height="size" aria-hidden="true">
    <use :href="`#ic-${iconId}`" />
  </svg>
  <span v-else :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true"></span>
</template>

<script>
/*
 * 引用 WeatherIconSprite 定義的 symbol（design D7）。缺值時不渲染任何圖示。
 *
 * 外層 svg 不得再設 viewBox：<use> 的預設 viewport 為 0,0,100%,100%，在有 viewBox 的
 * 外層裡會落在 user space 的 0..28，而 symbol 自身的 -2..26 映射進去等於整體位移 +2，
 * 使底端超出可視範圍（thunder 墨水 25.25 → 27.25 > 26，於 34/40/52px 皆被裁切）。
 * 外層不設 viewBox 時 user unit 即 px，symbol 的 viewBox 直接映射到 size×size，位置正確。
 *
 * 說明放在 script 而非 template：template 內的 HTML 註解會被渲染進輸出。
 */
import { computed } from 'vue';
import { ICONS, codeToIconId } from '../services/weatherIcons.mjs';
import { hasValue } from '../services/value.mjs';

export default {
  name: 'WeatherIcon',
  props: {
    code: { type: [String, Number], default: null },
    size: { type: Number, default: 40 }
  },
  setup(props) {
    const iconId = computed(() => {
      if (!hasValue(props.code)) return null;
      const id = codeToIconId(props.code);
      return ICONS[id] ? id : 'unknown';
    });
    return { iconId };
  }
};
</script>
