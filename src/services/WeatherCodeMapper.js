/**
 * 氣象分類代碼對應表 (基於 CWA 定義)
 * 用於轉換 Weather Code <-> 描述 <-> Icon
 */

// 原始對應資料
const RAW_DATA = [
    { "code": "01", "description_zh": "晴", "description_en": "CLEAR", "icon": "☀️" },
    { "code": "01", "description_zh": "晴天", "description_en": "CLEAR", "icon": "☀️" },
    { "code": "02", "description_zh": "晴時多雲", "description_en": "MOSTLY CLEAR", "icon": "🌤️" },
    { "code": "03", "description_zh": "多雲時晴", "description_en": "PARTLY CLEAR", "icon": "⛅" },
    { "code": "04", "description_zh": "多雲", "description_en": "PARTLY CLOUDY", "icon": "☁️" },
    { "code": "05", "description_zh": "多雲時陰", "description_en": "CLOUDY", "icon": "🌥️" },
    { "code": "06", "description_zh": "陰時多雲", "description_en": "MOSTLY CLOUDY", "icon": "🌥️" },
    { "code": "07", "description_zh": "陰", "description_en": "CLOUDY", "icon": "☁️" },
    { "code": "07", "description_zh": "陰天", "description_en": "CLOUDY", "icon": "☁️" },
    { "code": "08", "description_zh": "多雲陣雨", "description_en": "PARTLY CLOUDY WITH SHOWERS", "icon": "🌦️" },
    { "code": "08", "description_zh": "多雲短暫雨", "description_en": "PARTLY CLOUDY WITH OCCASIONAL RAIN", "icon": "🌦️" },
    { "code": "08", "description_zh": "多雲短暫陣雨", "description_en": "PARTLY CLOUDY WITH OCCASIONAL SHOWERS", "icon": "🌦️" },
    { "code": "08", "description_zh": "午後短暫陣雨", "description_en": "OCCASIONAL AFTERNOON SHOWERS", "icon": "🌦️" },
    { "code": "08", "description_zh": "短暫陣雨", "description_en": "OCCASIONAL SHOWERS", "icon": "🌦️" },
    { "code": "08", "description_zh": "短暫雨", "description_en": "OCCASIONAL RAIN", "icon": "🌦️" },
    { "code": "09", "description_zh": "多雲時陰短暫雨", "description_en": "MOSTLY CLOUDY WITH OCCASIONAL RAIN", "icon": "🌧️" },
    { "code": "09", "description_zh": "多雲時陰短暫陣雨", "description_en": "MOSTLY CLOUDY WITH OCCASIONAL SHOWERS", "icon": "🌧️" },
    { "code": "10", "description_zh": "陰時多雲短暫雨", "description_en": "MOSTLY CLOUDY WITH OCCASIONAL RAIN", "icon": "🌧️" },
    { "code": "10", "description_zh": "陰時多雲短暫陣雨", "description_en": "MOSTLY CLOUDY WITH OCCASIONAL SHOWERS", "icon": "🌧️" },
    { "code": "11", "description_zh": "雨", "description_en": "RAINY", "icon": "🌧️" },
    { "code": "11", "description_zh": "雨天", "description_en": "RAINY", "icon": "🌧️" },
    { "code": "11", "description_zh": "陰短暫雨", "description_en": "CLOUDY WITH OCCASIONAL RAIN", "icon": "🌧️" },
    { "code": "11", "description_zh": "陰短暫陣雨", "description_en": "CLOUDY WITH OCCASIONAL SHOWERS", "icon": "🌧️" },
    { "code": "12", "description_zh": "多雲時陰有雨", "description_en": "MOSTLY CLOUDY WITH RAIN", "icon": "🌧️" },
    { "code": "12", "description_zh": "多雲時陰陣雨", "description_en": "MOSTLY CLOUDY WITH SHOWERS", "icon": "🌧️" },
    { "code": "12", "description_zh": "晴時多雲陣雨", "description_en": "MOSTLY CLEAR WITH SHOWERS", "icon": "🌦️" },
    { "code": "13", "description_zh": "陰時多雲有雨", "description_en": "MOSTLY CLOUDY WITH RAIN", "icon": "🌧️" },
    { "code": "13", "description_zh": "陰時多雲有陣雨", "description_en": "MOSTLY CLOUDY WITH SHOWERS", "icon": "🌧️" },
    { "code": "14", "description_zh": "陰有雨", "description_en": "RAINY", "icon": "🌧️" },
    { "code": "14", "description_zh": "陰有陣雨", "description_en": "CLOUDY WITH SHOWERS", "icon": "🌧️" },
    { "code": "14", "description_zh": "陣雨", "description_en": "SHOWERS", "icon": "🌧️" },
    { "code": "15", "description_zh": "多雲陣雨或雷雨", "description_en": "PARTLY CLOUDY WITH SHOWERS OR THUNDERSHOWERS", "icon": "⛈️" },
    { "code": "15", "description_zh": "多雲短暫陣雨或雷雨", "description_en": "PARTLY CLOUDY WITH OCCASIONAL SHOWERS OR THUNDERSHOWERS", "icon": "⛈️" },
    { "code": "15", "description_zh": "多雲短暫雷陣雨", "description_en": "PARTLY CLOUDY WITH OCCASIONAL THUNDERSHOWERS", "icon": "⛈️" },
    { "code": "15", "description_zh": "短暫陣雨或雷雨", "description_en": "OCCASIONAL SHOWERS OR THUNDERSTORMS", "icon": "⛈️" },
    { "code": "16", "description_zh": "多雲時陰陣雨或雷雨", "description_en": "PARTLY CLOUDY WITH SHOWERS OR THUNDERSTORMS", "icon": "⛈️" },
    { "code": "16", "description_zh": "多雲時陰雷陣雨", "description_en": "PARTLY CLOUDY WITH THUNDERSHOWERS", "icon": "⛈️" },
    { "code": "17", "description_zh": "陰時多雲有雷陣雨", "description_en": "MOSTLY CLOUDY WITH THUNDERSHOWERS", "icon": "⛈️" },
    { "code": "17", "description_zh": "陰時多雲陣雨或雷雨", "description_en": "MOSTLY CLOUDY WITH SHOWERS OR THUNDERSTORMS", "icon": "⛈️" },
    { "code": "18", "description_zh": "雷雨", "description_en": "THUNDERSTORMS", "icon": "⛈️" },
    { "code": "18", "description_zh": "雷陣雨", "description_en": "THUNDERSHOWERS", "icon": "⛈️" },
    { "code": "18", "description_zh": "午後雷陣雨", "description_en": "AFTERNOON THUNDERSHOWERS", "icon": "⛈️" },
    { "code": "18", "description_zh": "陰有雷陣雨", "description_en": "CLOUDY WITH THUNDERSHOWERS", "icon": "⛈️" },
    { "code": "19", "description_zh": "晴午後多雲局部雨", "description_en": "CLEAR BECOMING PARTLY CLOUDY WITH LOCAL RAIN IN THE AFTERNOON", "icon": "🌦️" },
    { "code": "19", "description_zh": "晴午後局部雨", "description_en": "CLEAR WITH LOCAL AFTERNOON RAIN", "icon": "🌦️" },
    { "code": "19", "description_zh": "晴午後短暫雨", "description_en": "CLEAR WITH OCCASIONAL AFTERNOON RAIN", "icon": "🌦️" },
    { "code": "20", "description_zh": "多雲午後局部雨", "description_en": "PARTLY CLOUDY WITH LOCAL AFTERNOON RAIN", "icon": "🌦️" },
    { "code": "20", "description_zh": "多雲午後陣雨", "description_en": "PARTLY CLOUDY WITH AFTERNOON SHOWERS", "icon": "🌦️" },
    { "code": "21", "description_zh": "晴午後多雲雷陣雨", "description_en": "CLEAR BECOMING PARTLY CLOUDY WITH THUNDERSHOWERS IN THE AFTERNOON", "icon": "⛈️" },
    { "code": "21", "description_zh": "晴午後雷陣雨", "description_en": "CLEAR WITH AFTERNOON THUNDERSHOWERS", "icon": "⛈️" },
    { "code": "22", "description_zh": "多雲午後局部雷陣雨", "description_en": "PARTLY CLOUDY WITH LOCAL AFTERNOON THUNDERSHOWERS", "icon": "⛈️" },
    { "code": "22", "description_zh": "多雲午後雷陣雨", "description_en": "PARTLY CLOUDY WITH AFTERNOON THUNDERSHOWERS", "icon": "⛈️" },
    { "code": "23", "description_zh": "有雨或雪", "description_en": "RAIN OR SNOW", "icon": "🌨️" },
    { "code": "23", "description_zh": "陰有雨或雪", "description_en": "CLOUDY WITH RAIN OR SNOW", "icon": "🌨️" },
    { "code": "23", "description_zh": "短暫雨或雪", "description_en": "OCCASIONAL RAIN OR SNOW", "icon": "🌨️" },
    { "code": "23", "description_zh": "有雪", "description_en": "SNOW", "icon": "❄️" },
    { "code": "23", "description_zh": "下雪", "description_en": "SNOW", "icon": "❄️" },
    { "code": "24", "description_zh": "晴有霧", "description_en": "CLEAR WITH FOG", "icon": "🌫️" },
    { "code": "24", "description_zh": "晴晨霧", "description_en": "CLEAR WITH MORNING FOG", "icon": "🌫️" },
    { "code": "25", "description_zh": "晴時多雲有霧", "description_en": "MOSTLY CLEAR WITH FOG", "icon": "🌫️" },
    { "code": "26", "description_zh": "多雲時晴有霧", "description_en": "PARTLY CLEAR WITH FOG", "icon": "🌫️" },
    { "code": "27", "description_zh": "多雲有霧", "description_en": "PARTLY CLOUDY WITH FOG", "icon": "🌫️" },
    { "code": "27", "description_zh": "有霧", "description_en": "WITH FOG", "icon": "🌫️" },
    { "code": "28", "description_zh": "陰有霧", "description_en": "CLOUDY WITH FOG", "icon": "🌫️" },
    { "code": "28", "description_zh": "陰時多雲有霧", "description_en": "MOSTLY CLOUDY WITH FOG", "icon": "🌫️" },
    { "code": "29", "description_zh": "多雲局部雨", "description_en": "PARTLY CLOUDY WITH LOCAL RAIN", "icon": "🌦️" },
    { "code": "30", "description_zh": "多雲時陰局部雨", "description_en": "MOSTLY CLOUDY WITH LOCAL RAIN", "icon": "🌧️" },
    { "code": "30", "description_zh": "陰局部雨", "description_en": "CLOUDY WITH LOCAL RAIN", "icon": "🌧️" },
    { "code": "31", "description_zh": "多雲有霧有局部雨", "description_en": "PARTLY CLOUDY WITH FOG AND LOCAL RAIN", "icon": "🌫️🌦️" },
    { "code": "31", "description_zh": "多雲有霧有陣雨", "description_en": "PARTLY CLOUDY WITH FOG AND RAIN", "icon": "🌫️🌦️" },
    { "code": "32", "description_zh": "多雲時陰有霧有局部雨", "description_en": "MOSTLY CLOUDY WITH FOG AND LOCAL RAIN", "icon": "🌫️🌧️" },
    { "code": "32", "description_zh": "陰有霧有陣雨", "description_en": "CLOUDY WITH FOG AND SHOWERS", "icon": "🌫️🌧️" },
    { "code": "33", "description_zh": "多雲局部陣雨或雷雨", "description_en": "PARTLY CLOUDY WITH LOCAL SHOWERS OR THUNDERSHOWERS", "icon": "⛈️" },
    { "code": "33", "description_zh": "多雲局部雷陣雨", "description_en": "PARTLY CLOUDY WITH LOCAL THUNDERSHOWERS", "icon": "⛈️" },
    { "code": "34", "description_zh": "多雲時陰局部陣雨或雷雨", "description_en": "PARTLY CLOUDY WITH LOCAL SHOWERS OR THUNDERSHOWERS", "icon": "⛈️" },
    { "code": "34", "description_zh": "陰局部陣雨或雷雨", "description_en": "CLOUDY WITH LOCAL SHOWERS OR THUNDERSTORMS", "icon": "⛈️" },
    { "code": "35", "description_zh": "多雲有陣雨或雷雨有霧", "description_en": "PARTLY CLOUDY WITH SHOWERS OR THUNDERSTORMS AND FOG", "icon": "⛈️🌫️" },
    { "code": "35", "description_zh": "多雲有雷陣雨有霧", "description_en": "PARTLY CLOUDY WITH THUNDERSHOWERS AND FOG", "icon": "⛈️🌫️" },
    { "code": "36", "description_zh": "多雲時陰有陣雨或雷雨有霧", "description_en": "MOSTLY CLOUDY WITH SHOWERS OR THUNDERSTORMS AND FOG", "icon": "⛈️🌫️" },
    { "code": "36", "description_zh": "陰有雷陣雨有霧", "description_en": "CLOUDY WITH THUNDERSHOWERS AND FOG", "icon": "⛈️🌫️" },
    { "code": "37", "description_zh": "有雨或雪有霧", "description_en": "RAIN OR SNOW WITH FOG", "icon": "🌨️🌫️" },
    { "code": "38", "description_zh": "短暫陣雨有霧", "description_en": "OCCASIONAL SHOWERS WITH FOG", "icon": "🌧️🌫️" },
    { "code": "39", "description_zh": "有雨有霧", "description_en": "RAIN WITH FOG", "icon": "🌧️🌫️" },
    { "code": "39", "description_zh": "陣雨有霧", "description_en": "SHOWERS WITH FOG", "icon": "🌧️🌫️" },
    { "code": "41", "description_zh": "陣雨或雷雨有霧", "description_en": "SHOWERS OR THUNDERSTORMS WITH FOG", "icon": "⛈️🌫️" },
    { "code": "42", "description_zh": "下雪", "description_en": "SNOW", "icon": "❄️" },
    { "code": "42", "description_zh": "積冰", "description_en": "ICE", "icon": "❄️" },
    { "code": "42", "description_zh": "暴風雪", "description_en": "SNOW FLURRIES", "icon": "🌨️" }
];

