import test from 'node:test';
import assert from 'node:assert/strict';

import { getSystemPrompt } from '../src/services/advisorPrompts.mjs';
import { composeSlots } from '../src/services/forecastSlots.mjs';

const at = (iso) => Date.parse(iso);

function series(startIso, spanHours, values) {
  const start = at(startIso);
  const span = spanHours * 3600 * 1000;
  return values.map((value, i) => ({
    value,
    start: start + i * span,
    end: start + (i + 1) * span
  }));
}

test('一般模式提示詞不宣稱固定的四小時或 2-4 小時', () => {
  const prompt = getSystemPrompt(false);
  assert.equal(/未來\s*4\s*小時/.test(prompt), false, '不得宣稱未來 4 小時');
  assert.equal(/2-4\s*小時/.test(prompt), false, '不得預設 2-4 小時出雨');
});

test('一般模式提示詞不再以 emoji 圖示判斷降雨', () => {
  const prompt = getSystemPrompt(false);
  assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(prompt), false, '不得出現 emoji 圖示');
  assert.match(prompt, /rainProbability/);
  assert.match(prompt, /weather/);
});

test('一般模式提示詞要求依每格自己的 interval 解讀', () => {
  const prompt = getSystemPrompt(false);
  assert.match(prompt, /interval/);
  assert.match(prompt, /不要假設固定小時數|長度不固定/);
});

test('睡眠模式提示詞仍存在且與一般模式不同', () => {
  const sleep = getSystemPrompt(true);
  const general = getSystemPrompt(false);
  assert.notEqual(sleep, general);
  assert.match(sleep, /夜間管家/);
});

test('四個三小時格送入時，提示詞的時間語意與 payload 一致', () => {
  const source = {
    temperature: series('2026-11-01T15:00:00+08:00', 3, [28, 25, 22, 20]),
    rainProbability: series('2026-11-01T15:00:00+08:00', 3, [70, 60, 40, 20])
  };
  const slots = composeSlots(source, { now: at('2026-11-01T15:30:00+08:00'), count: 4 });

  // 四格跨度為 12 小時，不是四小時
  const spanHours = (slots[3].end - slots[0].start) / 3600000;
  assert.equal(spanHours, 12);

  const payload = slots.map((slot) => ({
    interval: slot.label,
    temperature: slot.values.temperature,
    rainProbability: slot.values.rainProbability
  }));
  assert.deepEqual(payload.map((p) => p.interval), ['15–18', '18–21', '21–00', '00–03']);

  // 提示詞不得宣稱固定四小時，否則與上述 payload 矛盾
  assert.equal(/未來\s*4\s*小時/.test(getSystemPrompt(false)), false);
});

// 提示區在 480px 左欄扣除 16px 邊距後為 448px；19px 全形字約可容納 23 字／行
const PER_LINE_CAPACITY = Math.floor((480 - 16 * 2) / 19);
// 版位固定兩行高，超出的部分由畫面在第二行末尾截斷
const ADVISORY_LINES = 2;

const limitOf = (sleeping) => {
  const match = getSystemPrompt(sleeping).match(/字數限制：(\d+) 字以內/);
  assert.notEqual(match, null, '提示詞需載明字數限制');
  return Number(match[1]);
};

test('一般模式的字數限制正好是 44，且不超過提示區兩行容量', () => {
  const capacity = PER_LINE_CAPACITY * ADVISORY_LINES;
  // 精確值：只用範圍斷言時，誤改成 45/46 仍會通過
  assert.equal(limitOf(false), 44, '一般模式字數上限必須正好是 44');
  assert.ok(limitOf(false) <= capacity, `不得超過兩行容量 ${capacity}`);
});

test('睡眠模式的字數限制正好是 20，不隨版面放寬', () => {
  // 睡眠模式短是因為語氣要求，不是版面寬度；放寬為兩行不適用於它
  assert.equal(limitOf(true), 20, '睡眠模式字數上限必須正好是 20');
  assert.ok(limitOf(true) <= PER_LINE_CAPACITY, '睡眠模式不得超過單行容量');
  assert.ok(limitOf(true) < limitOf(false), '睡眠模式必須短於一般模式');
});

// 「切換版面不改變提示詞與請求」由 stationIntegration 以真正的 selectVariant 驗證；
// 在此比較同一個函式與其自身不會偵測到任何回歸，故不保留。
