process.env.TZ = 'Asia/Taipei';

import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveLongTextMode, LONG_TEXT, LONG_TEXT_MODES } from '../src/services/devFixtures.mjs';
import { memoryStorage } from './helpers/mountStation.mjs';

const devEnv = { DEV: true };
const prodEnv = { DEV: false };

test('正式建置下一律關閉，不影響任何呈現', () => {
  const storage = memoryStorage({ devLongText: 'advice' });
  assert.equal(resolveLongTextMode(prodEnv, storage), null);
  assert.equal(resolveLongTextMode({}, storage), null);
  assert.equal(resolveLongTextMode(undefined, storage), null);
});

test('開發模式下未設定時關閉', () => {
  assert.equal(resolveLongTextMode(devEnv, memoryStorage()), null);
  assert.equal(resolveLongTextMode(devEnv, null), null);
});

test('開發模式下可分別選擇外出提示與異常訊息', () => {
  assert.equal(resolveLongTextMode(devEnv, memoryStorage({ devLongText: 'advice' })), 'advice');
  assert.equal(resolveLongTextMode(devEnv, memoryStorage({ devLongText: 'anomaly' })), 'anomaly');
});

test('未知值回退為外出提示模式', () => {
  assert.equal(resolveLongTextMode(devEnv, memoryStorage({ devLongText: '1' })), 'advice');
  assert.equal(resolveLongTextMode(devEnv, memoryStorage({ devLongText: 'x' })), 'advice');
});

test('測試資料涵蓋任務所列的五種長文字', () => {
  for (const key of ['location', 'weather', 'lunar', 'advice', 'anomaly']) {
    assert.ok(LONG_TEXT[key] && LONG_TEXT[key].length > 0, `缺少 ${key}`);
  }
  assert.deepEqual(LONG_TEXT_MODES, ['advice', 'anomaly']);
});

test('外出提示的測試值不短於 AI 的字數上限', () => {
  // 提示詞限制為 44 字（兩行），截斷驗證至少要用到該長度
  assert.ok(LONG_TEXT.advice.length >= 44, `實際 ${LONG_TEXT.advice.length} 字`);
});

test('地區名的測試值取自實際資料中的最長組合', () => {
  assert.equal(LONG_TEXT.location, '嘉義縣 阿里山鄉');
});

test('異常測試值取自仍會顯示的異常訊息，不含已暫停的過期文案', () => {
  assert.equal(LONG_TEXT.anomaly.includes('超過更新時間'), false);
  assert.ok(LONG_TEXT.anomaly.startsWith('目前無法'), `實際 ${LONG_TEXT.anomaly}`);
});
