import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import solarLunar from 'solarlunar';

import taiwanRegions from '../data/taiwan-regions.json' with { type: 'json' };
import CWAWeatherAPI from '../services/CWAWeatherAPI.js';
import AIWeatherAdvisor from '../services/AIWeatherAdvisor.js';
import ConfigManager from '../services/ConfigManager.js';
import { resolveTaiwanLocation, isSameCity } from '../services/TaiwanLocationResolver.mjs';
import { formatLocalDate, localDateAfter } from '../services/localDate.mjs';
import {
  composeSlots,
  entryCovering,
  seriesForLocalDate,
  dailyRepresentative,
  hasUsableData,
  SERIES_KEYS
} from '../services/forecastSlots.mjs';
import {
  ANOMALY,
  isSuccessfulUpdate,
  resolveAnomaly
} from '../services/dataState.mjs';
import { defaultConfig } from '../defaultConfig.js';
import { toFiniteNumber } from '../services/value.mjs';
import { resolveLocationSource } from '../services/locationSource.mjs';
import { resolveLongTextMode, LONG_TEXT } from '../services/devFixtures.mjs';
import { startStation } from '../services/stationLifecycle.mjs';

/** Vite 會靜態替換 import.meta.env；Node 下為 undefined，故收斂為單一來源 */
const BUILD_ENV = import.meta.env ?? {};

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const SLOT_COUNT = 4;

const ANOMALY_TEXT = {
  [ANOMALY.NEVER]: '目前無法取得天氣資料。',
  [ANOMALY.UNLOCATED]: '目前無法確認所在地區。'
};

/**
 * 會在提示區露出的異常，依優先序排列
 *
 * `ANOMALY.STALE` 不在此列：過期狀態仍照常判定並保留在 `anomaly`，只是暫時不佔用
 * 提示區。此處必須掃過全部異常而非只看最高優先的那一個，否則過期會連帶遮掉同時
 * 成立的定位未知。
 *
 * 恢復過期提示是獨立決策，且不是只把 `ANOMALY.STALE` 加回本陣列就好：stale 的文案
 * 已一併從 `ANOMALY_TEXT` 移除，只加回陣列會讓提示區顯示 undefined。恢復時必須同時
 * 補回文案、本陣列的項目與其優先序，並更新對應規格。
 */
const VISIBLE_ANOMALIES = [ANOMALY.NEVER, ANOMALY.UNLOCATED];

function emptySeries() {
  return SERIES_KEYS.reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});
}

/**
 * 時間、農曆、定位與天氣資料
 *
 * 不再擷取日出日落——其唯一消費者是已移除的自動日夜切換。
 * 畫面上的「目前」數值取自預報時段，並非觀測站實測值。
 */
