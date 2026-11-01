process.env.TZ = 'Asia/Taipei';

import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { loadSfc } from './helpers/loadSfc.mjs';
import { mountStation, flush } from './helpers/mountStation.mjs';
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

// --- 暫停顯示過期提示：兩版共用規則 -------------------------------------

/** 提示區是兩個變體中唯一的 <p>，以元素取樣避免綁定樣式類名 */
function advisoryElement(html) {
  const match = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/);
  assert.ok(match, '提示區應為變體中唯一的 <p> 元素');
  return match[0];
}

/*
 * 一般提示色本就因變體而異：Codex 取 `condition`、Claude 取 `advisory`。
 * 共用的是「異常才換成 accent」這條規則與文案本身，不是同一個色值。
 */
const ROUTINE_COLOR = {
  codex: { awake: '#E3E7EC', asleep: '#3E444C' },
  claude: { awake: '#A8B2BE', asleep: '#343A42' }
};
const ANOMALY_COLOR = { awake: '#F0C879', asleep: '#3A4047' };

/** 與 stationIntegration 同形的來源序列，起點後四小時每小時一格 */
function weatherSeries(startIso) {
  const start = Date.parse(startIso);
  const span = 3600 * 1000;
  const each = (values) => values.map((value, i) => ({
    value,
    start: start + i * span,
    end: start + (i + 1) * span
  }));
  return {
    temperature: each([28, 27, 26, 25]),
    weatherCode: each(['2', '4', '4', '8']),
    weather: each(['晴時多雲', '多雲', '多雲', '短暫陣雨']),
    rainProbability: each([10, 20, 30, 40])
  };
}

async function staleOnlyStation() {
  const app = mountStation({
    config: {
      location: { city: '臺北市', district: '' },
      geolocation: { enabled: false },
      sleepMode: { enabled: true, startHour: 23, endHour: 6 },
      weather: { updateInterval: 1800 }
    },
    series: weatherSeries('2026-11-01T15:00:00+08:00'),
    start: new Date(Date.parse('2026-11-01T15:20:00+08:00')),
    advice: () => '天氣穩定，適合把散步排進今天。'
  });
  await flush();
  // 15:20 成功後推進到 17:00，超過 90 分鐘門檻但資料仍涵蓋當下
  app.advanceTo(new Date(Date.parse('2026-11-01T17:00:00+08:00')));
  await flush();
  return app;
}

test('stale-only 時兩版的提示區都顯示一般提示與一般色', async () => {
  const app = await staleOnlyStation();
  assert.ok(app.station.anomaly.value.all.includes('stale'), '前提：內部仍為過期');

  for (const name of ['codex', 'claude']) {
    const advisory = advisoryElement(await renderVariant(name, app.station));
    assert.ok(advisory.includes('天氣穩定，適合把散步排進今天。'), `${name} 應顯示外出提示`);
    assert.equal(advisory.includes('超過更新時間'), false, `${name} 不得顯示過期提示`);
    assert.ok(advisory.includes(ROUTINE_COLOR[name].awake), `${name} 應使用一般提示色`);
    assert.equal(advisory.includes(ANOMALY_COLOR.awake), false, `${name} 不得使用異常色`);
  }
  app.unmount();
});

test('stale 與定位未知同時成立時，兩版都顯示定位未知與異常色', async () => {
  const app = mountStation({
    config: {
      location: { city: '', district: '' },
      geolocation: { enabled: false },
      sleepMode: { enabled: true, startHour: 23, endHour: 6 },
      weather: { updateInterval: 1800 }
    },
    series: weatherSeries('2026-11-01T15:00:00+08:00'),
    start: new Date(Date.parse('2026-11-01T15:20:00+08:00'))
  });
  await flush();
  app.advanceTo(new Date(Date.parse('2026-11-01T17:00:00+08:00')));
  await flush();
  assert.deepEqual(app.station.anomaly.value.all, ['stale', 'unlocated']);

  for (const name of ['codex', 'claude']) {
    const advisory = advisoryElement(await renderVariant(name, app.station));
    assert.ok(advisory.includes('目前無法確認所在地區。'), `${name} 應顯示定位異常`);
    assert.ok(advisory.includes(ANOMALY_COLOR.awake), `${name} 應使用異常色`);
  }
  app.unmount();
});

