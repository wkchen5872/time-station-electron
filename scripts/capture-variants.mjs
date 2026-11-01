/**
 * 以 Electron 載入建置產物並擷取畫面
 *
 * 用正式環境的 renderer 驗證版面，而不是另一個瀏覽器的近似結果。
 *
 *   npx electron scripts/capture-variants.mjs <baseUrl> <outDir>
 */

import { app, BrowserWindow } from 'electron';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const baseUrl = process.argv[2] || 'http://localhost:5174';
const outDir = process.argv[3] || '/tmp';

const SHOTS = [
  { name: 'codex', query: 'variant=codex' },
  { name: 'claude', query: 'variant=claude' },
  { name: 'codex-sleep', query: 'variant=codex&sleep=1' },
  { name: 'claude-sleep', query: 'variant=claude&sleep=1' }
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 800,
    height: 480,
    show: false,
    frame: false,
    backgroundColor: '#000000'
  });

  for (const shot of SHOTS) {
    await win.loadURL(`${baseUrl}/seed.html?${shot.query}`);
    // 等待 seed 重導與 Vue 掛載完成
    await wait(2500);
    const image = await win.webContents.capturePage();
    const file = join(outDir, `variant-${shot.name}.png`);
    writeFileSync(file, image.toPNG());
    console.log(`captured ${file}`);
  }

  app.quit();
});

app.on('window-all-closed', () => app.quit());
