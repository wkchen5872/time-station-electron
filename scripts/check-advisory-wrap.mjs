/**
 * 提示區實際換行與截斷檢查
 *
 * `tests/variantRender.test.mjs` 只能看到 SSR 字串裡的 class，無法得知瀏覽器
 * 實際在哪裡斷行。本腳本以 Electron 的 Chromium 量測真正的行框：逐字取
 * Range 的 client rect，依 top 分組還原排版行，再比對兩個變體。
 *
 * 需要先啟動 renderer（`npm run dev`），預設連 http://localhost:5173。
 *
 *   npm run dev
 *   npx electron scripts/check-advisory-wrap.mjs [baseUrl]
 *
 * 檢查項目（對應 `specs/layout-variant/spec.md` 的「兩行版位與截斷規則在兩個
 * 變體中一致」）：
 *   1. 兩版的提示框幾何相同（x/y/寬/高）
 *   2. 超長文案在兩版都只顯示兩行，第三行不可見
 *   3. 單行文案在兩版都於版位內上下置中
 *   4. 全形中文文案在兩版的斷行點相同
 *
 * **逐字斷點不在保證範圍內**（design.md D8）：Codex 的 `font-semibold` 讓半形
 * 字元變寬，中英數混排文案的斷點與 Claude 不同；全形中文字寬不受字重影響，
 * 故第 4 項仍是硬性斷言。混排案例只印出兩版實際斷點供人工比對，不作為失敗條件。
 */

import { app, BrowserWindow } from 'electron';

const baseUrl = process.argv[2] || 'http://localhost:5173';
const VARIANTS = ['codex', 'claude'];
const LINE_H = 28;

const CASES = {
  one: '天氣穩定。',
  pureCjk: '清晨北部有局部短暫陣雨，氣溫將由二十六度降至十八度，外出請攜帶雨具並加件外套，返家前留意路面濕滑與強陣風。',
  mixed: '外出注意18°C至28°C，降雨機率70%，請帶傘。18°C至28°C，降雨機率70%，請帶傘。18°C至28°C，降雨機率70%，請帶傘。'
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 在頁面內執行：注入文案並還原實際行框 */
function probe(text) {
  const p = document.querySelector('p');
  p.textContent = text;
  const node = p.firstChild;

  const rows = new Map();
  for (let i = 0; i < node.length; i += 1) {
    const range = document.createRange();
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const key = Math.round(range.getBoundingClientRect().top);
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(node.data[i]);
  }

  const rect = (el) => {
    const b = el.getBoundingClientRect();
    return [+b.x.toFixed(1), +b.y.toFixed(1), +b.width.toFixed(1), +b.height.toFixed(1)];
  };
  return {
    slot: rect(p.parentElement),
    text: rect(p),
    fontWeight: getComputedStyle(p).fontWeight,
    layoutLines: [...rows.keys()].sort((a, b) => a - b).map((k) => rows.get(k).join(''))
  };
}

const failures = [];
const check = (ok, label, detail = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 800, height: 480, useContentSize: true, frame: false, show: false
  });

  const measured = {};
  for (const variant of VARIANTS) {
    await win.loadURL(baseUrl);
    // 持久化的變體是 JSON 編碼的，寫入裸字串會解析失敗並退回預設值
    await win.webContents.executeJavaScript(
      `localStorage.setItem('layoutVariant', JSON.stringify(${JSON.stringify(variant)}));
       localStorage.setItem('devLongText', 'advice');
       localStorage.removeItem('sleepModeOverride');`
    );
    await win.webContents.reload();
    await wait(2500);

    measured[variant] = {};
    for (const [name, text] of Object.entries(CASES)) {
      measured[variant][name] = await win.webContents.executeJavaScript(
        `(${probe.toString()})(${JSON.stringify(text)})`
      );
    }
  }

  const [a, b] = VARIANTS;

  console.log('\n提示框幾何');
  check(
    JSON.stringify(measured[a].one.slot) === JSON.stringify(measured[b].one.slot),
    '兩版版位相同',
    `${a}=${measured[a].one.slot} ${b}=${measured[b].one.slot}`
  );

  console.log('\n兩行上限與置中');
  for (const variant of VARIANTS) {
    const over = measured[variant].mixed;
    const single = measured[variant].one;
    check(over.text[3] === LINE_H * 2, `${variant} 超長文案只顯示兩行`, `高度 ${over.text[3]}`);
    check(
      over.layoutLines.length > 2,
      `${variant} 確實有被隱藏的第三行（代表真的在截斷）`,
      `排版行數 ${over.layoutLines.length}`
    );
    check(
      single.text[3] === LINE_H &&
        Math.abs((single.text[1] - single.slot[1]) - (single.slot[3] - LINE_H) / 2) < 0.6,
      `${variant} 單行於版位內上下置中`,
      `text.y=${single.text[1]} slot.y=${single.slot[1]}`
    );
  }

  const firstTwo = (name, variant) =>
    measured[variant][name].layoutLines.slice(0, 2);
  const printLines = (name) => {
    for (const variant of VARIANTS) {
      console.log(`      ${variant}（font-weight ${measured[variant][name].fontWeight}）`);
      firstTwo(name, variant).forEach((l, i) => console.log(`        L${i + 1}: ${l}`));
    }
  };

  console.log('\n全形中文斷行點（兩版須相同）');
  const cjkSame =
    JSON.stringify(firstTwo('pureCjk', a)) === JSON.stringify(firstTwo('pureCjk', b));
  check(cjkSame, 'pureCjk：兩版可見兩行的斷點相同');
  if (!cjkSame) printLines('pureCjk');

  // 混排斷點依 design.md D8 不在保證範圍，印出供人工比對，不計為失敗
  console.log('\n中英數混排斷行點（不在保證範圍，僅供比對）');
  printLines('mixed');

  if (failures.length) {
    console.log(`\n失敗 ${failures.length} 項：`);
    failures.forEach((f) => console.log(`  - ${f}`));
  } else {
    console.log('\n全部通過。');
  }

  // app.quit() 之後再設 process.exitCode 不會生效，直接以退出碼結束
  app.exit(failures.length ? 1 : 0);
});

app.on('window-all-closed', () => app.quit());
