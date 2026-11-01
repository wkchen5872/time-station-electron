---
type: Playbook
title: Raspberry Pi 安裝與更新
description: 在 Raspberry Pi 本機打包，或從 Mac 打包並上傳 AppImage 的操作步驟。
tags: [deployment, raspberry-pi, appimage, installation]
timestamp: 2026-11-01T17:34:14+08:00
---

# Raspberry Pi 安裝與更新

選擇在 Raspberry Pi 本機打包，或在 Mac 打包後上傳。兩種方式最後都用 `scripts/install-pi.sh` 安裝 AppImage。使用者於 2026-11-01 回報，樹莓派重新開機後可看到新版啟動；不同硬體、OS 和設定仍需各自驗證。

該回報對應當時的安裝產物。即使重新打包時沿用相同版號，新產物仍需部署與畫面驗收；本機測試或舊版的啟動結果不能代替這一步。

## 準備工作

- 在 Pi 確認 `uname -m` 輸出 `aarch64`。本專案的打包目標是 Linux ARM64。使用者提供的 Pi 系統為 Debian 13（trixie）。
- 在打包機安裝 Node.js 22.12.0 以上，並使用 `npm ci` 安裝相依套件。所需版本依本專案鎖定的 Electron 與 Vite 套件判斷。
- 在**打包機**設定 `.env`，再執行打包。至少依需要設定 `VITE_CWA_API_KEY`，定位及 AI 金鑰依使用功能設定。`VITE_` 值可能包含在前端與 AppImage 產物中，請保護產物。
- Pi 上的安裝目錄必須已有 `scripts/start.sh` 和 `scripts/stop.sh`。上傳工具只傳 AppImage 與 `install-pi.sh`，不會建立完整專案或安裝 Node.js。
- 如果已有 `time-station.service`，先執行 `systemctl cat time-station.service`，確認 `ExecStart` 與要更新的專案目錄一致。安裝會停止既有服務，請選擇可以中斷顯示的時間。
- 本專案不提供執行期設定檔。地區、睡眠時段、刷新週期等內建預設值集中在打包機的
  `src/defaultConfig.js`，必須在打包**之前**修改。Pi 本機打包時就在 Pi 的來源目錄修改；
  Mac 打包時就在 Mac 修改，再上傳新產物。只修改已安裝 AppImage 旁的 JSON 檔不會生效。

本文範例以 `pi@raspberrypi.local` 和 `/home/pi/time-station-electron` 表示目標。請替換成自己的帳號、主機與目錄。

## 方式一：在 Raspberry Pi 本機打包

1. 準備來源碼。每次更新建議使用新的獨立建置目錄，避免覆寫正在執行的 AppImage，也避免保留舊版本已刪除的來源檔。以下在 **Mac 的專案根目錄**執行，範例目錄為首次使用的 `~/time-station-build-1.4.0`：

   ```bash
   ssh pi@raspberrypi.local 'mkdir -p ~/time-station-build-1.4.0'
   rsync -av \
     --include='/.env.example' --exclude='/.env*' \
     --exclude='/node_modules' --exclude='/dist' --exclude='/release' \
     --exclude='/backups' --exclude='/.git' --exclude='/work-items' \
     ./ pi@raspberrypi.local:time-station-build-1.4.0/
   ```

   這個範例保留 `.env.example`，不傳送實際環境檔，也不刪除 Pi 上既有檔案。如果重複使用舊建置目錄，已從來源移除的檔案可能仍留在 Pi 上。若改用 Git checkout，確認 checkout 的版本包含要部署的變更；未提交變更不會隨 clone 或 pull 傳送。

2. 在 **Pi** 設定環境並安裝依賴：

   ```bash
   cd ~/time-station-build-1.4.0
   if [ ! -e .env ]; then cp .env.example .env; fi
   nano .env
   npm ci
   ```

3. 在 Pi 打包並確認確切檔名：

   ```bash
   node -p "require('./package.json').version"
   npm run electron:build:appimage
   ls -lh release/*.AppImage
   ```

4. 首次安裝到新目錄時，先準備啟動腳本；既有檔案不會由 `cp -n` 覆寫：

   ```bash
   mkdir -p "$HOME/time-station-electron/scripts"
   cp -n scripts/start.sh scripts/stop.sh "$HOME/time-station-electron/scripts/"
   ```

   更新既有安裝時，先核對該目錄的啟動腳本及 service 設定。

5. 以一般使用者執行安裝，將範例檔名換成上一步看到的檔名：

   ```bash
   bash scripts/install-pi.sh "$PWD/release/TimeStation-1.4.0-arm64.AppImage" \
     "$HOME/time-station-electron"
   ```

## 方式二：在 Mac 打包後上傳

