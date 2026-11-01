<template>
  <!--
    圖示 sprite：所有 symbol 定義一次，各處以 <use> 引用（design D7）。
    viewBox 保留 2 單位內距，避免雲頂與線帽被裁切。
  -->
  <svg width="0" height="0" aria-hidden="true" style="position: absolute">
    <defs>
      <symbol
        v-for="(icon, id) in icons"
        :id="`ic-${id}`"
        :key="id"
        :viewBox="viewBox"
        fill="none"
        stroke="currentColor"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle
          v-for="(circle, index) in icon.circles || []"
          :key="`c${index}`"
          :cx="circle.cx"
          :cy="circle.cy"
          :r="circle.r"
        />
        <path v-for="(d, index) in icon.paths || []" :key="`p${index}`" :d="d" />
        <g
          v-for="(group, index) in icon.groups || []"
          :key="`g${index}`"
          :transform="group.transform"
          :stroke-width="group.strokeWidth"
        >
          <path v-for="(d, pathIndex) in group.paths" :key="pathIndex" :d="d" />
        </g>
      </symbol>
    </defs>
  </svg>
</template>

<script>
import { ICONS, ICON_VIEWBOX, ICON_STROKE_WIDTH } from '../services/weatherIcons.mjs';

export default {
  name: 'WeatherIconSprite',
  setup() {
    return {
      icons: ICONS,
      viewBox: ICON_VIEWBOX,
      strokeWidth: ICON_STROKE_WIDTH
    };
  }
};
</script>
