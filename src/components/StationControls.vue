<template>
  <!--
    共用控制項。幾何與配色以 docs/theme/v2/desgin-codex-v4.svg 為準。
    位置、選項順序與尺寸在所有變體中一致，切換變體時控制項本身不改變；
    只有被標示為當前的段落不同。觸控高度 44px。
  -->
  <div class="absolute left-0 top-0 z-50" style="cursor: none">
    <svg width="800" height="92" viewBox="0 0 800 92" class="pointer-events-none absolute inset-0">
      <rect
        x="40" y="24" width="232" height="44" rx="10"
        :fill="c.controlBg" :stroke="c.controlBorder" stroke-width="1.5"
      />
      <rect
        :x="activeSegmentX" y="26" width="112" height="40" rx="8"
        :fill="c.activeSegment"
      />
      <rect
        x="288" y="24" width="152" height="44" rx="10"
        :fill="sleepActive ? c.activeSegment : c.controlBg"
        :stroke="c.controlBorder" stroke-width="1.5"
      />
    </svg>

    <button
      v-for="(option, index) in variants"
      :key="option.id"
      type="button"
      class="absolute top-[24px] h-11 w-[114px] text-base"
      :style="{
        left: `${42 + index * 114}px`,
        color: option.id === variant ? c.activeText : c.inactiveText,
        fontWeight: option.id === variant ? 600 : 400
      }"
      @click="$emit('select-variant', option.id)"
    >
      {{ option.label }}
    </button>

    <button
      type="button"
      class="absolute left-[288px] top-[24px] flex h-11 w-[152px] items-center justify-center gap-2 text-base"
      :style="{ color: sleepActive ? c.activeText : c.inactiveText }"
      @click="$emit('toggle-sleep')"
    >
      <svg
        width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      <span>{{ sleepLabel }}</span>
    </button>
  </div>
</template>

<script>
import { computed } from 'vue';
import { VARIANTS } from '../services/layoutVariant.mjs';

const LABELS = { codex: 'Codex', claude: 'Claude' };

/**
 * 控制項配色。
 *
 * 幾何（x/y/width/height/rx/stroke-width）直接取自 desgin-codex-v4.svg 的 rect 屬性。
 * 該稿的文字已轉為向量輪廓，無法逐一讀回字色，故文字色採其分析紀錄載明的
 * 主文字 #F5F6F8 與次文字 #C2CAD6。
 */
const CONTROL_AWAKE = {
  controlBg: '#171C24',
  controlBorder: '#596474',
  activeSegment: '#303B49',
  activeText: '#F5F6F8',
  inactiveText: '#C2CAD6'
};

const CONTROL_ASLEEP = {
  controlBg: '#0B0E13',
  controlBorder: '#2A3340',
  activeSegment: '#1A2029',
  activeText: '#5A6472',
  inactiveText: '#32383F'
};

export default {
  name: 'StationControls',
  props: {
    variant: { type: String, required: true },
    sleepLabel: { type: String, required: true },
    sleepActive: { type: Boolean, default: false },
    sleep: { type: Boolean, default: false }
  },
  emits: ['select-variant', 'toggle-sleep'],
  setup(props) {
    // 段序固定（Codex 在左、Claude 在右），兩版上線後控制項不因切換而變形
    const variants = VARIANTS.map((id) => ({ id, label: LABELS[id] }));

    const c = computed(() => (props.sleep ? CONTROL_ASLEEP : CONTROL_AWAKE));

    const activeSegmentX = computed(() => {
      const index = variants.findIndex((v) => v.id === props.variant);
      return 42 + Math.max(index, 0) * 114;
    });

    return { variants, c, activeSegmentX };
  }
};
</script>