class WeatherCodeMapper {
    constructor() {
        this.codeToIconMap = new Map();
        this.descToCodeMap = new Map();
        this.codeToDescListMap = new Map();

        this._initializeMaps();
    }

    /**
     * 初始化索引 Map (加速查詢)
     * @private
     */
    _initializeMaps() {
        RAW_DATA.forEach(item => {
            const code = this._normalizeCode(item.code);

            // 1. 建立 Code -> Icon (取該代碼遇到的第一個 Icon 為主)
            if (!this.codeToIconMap.has(code)) {
                this.codeToIconMap.set(code, item.icon);
            }

            // 2. 建立 Description -> Code (支援中英文反查)
            this.descToCodeMap.set(item.description_zh, code);
            this.descToCodeMap.set(item.description_en.toUpperCase(), code);

            // 3. 建立 Code -> Description Array (一個代碼可能有多種描述)
            if (!this.codeToDescListMap.has(code)) {
                this.codeToDescListMap.set(code, []);
            }
            this.codeToDescListMap.get(code).push({
                zh: item.description_zh,
                en: item.description_en,
                icon: item.icon
            });
        });
    }

    /**
     * 正規化 Weather Code (移除前導零，轉為字串)
     * CWA API 可能回傳 "01" 或 "1"，統一轉為 "1"
     * @private
     */
    _normalizeCode(code) {
        if (code === null || code === undefined) return '';
        return parseInt(code, 10).toString();
    }