export function useWeatherStation(deps = {}) {
  const {
    env = BUILD_ENV,
    configManager = ConfigManager,
    createWeatherApi = (apiKey) => new CWAWeatherAPI(apiKey),
    // 第三參數照原樣傳遞：undefined 時由服務的預設參數退回集中來源，
    // 0 等有效值不得在此被攔截
    createAdvisor = (provider, apiKey, adviceCacheMs) =>
      new AIWeatherAdvisor(provider, apiKey, adviceCacheMs),
    storage = typeof localStorage !== 'undefined' ? localStorage : null,
    timers = { setInterval, clearInterval },
    clock = () => new Date()
  } = deps;

  const now = ref(clock());
  const currentHour = computed(() => now.value.getHours());

  const config = ref(null);
  const locationState = ref({ city: '', district: '', label: '', known: false });
  const series = ref(emptySeries());
  const lastSuccessAt = ref(null);
  const everSucceeded = ref(false);
  // 最近一次回應是否涵蓋當下且帶值；僅靠時間門檻會漏掉 no-cover 的情況
  const latestResponseUsable = ref(true);
  const advice = ref('');

  // 睡眠狀態由外部注入（useDisplayMode 需要本 composable 的 currentHour，避免循環）
  const sleepState = ref(null);
  const isSleeping = () => Boolean(sleepState.value && sleepState.value.value);

  let aiAdvisor = null;
  let lastSleepGreetingDate = null;
  let adviceSequence = 0;
  let station = null;

  // ---- 時間與日期 -------------------------------------------------------

  const time = computed(() => {
    const h = String(now.value.getHours()).padStart(2, '0');
    const m = String(now.value.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  });

  const solarDate = computed(() => {
    const d = now.value;
    return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}`;
  });

  const lunarDate = computed(() => {
    const d = now.value;
    const lunar = solarLunar.solar2lunar(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const base = `${lunar.monthCn}${lunar.dayCn}`;
    const actual = lunar.term ? `${base} ${lunar.term}` : base;
    return longTextMode.value ? LONG_TEXT.lunar : actual;
  });

  // ---- 天氣 -------------------------------------------------------------

  const sleepConfig = computed(() => (config.value && config.value.sleepMode) || null);

  // `??` 而非 `||`：0 為合法值，表示資料立即過期
  const staleThresholdMs = computed(() =>
    config.value?.weather?.staleThresholdMs ?? defaultConfig.weather.staleThresholdMs
  );

  /** 現有資料是否仍涵蓋當下時段 */
  const coverageActive = computed(() => hasUsableData(series.value, now.value.getTime()));

  const anomaly = computed(() =>
    resolveAnomaly({
      everSucceeded: everSucceeded.value,
      lastSuccessAt: lastSuccessAt.value,
      now: now.value.getTime(),
      locationKnown: locationState.value.known,
      staleThresholdMs: staleThresholdMs.value,
      latestResponseUsable: latestResponseUsable.value,
      coverageActive: coverageActive.value
    })
  );

  // ---- 由資料推導的呈現值 ------------------------------------------------

  function deriveCurrent() {
    const at = now.value.getTime();
    const pick = (key) => {
      const entry = entryCovering(series.value[key], at);
      return entry ? entry.value : null;
    };
    return {
      temperature: toFiniteNumber(pick('temperature')),
      feelsLike: toFiniteNumber(pick('feelsLike')),
      weather: pick('weather'),
      weatherCode: pick('weatherCode'),
      comfort: pick('comfort'),
      humidity: toFiniteNumber(pick('humidity'))
    };
  }

  function deriveToday() {
    const rep = dailyRepresentative(seriesForLocalDate(series.value, formatLocalDate(now.value)));
    return { high: rep.high, low: rep.low };
  }

  function deriveDaily() {
    return [
      { day: '明天', date: localDateAfter(now.value, 1) },
      { day: '後天', date: localDateAfter(now.value, 2) }
    ].map(({ day, date }) => ({
      day,
      date,
      ...dailyRepresentative(seriesForLocalDate(series.value, date))
    }));
  }

  const live = computed(() => ({
    current: deriveCurrent(),
    today: deriveToday(),
    slots: composeSlots(series.value, { now: now.value.getTime(), count: SLOT_COUNT }),
    daily: deriveDaily()
  }));

  /**
   * 最後一組有效呈現值。
   * 資料的涵蓋範圍耗盡後，畫面仍需顯示最後已知值並以提示區說明過期，
   * 而不是整塊清空；但也不把舊值冒充成新時段的資料。
   */
  const lastKnown = ref(null);

  watch(
    () => (coverageActive.value ? live.value : null),
    (snapshot) => {
      if (snapshot) lastKnown.value = { ...snapshot, capturedAt: now.value.getTime() };
    },
    { immediate: true }
  );

  const view = computed(() => {
    if (coverageActive.value) return live.value;
    if (lastKnown.value) return lastKnown.value;
    return live.value;
  });

  // 現況與時間格保留最後已知值，讓過期狀態仍有內容可看
  /**
   * 開發模式的長文字測試資料
   *
   * 文字截斷需要以最長字串驗證，但各欄位的最長值不會自然同時出現。
   * 僅在開發模式生效；正式建置下 `resolveLongTextMode()` 一律回傳 null。
   */
  const longTextMode = computed(() => resolveLongTextMode(env, storage));

  const location = computed(() =>
    (longTextMode.value
      ? { ...locationState.value, label: LONG_TEXT.location }
      : locationState.value)
  );

  const current = computed(() =>
    (longTextMode.value
      ? { ...view.value.current, weather: LONG_TEXT.weather }
      : view.value.current)
  );
  const slots = computed(() => view.value.slots);

  // 每日值一律依「現在的本地日期」從保留的 series 取對應日。
  // 若沿用快照，跨日之後舊日期的資料會被重新叫成明天／後天。
  const today = computed(() => deriveToday());
  const daily = computed(() => deriveDaily());

  const updatedAtLabel = computed(() => {
    if (lastSuccessAt.value === null) return null;
    const d = new Date(lastSuccessAt.value);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  /** 提示區：有可見異常時改顯示異常訊息，解除後恢復外出提示 */
  const advisory = computed(() => {
    if (longTextMode.value) {
      return longTextMode.value === 'anomaly'
        ? { kind: 'anomaly', text: LONG_TEXT.anomaly }
        : { kind: 'advice', text: LONG_TEXT.advice };
    }
    const visible = VISIBLE_ANOMALIES.find((kind) => anomaly.value.all.includes(kind));
    if (visible) {
      return { kind: 'anomaly', text: ANOMALY_TEXT[visible] };
    }
    return { kind: 'advice', text: advice.value || '祝您有個美好的一天。' };
  });

  // ---- 取得資料 ---------------------------------------------------------

  function applyLocation(data) {
    const converted = resolveTaiwanLocation(taiwanRegions.regions, {
      city: data.city,
      district: data.district,
      state: data.state_prov
    });
    const label = converted.district
      ? `${converted.city} ${converted.district}`
      : converted.city;
    locationState.value = {
      city: converted.city,
      district: converted.district,
      label,
      known: Boolean(converted.city)
    };
  }

  function readCachedLocation() {
    try {
      if (!storage) return { cached: null, cachedAt: null };
      const raw = storage.getItem('cachedLocation');
      const at = storage.getItem('cacheTimestamp');
      return {
        cached: raw ? JSON.parse(raw) : null,
        cachedAt: at ? parseInt(at, 10) : null
      };
    } catch (error) {
      console.warn('Cached location is unusable', error);
      return { cached: null, cachedAt: null };
    }
  }

  async function fetchLiveLocation() {
    try {
      const apiKey = env.VITE_IPGEOLOCATION_API_KEY;
      const response = await fetch(`https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}`);
      if (!response.ok) throw new Error(`API request failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to resolve location by IP:', error);
      return null;
    }
  }

  /**
   * 設定位置的逐欄 fallback。
   *
   * 整個物件退回集中來源是不夠的：只提供 district 的設定會得到沒有 city 的物件，
   * locationSource 便判為「無設定位置」。顯式的空字串是選擇而非缺值，故用 `??`。
   *
   * city 與 district 不是獨立欄位——district 只在它所屬的城市下有意義。因此
   * **預設區名只在有效 city 與集中來源同城時才繼承**，否則回空字串。
   * 顯式提供的 district 不受此限制。
   *
   * 不能靠 `resolveTaiwanLocation` 擋下跨城市組合：它只檢查區名是否存在於該城市的
   * areaList，而「中正區」同時存在於臺北市與基隆市，實測
   * `{city:'基隆市', district:'中正區'}` 會原樣保留。只有區名在新城市不存在時
   * （例如臺北獨有的內湖區配臺中市）才會被它清掉。
   *
   * 同城判斷用 `isSameCity`，它沿用 TaiwanLocationResolver 既有的名稱比對，
   * 中文（台／臺）與英文別名（Taipei／Taipei City）都認得；正規化規則不在此重寫一份。
   *
   * 本函式只影響 `configured` 這個來源，不碰 live IP 與快取定位的結果，
   * 也不改變 locationSource 的來源優先序。
   */
  function resolveConfiguredLocation(configured) {
    const city = configured?.city ?? defaultConfig.location.city;
    const inheritsDistrict = isSameCity(
      taiwanRegions.regions, city, defaultConfig.location.city
    );
    return {
      city,
      district: configured?.district
        ?? (inheritsDistrict ? defaultConfig.location.district : '')
    };
  }

  async function resolveLocation(loadedConfig) {
    // 兩者皆 `??`。
    // cacheDuration 的 0 是合法值，表示快取一律不算新鮮；定位失敗時仍會採用過期快取
    // （stale-cache）作為後備，不是停用快取。
    // geolocationEnabled 原為 `Boolean(config.geolocation && ...)`，缺值時得到 false，
    // 與集中來源宣告的 true 相反——那是永遠讀不到宣告值的幽靈預設。
    const cacheDuration = loadedConfig.cache?.location?.duration
      ?? defaultConfig.cache.location.duration;
    const geolocationEnabled = loadedConfig.geolocation?.enabled
      ?? defaultConfig.geolocation.enabled;
    const { cached, cachedAt } = geolocationEnabled
      ? readCachedLocation()
      : { cached: null, cachedAt: null };

    const at = now.value.getTime();
    const cacheFresh = cached !== null && cachedAt !== null && at - cachedAt < cacheDuration;
    const liveLocation = geolocationEnabled && !cacheFresh ? await fetchLiveLocation() : null;

    if (liveLocation) {
      if (storage) {
        storage.setItem('cachedLocation', JSON.stringify(liveLocation));
        storage.setItem('cacheTimestamp', String(now.value.getTime()));
      }
    }

    const choice = resolveLocationSource({
      configured: resolveConfiguredLocation(loadedConfig.location),
      cached,
      cachedAt,
      now: at,
      cacheDuration,
      live: liveLocation,
      geolocationEnabled
    });

    if (choice.data) {
      applyLocation(choice.data);
    } else {
      locationState.value = { city: '', district: '', label: '', known: false };
    }
  }

  async function updateWeather() {
    const apiKey = env.VITE_CWA_API_KEY;
    if (!apiKey || apiKey.includes('YOUR_') || apiKey.includes('_KEY_HERE')) {
      console.warn('CWA API Key not configured; weather data is unavailable');
      return;
    }

    // 後備縣市取自集中來源，不在此寫死第二份
    const queryName = /[一-龥]/.test(locationState.value.district || '')
      ? locationState.value.district
      : locationState.value.city || defaultConfig.location.city;

    try {
      const api = createWeatherApi(apiKey);
      const forecast = await api.getWeatherForecast(queryName, 3);
      const next = forecast && forecast.series ? forecast.series : null;

      // 僅 HTTP 成功不足以構成成功更新：必須可解析、涵蓋當下時段且帶有可用值
      if (!isSuccessfulUpdate(next, now.value.getTime())) {
        console.warn('Weather response had no usable data for the present moment');
        latestResponseUsable.value = false;
        return;
      }

      series.value = next;
      lastSuccessAt.value = now.value.getTime();
      everSucceeded.value = true;
      latestResponseUsable.value = true;
    } catch (error) {
      console.error('Weather update failed:', error);
      return;
    }

    // 刷新時沿用當前睡眠狀態，不得寫死為一般模式
    await updateAdvice(isSleeping());
  }

  // ---- AI 建議（可選服務，失敗不構成天氣異常） ---------------------------

  function ensureAdvisor() {
    if (aiAdvisor) return aiAdvisor;
    const provider = env.VITE_AI_PROVIDER || 'gemini';
    const apiKey = provider === 'openai'
      ? env.VITE_OPENAI_API_KEY
      : env.VITE_GEMINI_API_KEY;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === ''
      || apiKey.includes('YOUR_') || apiKey.includes('_KEY_HERE')) {
      return null;
    }
    // 已載入設定的值優先，缺值才退回集中來源。`??` 而非 `||`：0 表示不快取，是有效設定
    const adviceCacheMs = config.value?.cache?.aiAdvice?.duration
      ?? defaultConfig.cache.aiAdvice.duration;
    aiAdvisor = createAdvisor(provider, apiKey, adviceCacheMs);
    return aiAdvisor;
  }

  async function updateAdvice(sleeping, force = false) {
    const advisor = ensureAdvisor();
    if (!advisor) {
      advice.value = '';
      return;
    }

    // 尚未取得任何可用天氣前不送氣象分析：那會是一次沒有輸入的請求，
    // 且資料就緒後還會再送一次。待 updateWeather 成功後再以當前模式送出一次。
    if (!everSucceeded.value) return;

    if (sleeping && !force) {
      const todayKey = formatLocalDate(now.value);
      if (lastSleepGreetingDate === todayKey) return;
      lastSleepGreetingDate = todayKey;
    } else if (sleeping) {
      // 強制更新同樣視為當夜的問候，否則接續的刷新會再送一次
      lastSleepGreetingDate = formatLocalDate(now.value);
    }

    adviceSequence += 1;
    const sequence = adviceSequence;

    try {
      const result = await advisor.getAdvice(
        {
          current: {
            temperature: current.value.temperature,
            weather: current.value.weather,
            feelsLike: current.value.feelsLike,
            humidity: current.value.humidity,
            comfort: current.value.comfort
          },
          // 每一格附帶其實際區間，避免把區間值當成瞬時值使用
          forecast: slots.value.map((slot) => ({
            interval: slot.label,
            intervalStart: new Date(slot.start).toISOString(),
            intervalEnd: new Date(slot.end).toISOString(),
            temperature: slot.values.temperature,
            weather: slot.values.weather,
            rainProbability: slot.values.rainProbability,
            comfort: slot.values.comfort
          }))
        },
        sleeping
      );
      // 較早送出的請求不得覆蓋較新的結果
      if (sequence === adviceSequence) advice.value = result;
    } catch (error) {
      console.error('Advisory update failed:', error);
      if (sequence === adviceSequence) {
        advice.value = sleeping ? '祝您有個美好的夜晚，晚安。' : '';
      }
    }
  }

  // ---- 生命週期 ---------------------------------------------------------

  onMounted(() => {
    station = startStation({
      tick: () => { now.value = clock(); },
      loadConfig: async () => {
        const loaded = await configManager.loadConfig();
        config.value = loaded;
        return loaded;
      },
      resolveLocation,
      updateWeather,
      // 週期必須在設定載入後才求值；在 loadConfig 前讀取只會取到集中來源的預設值。
      // 此處維持 `||` 而非 `??`：0 秒週期會造成忙碌迴圈，不是合法值
      weatherIntervalMs: (loaded) =>
        ((loaded?.weather?.updateInterval || defaultConfig.weather.updateInterval) * 1000),
      setTimer: timers.setInterval,
      clearTimer: timers.clearInterval
    });
  });

  onUnmounted(() => {
    if (station) station.dispose();
  });

  /** 注入睡眠狀態；useDisplayMode 需要本 composable 的 currentHour，故分兩步接線 */
  function bindSleepState(state) {
    sleepState.value = state;
  }

  return {
    now,
    currentHour,
    config,
    sleepConfig,
    time,
    solarDate,
    lunarDate,
    location,
    current,
    today,
    slots,
    daily,
    updatedAtLabel,
    advisory,
    anomaly,
    coverageActive,
    bindSleepState,
    updateAdvice
  };
}

export default useWeatherStation;
