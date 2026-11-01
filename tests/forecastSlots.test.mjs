process.env.TZ = 'Asia/Taipei';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  composeSlots,
  entryCovering,
  hasUsableData,
  groupByLocalDate,
  dailyRepresentative,
  seriesForLocalDate,
  coversNow
} from '../src/services/forecastSlots.mjs';
import { formatLocalDate, localDateAfter } from '../src/services/localDate.mjs';

const at = (iso) => Date.parse(iso);

/** 以起始時刻與時距產生區間序列 */
function series(startIso, spanHours, values) {
  const start = at(startIso);
  const span = spanHours * 3600 * 1000;
  return values.map((value, i) => ({
    value,
    start: start + i * span,
    end: start + (i + 1) * span
  }));
}

test('entryCovering 使用半開區間：等於 end 的瞬間歸下一格', () => {
  const s = series('2026-10-31T15:00:00+08:00', 3, [10, 20]);
  assert.equal(entryCovering(s, at('2026-10-31T15:00:00+08:00')).value, 10);
  assert.equal(entryCovering(s, at('2026-10-31T17:59:59+08:00')).value, 10);
  assert.equal(entryCovering(s, at('2026-10-31T18:00:00+08:00')).value, 20);
});

test('全部逐時來源：格即為逐時，標籤為單一小時', () => {
  const slots = composeSlots(
    {
      temperature: series('2026-10-31T15:00:00+08:00', 1, [28, 27, 26, 25, 24]),
      weatherCode: series('2026-10-31T15:00:00+08:00', 1, ['2', '4', '4', '8', '8'])
    },
    { now: at('2026-10-31T15:20:00+08:00'), count: 4 }
  );

  assert.equal(slots.length, 4);
  assert.deepEqual(slots.map((s) => s.label), ['15:00', '16:00', '17:00', '18:00']);
  assert.deepEqual(slots.map((s) => s.values.temperature), [28, 27, 26, 25]);
});

test('全部三小時來源：格為三小時，標籤為起訖', () => {
  const slots = composeSlots(
    {
      temperature: series('2026-10-31T15:00:00+08:00', 3, [28, 25, 22, 20]),
      rainProbability: series('2026-10-31T15:00:00+08:00', 3, [70, 60, 40, 20])
    },
    { now: at('2026-10-31T16:30:00+08:00'), count: 4 }
  );

  assert.deepEqual(slots.map((s) => s.label), ['15–18', '18–21', '21–00', '00–03']);
  assert.deepEqual(slots.map((s) => s.values.rainProbability), [70, 60, 40, 20]);
});

test('混合粒度：逐時溫度搭配三小時降雨，格為三小時且溫度取格起點', () => {
  const slots = composeSlots(
    {
      temperature: series('2026-10-31T15:00:00+08:00', 1, [28, 27, 26, 25, 24, 23, 22]),
      weatherCode: series('2026-10-31T15:00:00+08:00', 1, ['2', '4', '4', '8', '8', '8', '4']),
      rainProbability: series('2026-10-31T15:00:00+08:00', 3, [70, 40])
    },
    { now: at('2026-10-31T15:40:00+08:00'), count: 2 }
  );

  assert.equal(slots.length, 2);
  // 格區間取最粗者（三小時），不得出現逐時格掛三小時機率
  assert.equal(slots[0].durationMs, 3 * 3600 * 1000);
  assert.deepEqual(slots.map((s) => s.label), ['15–18', '18–21']);
  // 粒度細於格者取格起點的值
  assert.deepEqual(slots.map((s) => s.values.temperature), [28, 25]);
  assert.deepEqual(slots.map((s) => s.values.weatherCode), ['2', '8']);
  // 降雨機率歸屬其自身的三小時區間
  assert.deepEqual(slots.map((s) => s.values.rainProbability), [70, 40]);
});

test('粒度不細於格但僅部分重疊者不放入該格', () => {
  const slots = composeSlots(
    {
      temperature: series('2026-10-31T15:00:00+08:00', 1, [28, 27, 26, 25]),
      rainProbability: series('2026-10-31T15:00:00+08:00', 3, [70]),
      // 同為三小時但區間錯開，於 15:00 的涵蓋條目為 [13:00,16:00)，未涵蓋整個 [15:00,18:00)
      humidity: series('2026-10-31T13:00:00+08:00', 3, [80, 85])
    },
    { now: at('2026-10-31T15:10:00+08:00'), count: 1 }
  );

  assert.equal(slots[0].label, '15–18');
  assert.equal(slots[0].values.rainProbability, 70);
  assert.equal(slots[0].values.humidity, null);
});