1. 在 **Mac 的專案根目錄**設定 `.env` 並打包：

   ```bash
   if [ ! -e .env ]; then cp .env.example .env; fi
   nano .env
   npm ci
   node -p "require('./package.json').version"
   npm run electron:build:appimage
   ls -lh release/*.AppImage
   file release/*.AppImage
   ```

   核對要部署的檔名與 ARM64 架構。若 `release/` 有多個版本，請依版本選擇，不要只依畫面上的「最新」標示判斷：部分系統的 `sort` 不支援版號排序，腳本會退回字典排序。

   本次 Mac 已產生 ARM64 AppImage，使用者也回報 Pi 重開機後顯示新版。electron-builder 的 [v27 預發布文件](https://www.electron.build/docs/appimage/) 將 Linux 或 Docker 列為 AppImage 建置環境；本專案鎖定 v26，不應把本次經驗推廣為所有版本和環境都能在 macOS 直接打包。環境不相容時可改用 Pi 本機打包。

2. 確認 Pi 可以透過 SSH 登入，且安裝目錄已有 `scripts/start.sh` 和 `scripts/stop.sh`。首次安裝、目錄尚未建立時，可先在 Mac 執行：

   ```bash
   ssh pi@raspberrypi.local 'mkdir -p ~/time-station-staging ~/time-station-electron/scripts'
   scp scripts/start.sh scripts/stop.sh pi@raspberrypi.local:time-station-staging/
   ssh pi@raspberrypi.local 'cp -n ~/time-station-staging/start.sh ~/time-station-staging/stop.sh ~/time-station-electron/scripts/'
   ```

   指令不覆寫安裝目錄中的既有啟動腳本。若安裝目錄不是預設路徑，請一併修改指令。

3. 在 Mac 執行：

   ```bash
   bash scripts/upload-to-pi.sh
   ```

   選擇 AppImage，輸入 Pi 的 `user@host` 和專案目錄。只輸入 IP 或主機名稱時，腳本會另問 Pi 使用者名稱。SSH 若需要密碼，會自行詢問；安裝階段的 `sudo` 也可能要求驗證。

4. 腳本把 AppImage 和 `install-pi.sh` 傳到 Pi 的 `~/time-station-staging/`，並比較檔案大小。這不是雜湊驗證。出現「現在執行安裝？」時，輸入 `y` 才會繼續；選擇 `N` 時可依畫面顯示的命令稍後安裝。

## 安裝腳本會做什麼

`install-pi.sh` 先檢查來源檔、目錄、架構與產物的 FUSE 需求。接著停止既有 systemd 服務，將 `release/` 根目錄的舊 AppImage 移到專案目錄下的 `backups/`，安裝新版並設定權限。沒有既有服務時，腳本會詢問是否建立開機啟動服務。

若無法查詢 systemd、既有服務的 `ExecStart` 不是此專案的 `scripts/start.sh`，或服務停止失敗，腳本會結束且不搬動安裝檔案。使用其他啟動包裝程式的服務可能不符合這項檢查；請先核對實際設定。

殘留程序檢查只對可辨認為本安裝目錄 `release/` 中 AppImage 的程序送訊號；其他無法確認來源的程序不會被這個檢查終止。若已辨認的程序仍未退出，或無法執行程序查詢，腳本會停止安裝。以其他方式手動啟動時，請自行確認舊程序已停止。新建的 systemd 範本使用 `DISPLAY=:0` 與 `.Xauthority`，在不同桌面環境中需自行確認；既有服務則沿用原設定。

若偵測到產物需要 `libfuse.so.2` 而系統沒有該函式庫，腳本會在停止服務前結束並列出套件建議。可先在 Pi 檢查：

```bash
apt-cache policy libfuse2t64 libfuse2
```

依實際發行版選擇可用套件。腳本在無法取得 `ldconfig` 資訊時會提示略過檢查，這不代表 FUSE 已確認可用。

## 檢查結果與回退

在 Pi 檢查服務、檔案和日誌：

```bash
systemctl status time-station.service --no-pager -l
find ~/time-station-electron/release -name 'TimeStation-*.AppImage' -print
ls -lh ~/time-station-electron/backups
tail -n 100 /tmp/time-station.log
```

`start.sh` 遞迴搜尋 `release/` 並使用找到的第一個 AppImage。請確認該目錄及子目錄只包含一個符合名稱的版本；備份應放在 `release/` 之外。新建服務使用 `Type=simple`；[systemd 文件](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html#Type=) 說明此類服務不會等待應用程式完成初始化。`systemctl start` 指令成功不代表應用程式與畫面已正常執行；若程式在指令返回後才失敗，安裝腳本不會自動回退。請確認畫面、天氣、兩種版面與睡眠模式，以及重新開機後的啟動狀態。

部分搬移或權限設定失敗時，安裝腳本會嘗試移出本次新檔、還原本次備份並恢復服務。既有服務啟動失敗時，腳本會先嘗試停止服務，再回退舊版；若無法確認服務已停止，會提示手動處理。若建立新服務失敗，已安裝的 AppImage 會保留，服務狀態需手動檢查。這些動作都需檢查實際結果。需要手動回退時，先停止實際使用的服務，核對 `release/` 與 `backups/` 中的確切檔案，再選定一個版本還原；不要讓兩個版本同時留在 `release/`。

SSH 若顯示連線逾時，先檢查 Pi 是否開機、IP、網路及 SSH 服務。若顯示 `Permission denied`，再核對使用者、密碼或 SSH key。不要把密碼寫進命令。

## 本輪功能驗收

使用者於 2026-11-01 確認「pi 測試完成，task 我都打勾了」；`hide-stale-weather-notice`、`two-line-advisory` 與 `nearest-forecast-slot` 的 Pi task 依此現場回報完成。本輪未附 AppImage SHA-256、逐項照片或日誌，以下保留為日後產物可追溯的紀錄欄位，不代表本輪已有這些詳細紀錄。

這一輪涵蓋過期提示隱藏、兩行提示與最近預報時段取值。套件版號為 1.4.1，但版號不足以辨識是否包含最新天氣修復；日後重新建置或部署時，請保存建置來源的 commit、建置時是否有未提交修改，以及安裝產物的確切檔名。

在**建置目錄**記錄來源：

```bash
git rev-parse HEAD
git status --short
node -p "require('./package.json').version"
```

在 **Pi** 對實際安裝的檔案記錄雜湊與時間，將下列檔名換成服務正在使用的 AppImage：

```bash
sha256sum ~/time-station-electron/release/TimeStation-1.4.1-arm64.AppImage
date -Iseconds
```

若 Pi 的來源透過不含 `.git` 的 rsync 傳送，來源 commit 必須從建置機保存，不能在安裝目錄推測。記錄也要包含所在地區，便於對照該地的預報時段。

| 檢查項目 | 要觀察與記錄的結果 |
| --- | --- |
| 新版啟動 | 確認服務使用已記錄雜湊的產物，保存其建置來源 commit；畫面時鐘持續前進 |
| 天氣取值 | 避開整點界線查看兩個變體；記錄檢查時間、溫度、天氣描述及首格標籤。數值是預報，不要求與手機的觀測值完全相同 |
| 後續刷新 | 預設至少跨過一次 30 分鐘刷新，記錄 Codex 更新時間是否前進；失敗時保留日誌。這不代表已完成長時間穩定性驗收 |
| 時段與變體切換 | 四個位置與時距保持一致；切換不重設成功時間。雨率 10% 等變體顯隱差異依 [theme v2](/docs/theme/v2/README.md) 判讀 |
| 提示區 | 實際取得較長文案時，確認最多兩行；超過兩行才在第二行末尾省略，底部不被邊框遮蔽；單行時在固定版位內置中 |
| 一般與其他異常 | 單獨 stale 不蓋掉一般提示；never 或 unlocated 仍可見。須記錄實際觸發條件，未觀察到的狀態標為未測 |
| 睡眠模式 | 在兩版檢查提示色與版位，確認沒有因異常文案提高亮度；記錄手動或自動進入方式 |
| 重啟 | 若本輪測試包含重新開機，記錄實際啟動產物、版面及睡眠選擇是否如預期 |

正式 AppImage 不接受 `devLongText` 測試開關。實際 AI 文案較短或未設定 AI 時，兩行與超長截斷應標為「未測」，不能以看到一行預設問候代替。不要為了製造過期狀態而修改系統時間；沒有觀察到 stale 或其他異常時，同樣保留未測。

將結果填入以下範本，並附上可對應時間的照片或日誌。這是紀錄欄位，不是已通過的宣告：

```text
來源 commit／建置機未提交修改：
AppImage 檔名／SHA-256：
Pi 型號／OS／顯示設定：
所在地區／測試時間與時區：
Codex／Claude 天氣值與首格標籤：
首次與後續成功更新時間：
單行／兩行／超長提示：
stale／never／unlocated 實際觸發條件與結果：
睡眠／重啟結果：
照片或日誌位置：
未測項目／異常／後續處理：
```

這份紀錄可用來補充對應 OpenSpec 的 `hide-stale-weather-notice` task 3.3、`two-line-advisory` task 4.3 與 `nearest-forecast-slot` task 4.3 的產物證據；本輪 task 的完成來源是上述使用者現場確認。日後驗收仍應以實際產物與現場確認為準；本機單元測試、Electron 畫面或安裝指令完成都不能單獨代替實機觀察紀錄。

## 自動測試與舊流程

`npm run test:deploy` 執行 `scripts/check-install-pi.sh`。測試使用隔離目錄、模擬系統工具及攔截的程序訊號；它不驗證真實 SSH、systemd 或 Pi 畫面。

舊的 `scripts/deploy-pi.sh` 仍保留。它會執行 `sudo apt`、`npm install`、打包並詢問是否建立 systemd；其中 Node.js 18 的提示已過時。使用舊腳本前請先閱讀其操作，並確認目標環境。

# Citations

[1] [electron-builder AppImage documentation, v27 prerelease](https://www.electron.build/docs/appimage/)

[2] [systemd.service — Type](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html#Type=)
