/**
 * Time Station 預設配置
 * 定義所有設定的預設值和結構
 * 
 * 使用者可以透過 config.json 覆寫這些值
 * 未在 config.json 中設定的項目將使用此處的預設值
 */

export const defaultConfig = {
    // 位置資訊
    location: {
        city: '台北市',
        district: '',
        latitude: 25.0330,
        longitude: 121.5654
    },

    // 地理定位設定
    geolocation: {
        enabled: true
    },

    // 天氣設定
    weather: {
        provider: 'cwa',  // 'openweathermap' 或 'cwa'
        updateInterval: 1800  // 秒 (30 分鐘)
    },

    // 顯示設定
    display: {
        timeFormat: '24h',  // '24h' 或 '12h'
        darkModeStart: 18,  // 日夜模式切換時間 (晚上)
        darkModeEnd: 6,     // 日夜模式切換時間 (早上)
        hideCursor: true    // 是否隱藏滑鼠游標
    },

    // 睡眠模式設定
    sleepMode: {
        enabled: true,    // 是否啟用睡眠模式
        startHour: 23,    // 睡眠模式開始時間 (晚上 23:00)
        endHour: 6        // 睡眠模式結束時間 (早上 06:00)
    },

    // 更新頻率設定 (毫秒)
    updateInterval: {
        time: 1000,              // 時間更新頻率 (1 秒)
        weather: 30 * 60 * 1000  // 天氣更新頻率 (30 分鐘)
    },

    // 快取設定
    cache: {
        location: {
            duration: 24 * 60 * 60 * 1000  // 位置快取有效期限 (24 小時)
        },
        aiAdvice: {
            duration: 60 * 60 * 1000  // AI 建議快取有效期限 (1 小時)
        }
    },

    // AI 功能設定
    ai: {
        enabled: false,      // 是否啟用 AI 功能
        apiEndpoint: '',     // API 端點
        updateInterval: 3600 // 更新頻率 (秒)
    }
};

export default defaultConfig;
