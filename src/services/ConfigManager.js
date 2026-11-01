/**
 * Configuration Manager
 *
 * 本專案不提供執行期設定檔。設定值在建置時由 `defaultConfig.js` 決定，
 * 修改後需重新建置與部署。原本的 `fetch('/config.json')` 與深度合併已移除：
 * 該機制在正式建置下從未生效（`file://` origin 下絕對路徑指向檔案系統根目錄，
 * 且該檔不在 build.files 內），而開發模式下的 Vite dev server 會送出它，
 * 兩者行為不一致使問題長期未被發現。
 *
 * 保留 `loadConfig` 這個可等待、可注入的載入點，而非讓呼叫端直接 import
 * `defaultConfig`。理由是三項已規格化的時序行為需要一個可替換的載入點才能驗證：
 * 時鐘不依賴設定完成、天氣排程只在設定完成後建立、卸載後不新增排程。
 * 契約是實際的 Promise／等待行為，不是 `async` 關鍵字本身。
 */

import { defaultConfig } from '../defaultConfig.js';

class ConfigManagerClass {
    /**
     * 載入設定
     *
     * 回傳集中來源的淺層複本。維持 async 以符合既有的 awaitable 載入契約。
     */
    async loadConfig() {
        return { ...defaultConfig };
    }
}

// 建立單例實例
export const ConfigManager = new ConfigManagerClass();

export default ConfigManager;
