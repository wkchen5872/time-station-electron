import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isWithinSleepWindow,
  resolveSleepState,
  cycleSleepOverride
} from '../src/services/sleepSchedule.mjs';

const base = { override: null, enabled: true, startHour: 23, endHour: 6 };

test('跨午夜的睡眠窗判定', () => {
  assert.equal(isWithinSleepWindow(23, 23, 6), true);
  assert.equal(isWithinSleepWindow(3, 23, 6), true);
  assert.equal(isWithinSleepWindow(6, 23, 6), false);
  assert.equal(isWithinSleepWindow(14, 23, 6), false);
});

test('同日內的睡眠窗判定', () => {
  assert.equal(isWithinSleepWindow(14, 13, 16), true);
  assert.equal(isWithinSleepWindow(16, 13, 16), false);
  assert.equal(isWithinSleepWindow(12, 13, 16), false);
});

test('預設設定 23-6：自動進入與離開', () => {
  assert.equal(resolveSleepState({ ...base, hour: 23 }), true);
  assert.equal(resolveSleepState({ ...base, hour: 5 }), true);
  assert.equal(resolveSleepState({ ...base, hour: 6 }), false);
  assert.equal(resolveSleepState({ ...base, hour: 15 }), false);
});

test('設定為自訂跨夜時段時依設定判定，23／6 不是寫死的常數', () => {
  const custom = { ...base, startHour: 22, endHour: 5 };
  assert.equal(resolveSleepState({ ...custom, hour: 22 }), true);
  assert.equal(resolveSleepState({ ...custom, hour: 4 }), true);
  assert.equal(resolveSleepState({ ...custom, hour: 5 }), false);
  // 預設時段在自訂設定下不再成立
  assert.equal(resolveSleepState({ ...custom, hour: 5 }), false);
});

test('enabled 為 false 時不自動進入睡眠', () => {
  const disabled = { ...base, enabled: false };
  assert.equal(resolveSleepState({ ...disabled, hour: 3 }), false);
  assert.equal(resolveSleepState({ ...disabled, hour: 23 }), false);
});

test('保留既有的 false 強制清醒邏輯', () => {
  assert.equal(resolveSleepState({ ...base, override: false, hour: 3 }), false);
  assert.equal(resolveSleepState({ ...base, override: false, hour: 23 }), false);
  // 即使 enabled 為 true 且落在睡眠窗內
  assert.equal(resolveSleepState({ ...base, override: false, enabled: true, hour: 2 }), false);
});

test('override 為 true 時強制睡眠', () => {
  assert.equal(resolveSleepState({ ...base, override: true, hour: 15 }), true);
  assert.equal(resolveSleepState({ ...base, override: true, enabled: false, hour: 15 }), true);
});

test('按鈕僅循環 Auto 與 On，不經由按鈕到達 Off', () => {
  assert.equal(cycleSleepOverride(null), true);
  assert.equal(cycleSleepOverride(true), null);
  // 既有的 false 狀態不是按鈕循環的一站
  assert.notEqual(cycleSleepOverride(null), false);
  assert.notEqual(cycleSleepOverride(true), false);
});
