<template>
  <div class="relative h-screen w-screen overflow-hidden">
    <WeatherIconSprite />

    <StationControls
      :variant="display.variant.value"
      :sleep-label="display.sleepLabel.value"
      :sleep-active="display.sleepOverride.value === true"
      :sleep="display.isSleepMode.value"
      @select-variant="display.selectVariant"
      @toggle-sleep="display.toggleSleep"
    />

    <component
      :is="variantComponent"
      :station="station"
      :sleep="display.isSleepMode.value"
    />
  </div>
</template>

<script>
import { computed } from 'vue';

import StationControls from './StationControls.vue';
import WeatherIconSprite from './WeatherIconSprite.vue';
import CodexVariant from './variants/CodexVariant.vue';
import ClaudeVariant from './variants/ClaudeVariant.vue';
import { useStation } from '../composables/useStation.js';

const VARIANT_COMPONENTS = {
  codex: CodexVariant,
  claude: ClaudeVariant
};

export default {
  name: 'TimeStation',
  components: { StationControls, WeatherIconSprite, CodexVariant, ClaudeVariant },
  setup() {
    // 接線集中於 useStation，使其能被整合測試載入
    const { station, display } = useStation();

    const variantComponent = computed(
      () => VARIANT_COMPONENTS[display.variant.value] || CodexVariant
    );

    return { station, display, variantComponent };
  }
};
</script>

<style scoped>
/* 觸控螢幕不需要游標 */
* {
  cursor: none;
}
</style>
