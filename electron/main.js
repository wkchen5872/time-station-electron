const { app, BrowserWindow } = require('electron');
const path = require('path');

// 是否為開發模式
const isDev = process.env.NODE_ENV === 'development';

// 保持對視窗的全局引用，避免 JavaScript 物件被垃圾回收時視窗關閉
let mainWindow;

function createWindow() {
  // 創建瀏覽器視窗
  mainWindow = new BrowserWindow({
    width: 800,
    minWidth: 800,
    height: 480,
    minHeight: 480,
    fullscreen: !isDev, // 開發模式下不全螢幕，方便調試
    autoHideMenuBar: true, // 自動隱藏選單列
    frame: false, // 無邊框模式 (Kiosk Style)
    kiosk: !isDev, // Kiosk 模式 (生產環境)
    backgroundColor: '#1A1A1A', // 啟動時的背景色
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  // 載入應用
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173'); // Vite 開發伺服器
    mainWindow.webContents.openDevTools(); // 開發模式下打開 DevTools
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 視窗關閉時觸發
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 隱藏滑鼠游標（觸控螢幕不需要）
  if (!isDev) {
    mainWindow.webContents.insertCSS('* { cursor: none !important; }');
  }

  // 按 ESC 退出全螢幕（方便開發）
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && isDev) {
      mainWindow.setFullScreen(false);
    }
  });
}

// Electron 準備完成時創建視窗
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // macOS 特有行為：dock 圖示被點擊時重新創建視窗
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有視窗關閉時退出應用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 禁用硬體加速（Raspberry Pi 優化）
// app.disableHardwareAcceleration();