test('資料不足時只產生可得的格，不捏造', () => {
  const slots = composeSlots(
    { temperature: series('2026-10-31T15:00:00+08:00', 1, [28, 27]) },
    { now: at('2026-10-31T15:30:00+08:00'), count: 4 }
  );
  assert.equal(slots.length, 2);
});

test('coversNow 判定資料是否涵蓋當下時段', () => {
  const s = { temperature: series('2026-10-31T15:00:00+08:00', 1, [28, 27]) };
  assert.equal(coversNow(s, at('2026-10-31T15:30:00+08:00')), true);
  assert.equal(coversNow(s, at('2026-10-31T20:00:00+08:00')), false);
});

test('跨日分組使用本地日期：UTC+8 的 00:00-08:00 不得落到前一天', () => {
  const early = new Date(at('2026-11-01T03:00:00+08:00'));
  // 以 UTC 取日期會得到 10-31；本地日期必須是 11-01
  assert.equal(early.toISOString().split('T')[0], '2026-10-31');
  assert.equal(formatLocalDate(early), '2026-11-01');
  assert.equal(localDateAfter(early, 1), '2026-11-02');

  const temperature = series('2026-11-01T00:00:00+08:00', 1, [18, 17, 16, 16]);
  const grouped = groupByLocalDate(temperature);
  assert.equal(grouped.get('2026-11-01').length, 4);
  assert.equal(grouped.has('2026-10-31'), false);
});

test('seriesForLocalDate 取出指定本地日期的各元素', () => {
  const all = {
    temperature: [
      ...series('2026-11-01T22:00:00+08:00', 1, [19, 18]),
      ...series('2026-11-02T08:00:00+08:00', 1, [20])
    ]
  };
  const day = seriesForLocalDate(all, '2026-11-02');
  assert.equal(day.temperature.length, 1);
  assert.equal(day.temperature[0].value, 20);
});

test('每日代表值取 06:00-18:00 中降雨機率最高的時段', () => {
  const day = {
    // 全日溫度，含夜間
    temperature: series('2026-11-01T00:00:00+08:00', 3, [14, 13, 16, 20, 22, 19, 17, 15]),
    rainProbability: series('2026-11-01T00:00:00+08:00', 3, [10, 10, 20, 80, 30, 10, 0, 0]),
    weatherCode: series('2026-11-01T00:00:00+08:00', 3, ['4', '4', '2', '11', '8', '4', '4', '4']),
    weather: series('2026-11-01T00:00:00+08:00', 3, ['多雲', '多雲', '晴時多雲', '雨', '短暫陣雨', '多雲', '多雲', '多雲'])
  };

  const rep = dailyRepresentative(day);
  // 06:00-18:00 的區間為 index 2,3,4,5 -> 機率 20/80/30/10，最高為 index 3 (09:00-12:00)
  assert.equal(rep.rainProbability, 80);
  assert.equal(rep.weatherCode, '11');
  assert.equal(rep.weather, '雨');
  // 高低溫取全日，不限白天
  assert.equal(rep.high, 22);
  assert.equal(rep.low, 13);
});

test('每日代表值在機率全部相同時取白天第一個時段', () => {
  const day = {
    temperature: series('2026-11-01T06:00:00+08:00', 3, [16, 20, 19, 17]),
    rainProbability: series('2026-11-01T06:00:00+08:00', 3, [10, 10, 10, 10]),
    weatherCode: series('2026-11-01T06:00:00+08:00', 3, ['2', '8', '11', '4']),
    weather: series('2026-11-01T06:00:00+08:00', 3, ['晴時多雲', '短暫陣雨', '雨', '多雲'])
  };
  const rep = dailyRepresentative(day);
  assert.equal(rep.weatherCode, '2');
  assert.equal(rep.rainProbability, 10);
});

test('每日代表值不得只取當日第一個時段（約 00:00）', () => {
  const day = {
    temperature: series('2026-11-01T00:00:00+08:00', 3, [14, 13, 16, 20]),
    rainProbability: series('2026-11-01T00:00:00+08:00', 3, [0, 0, 0, 90]),
    weatherCode: series('2026-11-01T00:00:00+08:00', 3, ['1', '1', '4', '15']),
    weather: series('2026-11-01T00:00:00+08:00', 3, ['晴', '晴', '多雲', '雷陣雨'])
  };
  const rep = dailyRepresentative(day);
  assert.notEqual(rep.weatherCode, '1');
  assert.equal(rep.weatherCode, '15');
});

