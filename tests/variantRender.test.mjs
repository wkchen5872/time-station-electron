process.env.TZ = 'Asia/Taipei';

import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { loadSfc } from './helpers/loadSfc.mjs';
import { MISSING_DISPLAY } from '../src/services/dataState.mjs';

const componentsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'components');
const VARIANTS = {
  codex: join(componentsDir, 'variants', 'CodexVariant.vue'),
  claude: join(componentsDir, 'variants', 'ClaudeVariant.vue')
};

const ref = (value) => ({ value });

/** 兩版共用的同一份 fixture */
function fixture({ slotCount = 4, rainProbability = 10 } = {}) {
  const labels = ['15:00', '16:00', '17:00', '18:00'];
  const temps = [28, 27, 26, 25];

  const slots = Array.from({ length: slotCount }, (_, i) => ({
    start: i,
    end: i + 1,
    durationMs: 3600000,
    label: labels[i],
    values: {
      temperature: temps[i],
      weatherCode: '2',
      weather: '晴時多雲',
      rainProbability
    }
  }));

  return {
    time: ref('14:35'),
    solarDate: ref('10月31日 星期六'),
    lunarDate: ref('九月廿二'),
    location: ref({ label: '臺北市 大安區' }),
    current: ref({
      temperature: 28,
      weather: '晴時多雲',
      weatherCode: '2',
      feelsLike: 27,
      comfort: '舒適'
    }),
    today: ref({ high: 30, low: 26 }),
    slots: ref(slots),
    daily: ref([
      { day: '明天', date: '2026-11-02', high: 28, low: 24, weatherCode: '2', rainProbability: 30 },
      { day: '後天', date: '2026-11-03', high: 27, low: 23, weatherCode: '4', rainProbability: 30 }
    ]),
    updatedAtLabel: ref('14:30'),
    advisory: ref({ kind: 'advice', text: '天氣穩定，適合把散步排進今天。' })
  };
}

async function renderVariant(name, station, sleep = false) {
  const { component, cleanup } = await loadSfc(VARIANTS[name]);
  try {
    return await renderToString(
      createSSRApp({ render: () => h(component, { station, sleep }) })
    );
  } finally {
    cleanup();
  }
}

const countOf = (html, needle) => html.split(needle).length - 1;

test('7.3 同一 fixture 下，降雨機率 10% 時 Codex 顯示、Claude 留空', async () => {
  const station = fixture({ rainProbability: 10 });

  const codex = await renderVariant('codex', station);
  const claude = await renderVariant('claude', station);

  assert.ok(codex.includes('10%'), 'Codex 無隱藏門檻，10% 應顯示');
  assert.equal(claude.includes('10%'), false, 'Claude 的 20% 門檻應使 10% 留空');
});

test('7.3 同一 fixture 下，降雨機率達門檻時兩版皆顯示', async () => {
  const station = fixture({ rainProbability: 70 });

  const codex = await renderVariant('codex', station);
  const claude = await renderVariant('claude', station);

  assert.ok(codex.includes('70%'));
  assert.ok(claude.includes('70%'));
});

test('7.3 同一 fixture 下，今日高低溫只有 Claude 顯示', async () => {
  const station = fixture();

  const codex = await renderVariant('codex', station);
  const claude = await renderVariant('claude', station);

  assert.ok(claude.includes('30° / 26°'), 'Claude 應顯示今日高低溫');
  assert.equal(codex.includes('30° / 26°'), false, 'Codex 不顯示今日高低溫列');
});

test('7.3 「目前預報」標示只有 Codex 顯示', async () => {
  const station = fixture();

  const codex = await renderVariant('codex', station);
  const claude = await renderVariant('claude', station);

  assert.ok(codex.includes('目前預報'));
  assert.equal(claude.includes('目前預報'), false);
});

test('7.3 資料更新時間只有 Codex 顯示', async () => {
  const station = fixture();

  const codex = await renderVariant('codex', station);
  const claude = await renderVariant('claude', station);

  assert.ok(codex.includes('14:30 更新'));
  assert.equal(claude.includes('14:30 更新'), false);
});

test('7.3 兩版取用同一份底層資料，溫度一致', async () => {
  const station = fixture();

  const codex = await renderVariant('codex', station);
  const claude = await renderVariant('claude', station);

  for (const temp of ['28°', '27°', '26°', '25°']) {
    assert.ok(codex.includes(temp), `Codex 應含 ${temp}`);
    assert.ok(claude.includes(temp), `Claude 應含 ${temp}`);
  }
});

test('4.4／12.6 不足四格時兩版都補足四個位置', async () => {
  // 每個缺值位置會渲染時間標籤與氣溫兩個缺值符號
  const expected = { 0: 8, 1: 6, 2: 4, 4: 0 };

  for (const [slotCount, missing] of Object.entries(expected)) {
    const station = fixture({ slotCount: Number(slotCount), rainProbability: 70 });

    const codex = await renderVariant('codex', station);
    const claude = await renderVariant('claude', station);

    assert.equal(
      countOf(codex, MISSING_DISPLAY), missing,
      `Codex 於 ${slotCount} 格時應有 ${missing} 個缺值符號`
    );
    assert.equal(
      countOf(claude, MISSING_DISPLAY), missing,
      `Claude 於 ${slotCount} 格時應有 ${missing} 個缺值符號`
    );
  }
});

test('睡眠模式下兩版仍渲染且不提高亮度色', async () => {
  const station = fixture();

  const codexSleep = await renderVariant('codex', station, true);
  const codexAwake = await renderVariant('codex', station, false);

  assert.notEqual(codexSleep, codexAwake, '睡眠樣式應與清醒不同');
  assert.ok(codexSleep.includes('#000000'), '睡眠底色為純黑');
  assert.equal(codexSleep.includes('#F2F4F7'), false, '不應使用清醒的主文字色');
});
