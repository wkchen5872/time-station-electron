process.env.TZ = 'Asia/Taipei';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  composeSlots,
  entryCovering,
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