// --- 來源不供給已開始的時段 -------------------------------------------
//
// CWA 的 F-D0047 系列只回傳尚未開始的時段：2026-11-01 17:15 實測，`天氣現象`
// 首格為 18:00–21:00，涵蓋當下的 15:00–18:00 整格不存在。以下 fixture 依此形狀。

test('entryCovering 維持嚴格包含，不回傳尚未開始的時段', () => {
  const s = series('2026-11-01T18:00:00+08:00', 3, ['多雲']);
  assert.equal(entryCovering(s, at('2026-11-01T17:15:00+08:00')), null);
});

test('無涵蓋時取最近且尚未開始的時段，逐時與三小時皆然', () => {
  const now = at('2026-11-01T17:15:00+08:00');
  const hourlyOnly = { temperature: series('2026-11-01T18:00:00+08:00', 1, [24, 23]) };
  const threeHourOnly = { weather: series('2026-11-01T18:00:00+08:00', 3, ['多雲', '陰']) };

  assert.equal(hasUsableData(hourlyOnly, now), true);
  assert.equal(hasUsableData(threeHourOnly, now), true);
  assert.equal(
    composeSlots(hourlyOnly, { now, count: 1 })[0].values.temperature, 24,
    '取到的是最近一格的值'
  );
});

test('前瞻上限為該筆資料自身的長度', () => {
  const hourly = { temperature: series('2026-11-01T18:00:00+08:00', 1, [24]) };
  const threeHour = { weather: series('2026-11-01T18:00:00+08:00', 3, ['多雲']) };

  // 逐時容忍 1 小時：17:00 差距剛好等於一格長度
  assert.equal(hasUsableData(hourly, at('2026-11-01T17:00:00+08:00')), true);
  assert.equal(
    hasUsableData(hourly, at('2026-11-01T16:59:59+08:00')), false,
    '逐時不得容忍超過 1 小時'
  );

  // 三小時容忍 3 小時
  assert.equal(hasUsableData(threeHour, at('2026-11-01T15:00:00+08:00')), true);
  assert.equal(
    hasUsableData(threeHour, at('2026-11-01T14:59:59+08:00')), false,
    '三小時不得容忍超過 3 小時'
  );
});

test('有涵蓋當下的時段時一律優先採用', () => {
  // 回歸案例：放寬不得改變既有優先序
  const now = at('2026-11-01T17:15:00+08:00');
  const both = {
    weather: [
      ...series('2026-11-01T15:00:00+08:00', 3, ['晴']),
      ...series('2026-11-01T18:00:00+08:00', 3, ['多雲'])
    ]
  };
  assert.equal(composeSlots(both, { now, count: 1 })[0].values.weather, '晴');
});

test('只有未開始時段時仍算有可用資料，太遠則否', () => {
  const now = at('2026-11-01T17:15:00+08:00');
  const near = {
    temperature: series('2026-11-01T18:00:00+08:00', 1, [24]),
    weather: series('2026-11-01T18:00:00+08:00', 3, ['多雲'])
  };
  const far = {
    temperature: series('2026-11-03T18:00:00+08:00', 1, [24]),
    weather: series('2026-11-03T18:00:00+08:00', 3, ['多雲'])
  };

  assert.equal(hasUsableData(near, now), true, '最近一格在容忍範圍內');
  assert.equal(hasUsableData(far, now), false, '只剩遠期資料不算可用');
});

test('只有未開始時段時，四格由最近的一格開始且不虛構已過去的時間', () => {
  const now = at('2026-11-01T17:15:00+08:00');
  const slots = composeSlots({
    temperature: series('2026-11-01T18:00:00+08:00', 3, [24, 23, 22, 21]),
    weather: series('2026-11-01T18:00:00+08:00', 3, ['多雲', '陰', '陰', '多雲'])
  }, { now, count: 4 });

  assert.equal(slots.length, 4);
  assert.equal(slots[0].start, at('2026-11-01T18:00:00+08:00'), '首格起點即來源起點');
  assert.equal(slots[0].values.temperature, 24);
  assert.ok(slots[0].start > now, '不得把已過去的時間算進格內');
});
