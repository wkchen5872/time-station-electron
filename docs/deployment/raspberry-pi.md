---
type: Reference
title: Raspberry Pi 部署與 AppImage 相容性
description: Raspberry Pi 的 AppImage 產物檢查、環境相容性與已知限制。
tags: [deployment, raspberry-pi, appimage, electron-builder]
timestamp: 2026-11-01T12:00:00+08:00
---

# Raspberry Pi 部署與 AppImage 相容性

操作步驟請見 [Raspberry Pi 安裝與更新](/docs/deployment/install-update.md)。本頁記錄產物與環境的檢查方式；檔案架構正確不代表每個目標系統都能執行。

產物結構的查證日期為 2026-11-01，對應 `TimeStation-1.4.0-arm64.AppImage`（electron-builder 26.15.3 / Electron 44.2.0），此版本已在目標 Pi 實際執行。更換任一版本後，請依本頁的「檢查清單」重新驗證，不要直接沿用結論。

## 1. 目標硬體

| 項目 | 值 | 來源 |
| --- | --- | --- |
| 機型 | Raspberry Pi 4 | 專案目標設定，實際機型待確認 |
| 顯示器 | 7 吋 800×480 | 專案目標設定，實際型號待確認 |
| CPU 架構 | `aarch64` | 使用者提供的 Pi `uname -m` |
| OS | Debian GNU/Linux 13 (trixie) | 使用者提供的 Pi 系統資訊 |

> **待補：** RAM 容量、Pi 4 的 board revision、桌面環境與顯示伺服器（X11 或 Wayland）尚未記錄。補齊方式見 §4。

## 2. 打包與相容性檢查

