import test from 'node:test';
import assert from 'node:assert/strict';

import { startStation } from '../src/services/stationLifecycle.mjs';

function fakeTimers() {
  const created = [];
  let nextId = 1;
  return {
    created,
    intervals: () => created.map((t) => t.ms),
    setTimer(fn, ms) {
      const entry = { id: nextId++, fn, ms, cleared: false };
      created.push(entry);
      return entry.id;
    },
    clearTimer(id) {
      const entry = created.find((t) => t.id === id);
      if (entry) entry.cleared = true;
    },
    fire(ms) {
      for (const entry of created) {
        if (entry.ms === ms && !entry.cleared) entry.fn();
      }
    }
  };
}

const never = () => new Promise(() => {});

test('config 不返回時，主時鐘 interval 仍已建立且持續前進', async () => {
  const timers = fakeTimers();
  let ticks = 0;

  startStation({
    tick: () => { ticks += 1; },
    loadConfig: never,
    resolveLocation: async () => {},
    updateWeather: async () => {},
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer
  });

  await Promise.resolve();
  assert.deepEqual(timers.intervals(), [1000]);

  timers.fire(1000);
  timers.fire(1000);
  assert.equal(ticks, 2);
});

test('天氣與 AI 不返回時，時鐘與排程 interval 都已建立', async () => {
  const timers = fakeTimers();
  let ticks = 0;

  startStation({
    tick: () => { ticks += 1; },
    loadConfig: async () => ({}),
    resolveLocation: async () => {},
    updateWeather: never,
    weatherIntervalMs: 1800000,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer
  });

  // 讓 loadConfig 與 resolveLocation 的 microtask 跑完
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(timers.intervals(), [1000, 1800000]);
  timers.fire(1000);
  assert.equal(ticks, 1);
});

test('正常情況下兩個 interval 皆建立', async () => {
  const timers = fakeTimers();
  const station = startStation({
    tick: () => {},
    loadConfig: async () => ({}),
    resolveLocation: async () => {},
    updateWeather: async () => {},
    weatherIntervalMs: 1800000,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer
  });

  await station.ready;
  assert.deepEqual(timers.intervals(), [1000, 1800000]);
});

test('掛載期間即 dispose 時，不再建立未清理的 timer', async () => {
  const timers = fakeTimers();
  let resolveConfig;
  const station = startStation({
    tick: () => {},
    loadConfig: () => new Promise((resolve) => { resolveConfig = resolve; }),
    resolveLocation: async () => {},
    updateWeather: async () => {},
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer
  });

  station.dispose();
  resolveConfig({});
  await station.ready;

  // 只會有時鐘那一個，且已被清理；之後不再新增天氣排程
  assert.equal(timers.created.length, 1);
  assert.equal(timers.created[0].cleared, true);
});

test('啟動流程拋錯不影響時鐘', async () => {
  const timers = fakeTimers();
  const errors = [];
  const station = startStation({
    tick: () => {},
    loadConfig: async () => { throw new Error('boom'); },
    resolveLocation: async () => {},
    updateWeather: async () => {},
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
    onError: (e) => errors.push(e.message)
  });

  await station.ready;
  assert.deepEqual(timers.intervals(), [1000]);
  assert.deepEqual(errors, ['boom']);
});
