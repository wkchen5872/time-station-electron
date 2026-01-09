/**
 * Time Station 配置文件
 * 集中管理應用程式的各項設定
 */

export const config = {
  // 睡眠模式配置
  sleepMode: {
    enabled: true,       // 是否啟用睡眠模式
    startHour: 23,       // 睡眠模式開始時間 (晚上 23:00)
    endHour: 6          // 睡眠模式結束時間 (早上 06:00，即 05:59 是最後一分鐘)
  },

  // 更新頻率配置
  updateInterval: {
    time: 1000,          // 時間更新頻率 (毫秒)
    weather: 30 * 60 * 1000  // 天氣更新頻率 (30 分鐘)
  },

  // 快取配置
  cache: {
    location: {
      duration: 24 * 60 * 60 * 1000  // 位置快取有效期限 (24 小時)
    },
    aiAdvice: {
      duration: 60 * 60 * 1000  // AI 建議快取有效期限 (1 小時)
    }
  }
};

export default config;