Mac 上已產生 ARM64 AppImage，並於 2026-11-01 在目標 Pi 成功執行。首次安裝時服務無法啟動，原因是缺少 `libfuse.so.2`（見 §3）；補裝套件後才正常。這是此次環境的結果，不能據此推論所有依賴、electron-builder 版本或 Pi 系統皆相容。electron-builder 的 [v27 預發布 AppImage 文件](https://www.electron.build/docs/appimage/) 指向 Linux 或 Docker 建置。本專案鎖定 v26，請留意文件版本差異。

### 2.1 檢查專案依賴

`package.json` 列出直接依賴 `@langchain/core`、`@langchain/google-genai`、`@langchain/openai`、`solarlunar` 和 `vue`。這份清單不能證明所有傳遞依賴都沒有 native module。新增依賴或更換打包環境後，請重新檢查目標架構的建置與執行結果。

### 2.2 下載到的是正確的目標二進位

electron-builder 不會自己編譯 Electron，而是下載對應平台的預編譯檔。`--linux --arm64` 讓它取得 `electron-v44.2.0-linux-arm64.zip`（位於 `~/Library/Caches/electron/`），而非 macOS 版。

驗證方式：

```bash
file release/TimeStation-1.4.0-arm64.AppImage
# ELF 64-bit LSB executable, ARM aarch64, interpreter /lib/ld-linux-aarch64.so.1,
# for GNU/Linux 3.7.0
```

本機 AppImage 的外層與 `~/Library/Caches/electron-builder/appimage-12.0.1/` 子目錄中的 `runtime-arm64` 有相同 BuildID。這能佐證外層 runtime 的架構，不能單獨證明內部所有元件都相容。

### 2.3 檢查 glibc 與動態函式庫

先前檢查主二進位 `time-station-electron` 時，記錄到的最高 `GLIBC_` 符號版本為 **2.25**。以下命令檢查目前 `release/linux-arm64-unpacked/` 裡的檔案；該目錄會被後續打包更新，不能直接視為舊版產物的證據：

```bash
strings -a release/linux-arm64-unpacked/time-station-electron \
  | grep -oE 'GLIBC_2\.[0-9]+' | sort -u -V | tail -1
# GLIBC_2.25
```

外層 ELF 的 `file` 輸出另標示 GNU/Linux 3.7.0。這些資訊只涵蓋被檢查的檔案；其他函式庫、圖形環境與 AppImage runtime 仍可能影響相容性。Pi 本機打包也不能單憑建置機的 glibc 版本推論產物的完整需求。

### 2.4 本專案的沙箱參數

本專案的 `scripts/start.sh` 啟動 AppImage 時會明確傳入 `--no-sandbox`。因此，不能依 AppImage 的自動偵測邏輯宣稱本專案使用了 Chromium sandbox。直接執行 AppImage 與透過 `start.sh` 啟動的參數也可能不同。

### 2.5 動態連結庫由系統提供

二進位依賴桌面環境的共用函式庫，包括 `libgtk-3.so.0`、`libX11.so.6`、`libasound.so.2`、`libgbm.so.1`、`libcups.so.2`、`libdbus-1.so.3` 等。

目標系統需要圖形環境及相應函式庫。Desktop 版通常較容易準備；Lite 版必須另行安裝和設定需要的圖形元件，能否啟動仍需實測。

## 3. 部署與 FUSE

本機打包及 Mac 上傳的完整操作，包含初次準備、更新與驗證，見 [Raspberry Pi 安裝與更新](/docs/deployment/install-update.md)。

### libfuse2 的套件名會隨版本改變

部分 AppImage runtime 需要 **libfuse 2**，而現代 Debian 預設只安裝 fuse3。需要時若找不到函式庫，會出現：

```
dlopen(): error loading libfuse.so.2
```

由 systemd 管理時，`Restart=on-failure` 會讓它反覆重啟，`systemctl status` 顯示 `activating (auto-restart) ... status=1/FAILURE`。重開機不會修好這個問題——必須補裝函式庫。

`install-pi.sh` 會檢查產物及 `ldconfig` 的資訊；若辨識到需要但缺少 `libfuse.so.2`，會在停止服務前結束，不動到現役版本。套件名稱因發行版而異，先查再裝：

```bash
apt-cache policy libfuse2t64 libfuse2 2>/dev/null | grep -A1 '^libfuse2'
```

**Debian 13 (trixie) / arm64 的實測結果（2026-11-01）：** 套件名是 `libfuse2t64`（64-bit `time_t` 轉換後改名），不是舊的 `libfuse2`。`electron-builder 26.15.3` 內附的 `appimage-12.0.1` runtime 確實需要 libfuse 2，產物前 256 KB 可查到 `libfuse.so.2` 字串。補裝後的目標 Pi 狀態：

```bash
dpkg -l | grep -i libfuse
# ii  libfuse2t64:arm64   2.9.9-9     arm64  Filesystem in Userspace (library)
# ii  libfuse3-4:arm64    3.17.2-3    arm64  Filesystem in Userspace (library) (3.x version)

ldconfig -p | grep libfuse.so.2
#     libfuse.so.2 (libc6,AArch64) => /lib/aarch64-linux-gnu/libfuse.so.2
```

換機型或換 OS 時這兩項都要重查：套件名可能再改，而不同 electron-builder 版本內附的 runtime 需求也不同，所以腳本是先看產物自己要什麼，而非寫死依賴。

若該函式庫無法安裝，支援此選項的 AppImage 可改以解壓方式執行，繞過 FUSE 掛載；以下檔名需換成實際產物：

```bash
~/TimeStation-1.4.0-arm64.AppImage --appimage-extract-and-run
```

解壓會使用額外空間。若目標系統的 `/tmp` 是 tmpfs，也會使用記憶體；可用 `findmnt -no FSTYPE /tmp` 確認。

### 離開 kiosk 需要從外部終止

`electron/main.js` 在非開發模式啟用 `fullscreen` 與 `kiosk`，並注入 `cursor: none`。Escape 鍵的退出全螢幕邏輯只在 `isDev` 下生效：

```js
if (input.key === 'Escape' && isDev) {
  mainWindow.setFullScreen(false);
}
```

若由 systemd 管理，登入 Pi 後可停止服務：

```bash
sudo systemctl stop time-station.service
```

不要用 `pkill -f time-station-electron` 作為通用停止指令；專案路徑及其他工作階段的命令列也可能包含此字串。

## 4. 換機型或換 OS 時的檢查清單

在目標 Pi 上執行：

```bash
uname -m                                    # 必須是 aarch64
cat /etc/os-release | grep -E 'PRETTY_NAME|VERSION_CODENAME'
ldd --version | head -1                     # 記錄目標系統 glibc 版本
findmnt -no FSTYPE /tmp                     # 影響 extract-and-run 是否可用
ldconfig -p | grep libfuse.so.2             # AppImage runtime 需要時必須有這行
echo "$XDG_SESSION_TYPE"                    # x11 或 wayland
free -h | awk '/Mem:/{print $2}'            # RAM
cat /proc/device-tree/model; echo           # Pi 機型
```

判讀：

| 檢查項 | 通過條件 | 不通過時 |
| --- | --- | --- |
| `uname -m` | `aarch64` | 若為 `armv7l`，arm64 產物無法執行。需確認該 Electron 版本是否仍提供 armv7l，再改 `--arm64` 為 `--armv7l` |
| glibc | 比對產物與目標系統 | 再檢查其他動態函式庫，並在目標系統測試 |
| `libfuse.so.2` | 產物需要時 `ldconfig -p` 查得到 | 用 `apt-cache policy` 確認該發行版的套件名後安裝；見 §3 |
| 桌面環境 | 有所需圖形環境與函式庫 | 在目標系統安裝及設定缺少的元件 |
| 相依套件 | 目標架構可安裝並執行 | 檢查 native module 及目標平台建置方式 |

`XDG_SESSION_TYPE` 為 `wayland` 時，kiosk 全螢幕、觸控及腳本內 X11 環境變數的實際表現需要在該裝置上確認。

## 5. 其他建置環境

Mac 打包不適用時，可依 [安裝與更新教學](/docs/deployment/install-update.md) 在 Pi 本機打包，或參考 electron-builder 的 Docker 文件自行驗證。Docker 路徑尚未在本次工作中測試；本專案打包命令也需要先建置前端，不能只執行 electron-builder。

## 6. 已知限制

- **API key。** 使用的 `VITE_*` 值可能被打包進前端產物；AppImage 可能包含憑證，應避免公開或轉傳。更換打包時使用的 key 需要重新打包。
- **外部設定。** `ConfigManager.js` 嘗試載入 `/config.json`，但 `package.json` 的 `build.files` 未包含根目錄的 `config.json`。正式版載入外部設定的實際行為及修法仍待確認；讀取失敗會使用預設設定。
- **產物體積。** 先前檢查的 AppImage 約 146 MB、解開後約 384 MB。大小隨版本及打包內容改變。

# Citations

[1] [electron-builder AppImage documentation, v27 prerelease](https://www.electron.build/docs/appimage/)
