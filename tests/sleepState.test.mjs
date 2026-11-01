import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';

import { createSleepState } from '../src/services/sleepState.mjs';

test('async 載入 enabled:false 後，無須變動 hour 或 override 即生效', () => {
  const sleepConfig = ref(null); // 設定尚未載入
  const currentHour = ref(23);
  const override = ref(null);

  const isSleepMode = createSleepState({ sleepConfig, currentHour, override });

  // 未載入時以預設 23-6 判定
  assert.equal(isSleepMode.value, true);

  // 設定載入後停用睡眠
  sleepConfig.value = { enabled: false, startHour: 23, endHour: 6 };
  assert.equal(isSleepMode.value, false, 'hour 未變動也必須立即更新');
  assert.equal(currentHour.value, 23, 'hour 不應被測試改動');
  assert.equal(override.value, null, 'override 不應被測試改動');
});

test('async 載入自訂時窗後立即生效', () => {
  const sleepConfig = ref(null);
  const currentHour = ref(21);
  const isSleepMode = createSleepState({ sleepConfig, currentHour, override: ref(null) });

  assert.equal(isSleepMode.value, false);

  sleepConfig.value = { enabled: true, startHour: 20, endHour: 5 };
  assert.equal(isSleepMode.value, true);
});

test('override 仍優先於設定', () => {
  const sleepConfig = ref({ enabled: true, startHour: 23, endHour: 6 });
  const currentHour = ref(2);
  const override = ref(false);

  const isSleepMode = createSleepState({ sleepConfig, currentHour, override });
  assert.equal(isSleepMode.value, false, 'false 強制清醒');

  override.value = true;
  currentHour.value = 14;
  assert.equal(isSleepMode.value, true, 'true 強制睡眠');
});

test('hour 變動仍正常驅動重算', () => {
  const sleepConfig = ref({ enabled: true, startHour: 23, endHour: 6 });
  const currentHour = ref(22);
  const isSleepMode = createSleepState({ sleepConfig, currentHour, override: ref(null) });

  assert.equal(isSleepMode.value, false);
  currentHour.value = 23;
  assert.equal(isSleepMode.value, true);
});