test('在兩版之間切換不觸發天氣重抓，也不改寫最後成功時間', async () => {
  const app = await staleOnlyStation();
  const updatedBefore = app.station.updatedAtLabel.value;
  const adviceCallsBefore = app.adviceCalls.length;

  await renderVariant('codex', app.station);
  await renderVariant('claude', app.station);
  await renderVariant('codex', app.station);
  await flush();

  assert.equal(app.station.updatedAtLabel.value, updatedBefore);
  assert.equal(app.adviceCalls.length, adviceCallsBefore);
  assert.ok(app.station.anomaly.value.all.includes('stale'), '內部過期狀態不因切換而清除');
  app.unmount();
});

test('睡眠模式下兩版的提示區沿用睡眠色，不提高亮度', async () => {
  const app = await staleOnlyStation();

  for (const name of ['codex', 'claude']) {
    const advisory = advisoryElement(await renderVariant(name, app.station, true));
    assert.ok(advisory.includes(ROUTINE_COLOR[name].asleep), `${name} 睡眠時應使用睡眠一般提示色`);
    assert.equal(advisory.includes(ROUTINE_COLOR[name].awake), false, `${name} 睡眠時不得使用清醒色`);
  }
  app.unmount();
});

// --- 提示區兩行版位 -----------------------------------------------------

/** 包住提示區段落的固定高度容器；兩版結構相同 */
function advisorySlot(html) {
  const match = html.match(/<div class="([^"]*)"><p\b/);
  assert.ok(match, '提示區段落外應有一層容器');
  return match[1];
}

test('提示區以兩行為界截斷，不再是單行省略', async () => {
  for (const name of ['codex', 'claude']) {
    const advisory = advisoryElement(await renderVariant(name, fixture()));
    assert.ok(advisory.includes('line-clamp-2'), `${name} 應以兩行為界`);
    assert.equal(/\btruncate\b/.test(advisory), false, `${name} 不應再用單行省略`);
  }
});

test('提示區版位高度固定為兩行，且文案上下左右置中', async () => {
  for (const name of ['codex', 'claude']) {
    const html = await renderVariant(name, fixture());
    const slot = advisorySlot(html);
    // 56px = 2 × 28px；行高寫死才能讓容器正好等於兩行
    assert.ok(slot.includes('h-14'), `${name} 版位應固定為 56px`);
    assert.ok(slot.includes('items-center'), `${name} 版位內應上下置中`);
    assert.ok(slot.includes('justify-center'), `${name} 版位內應左右置中`);

    const advisory = advisoryElement(html);
    assert.ok(advisory.includes('leading-[28px]'), `${name} 應使用顯式行高`);
    assert.ok(advisory.includes('text-center'), `${name} 文案應左右置中`);
  }
});

test('單行文案不改變版位高度', async () => {
  const short = fixture();
  short.advisory = { value: { kind: 'advice', text: '天氣穩定。' } };
  const long = fixture();
  long.advisory = {
    value: { kind: 'advice', text: '入夜後轉涼且有短暫陣雨，外出請帶傘並加件外套，回家留意路面濕滑。' }
  };

  for (const name of ['codex', 'claude']) {
    assert.equal(
      advisorySlot(await renderVariant(name, short)),
      advisorySlot(await renderVariant(name, long)),
      `${name} 的版位不得隨行數變動`
    );
  }
});

test('兩版的提示區換行與截斷規則完全相同', async () => {
  const station = fixture();
  station.advisory = {
    value: {
      kind: 'advice',
      text: '清晨北部有局部短暫陣雨，氣溫將由二十六度降至十八度，外出請攜帶雨具並加件外套，返家前留意路面濕滑與強陣風。'
    }
  };

  const codex = advisoryElement(await renderVariant('codex', station));
  const claude = advisoryElement(await renderVariant('claude', station));

  // 兩版只差字重與顏色；換行與截斷相關的規則必須一致
  for (const rule of ['line-clamp-2', 'leading-[28px]', 'text-center', 'text-[19px]']) {
    assert.ok(codex.includes(rule), `codex 缺少 ${rule}`);
    assert.ok(claude.includes(rule), `claude 缺少 ${rule}`);
  }
  assert.equal(
    advisorySlot(await renderVariant('codex', station)),
    advisorySlot(await renderVariant('claude', station)),
    '兩版的版位容器應相同'
  );
});
