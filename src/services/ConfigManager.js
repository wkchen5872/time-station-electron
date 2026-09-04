/**
 * Configuration Manager
 * 負責載入、合併和管理應用程式設定
 * 
 * 設定優先順序：
 * 1. defaultConfig.js (預設值)
 * 2. config.json (使用者設定)
 * 3. Future: localStorage 或其他持久化儲存
 */

import { defaultConfig } from '../defaultConfig.js';

class ConfigManagerClass {
    constructor() {
        this.config = null;
        this.configLoaded = false;
    }

    /**
     * 深度合併物件
     * @param {Object} target - 目標物件
     * @param {Object} source - 來源物件
     * @returns {Object} 合併後的物件
     */
    deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    // 如果是物件，遞迴合併
                    result[key] = this.deepMerge(target[key] || {}, source[key]);
                } else {
                    // 否則直接覆寫
                    result[key] = source[key];
                }
            }
        }

        return result;
    }

    /**
     * 載入設定
     * 合併預設值與使用者設定
     */
    async loadConfig() {
        try {
            // 從預設值開始
            let mergedConfig = { ...defaultConfig };

            // 嘗試載入 config.json
            try {
                const response = await fetch('/config.json');
                if (response.ok) {
                    const userConfig = await response.json();
                    console.log('✅ 載入使用者設定:', userConfig);

                    // 合併使用者設定
                    mergedConfig = this.deepMerge(mergedConfig, userConfig);
                }
            } catch (error) {
                console.warn('⚠️ 無法載入 config.json，使用預設值:', error.message);
            }

            // 儲存合併後的設定
            this.config = mergedConfig;
            this.configLoaded = true;

            console.log('✅ 設定載入完成:', this.config);
            return this.config;

        } catch (error) {
            console.error('❌ 設定載入失敗:', error);
            // 發生錯誤時使用預設值
            this.config = { ...defaultConfig };
            this.configLoaded = true;
            return this.config;
        }
    }

    /**
     * 取得當前設定
     * @returns {Object} 當前設定物件
     */
    getConfig() {
        if (!this.configLoaded) {
            console.warn('⚠️ 設定尚未載入，返回預設值');
            return { ...defaultConfig };
        }
        return this.config;
    }

    /**
     * 取得特定路徑的設定值
     * @param {string} path - 設定路徑，使用點號分隔 (例如: 'display.darkModeStart')
     * @returns {*} 設定值
     */
    get(path) {
        const keys = path.split('.');
        let value = this.getConfig();

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                console.warn(`⚠️ 找不到設定路徑: ${path}`);
                return undefined;
            }
        }

        return value;
    }

    /**
     * 更新設定值（記憶體中）
     * 未來可以擴充為儲存到 localStorage 或檔案
     * @param {string} path - 設定路徑
     * @param {*} value - 新值
     */
    set(path, value) {
        const keys = path.split('.');
        let current = this.config;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
        console.log(`✅ 更新設定: ${path} = `, value);

        // TODO: 未來可以在這裡觸發儲存到持久化儲存
        // this.saveConfig();
    }

    /**
     * 儲存設定到持久化儲存
     * 預留給未來的 UI 設定功能使用
     */
    async saveConfig() {
        // TODO: 實作儲存邏輯
        // 選項 1: localStorage
        // localStorage.setItem('timestation_config', JSON.stringify(this.config));

        // 選項 2: Electron Store
        // store.set('config', this.config);

        // 選項 3: 寫入檔案
        // 需要透過 Electron IPC 與主進程通訊

        console.log('💾 儲存設定功能尚未實作');
    }

    /**
     * 重設為預設值
     */
    reset() {
        this.config = { ...defaultConfig };
        console.log('🔄 設定已重設為預設值');
    }
}

// 建立單例實例
export const ConfigManager = new ConfigManagerClass();

export default ConfigManager;
