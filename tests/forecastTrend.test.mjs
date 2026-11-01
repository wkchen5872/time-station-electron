import test from 'node:test';
import assert from 'node:assert/strict';

import { temperatureTrend, hasTrendReversal } from '../src/services/forecastTrend.mjs';

/** 以 caller 實際送出的欄位名建構 payload */
const slot = (temperature, interval) => ({ interval, temperature });

const rising = [slot(25, '15–18'), slot(27, '18–21'), slot(28, '21–00'), slot(29, '00–03')];
const falling = [slot(25, '15–18'), slot(22, '18–21'), slot(20, '21–00'), slot(18, '00–03')];

test('趨勢以 caller 的 temperature 欄位計算', () => {
  assert.equal(temperatureTrend(rising), 4);
  assert.equal(temperatureTrend(falling), -7);
});

test('舊欄位名 temp 不再被誤用：只有 temp 的 payload 無法判定趨勢', () => {
  const legacy = [{ temp: 25 }, { temp: 29 }];
  assert.equal(temperatureTrend(legacy), null);
});

test('25→29 與 25→18 的趨勢翻轉會使快取失效', () => {
  assert.equal(hasTrendReversal(rising, falling), true);
  assert.equal(hasTrendReversal(falling, rising), true);
});

test('同向趨勢不使快取失效', () => {
  const risingMore = [slot(25, '15–18'), slot(30, '00–03')];
  assert.equal(hasTrendReversal(rising, risingMore), false);
});

test('翻轉但幅度不足時不使快取失效', () => {
  const slightlyFalling = [slot(25, '15–18'), slot(24, '00–03')];
  assert.equal(hasTrendReversal(rising, slightlyFalling), false);
});

test('缺值不得當成 0 參與趨勢計算', () => {
  assert.equal(temperatureTrend([slot(null, 'a'), slot(29, 'b')]), null);
  assert.equal(temperatureTrend([slot(25, 'a'), slot(undefined, 'b')]), null);
  assert.equal(hasTrendReversal(rising, [slot(null, 'a'), slot(null, 'b')]), false);
});

test('真正的 0°C 仍參與計算', () => {
  assert.equal(temperatureTrend([slot(5, 'a'), slot(0, 'b')]), -5);
});

test('資料不足兩格時無法判定', () => {
  assert.equal(temperatureTrend([slot(25, 'a')]), null);
  assert.equal(temperatureTrend([]), null);
  assert.equal(temperatureTrend(null), null);
});