    /**
     * 透過 Weather Code 查詢 Icon
     * @param {string|number} code - 天氣代碼 (如 "01", 1)
     * @returns {string} Emoji Icon 或預設 "?"
     */
    getIconByCode(code) {
        const normalized = this._normalizeCode(code);
        return this.codeToIconMap.get(normalized) || '❓';
    }

    /**
     * 透過中文或英文描述查詢 Weather Code
     * @param {string} description - 天氣描述 (如 "晴天", "CLEAR")
     * @returns {string|null} 天氣代碼 (如 "1") 或 null
     */
    getCodeByDescription(description) {
        if (!description) return null;
        // 英文轉大寫以符合 Key 格式
        const key = /[a-zA-Z]/.test(description) ? description.trim().toUpperCase() : description.trim();
        return this.descToCodeMap.get(key) || null;
    }

    /**
     * 透過 Weather Code 查詢所有相關描述列表
     * @param {string|number} code - 天氣代碼
     * @returns {Array<{zh: string, en: string, icon: string}>} 描述物件陣列
     */
    getDescriptionsByCode(code) {
        const normalized = this._normalizeCode(code);
        return this.codeToDescListMap.get(normalized) || [];
    }

    /**
     * 透過 Weather Code 查詢主要的中文描述 (取陣列第一筆)
     * @param {string|number} code 
     * @returns {string} 中文描述
     */
    getLabelByCode(code) {
        const list = this.getDescriptionsByCode(code);
        return list.length > 0 ? list[0].zh : '未知天氣';
    }
}

export default WeatherCodeMapper;