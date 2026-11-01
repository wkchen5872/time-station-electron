#!/usr/bin/env node
/**
 * 圖示實際渲染裁切檢查
 *
 * 走真正的引用流程：編譯 WeatherIconSprite.vue 與 WeatherIcon.vue，以 SSR 產出
 * 實際的 symbol 定義與 <use> 實例，再以 rsvg-convert 比較「預設 viewport」與
 * 「允許溢出」兩種渲染的非透明像素數。兩者相同代表沒有任何筆畫被裁掉。
 *
 * 只檢查幾何（scripts/check-icon-clipping.mjs）不足以守住這個行為：那個腳本直接
 * 繪製 ICONS 的 path，不經過 symbol/use，因此看不到 <use> viewport 映射造成的位移。
 *
 * 需要 rsvg-convert 與 python3 + Pillow。
 *   node scripts/check-icon-render.mjs
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parse, compileTemplate } from '@vue/compiler-sfc';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ICON_IDS, codeToIconId } from '../src/services/weatherIcons.mjs';
import { requireTools } from './lib/require-tools.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const componentsDir = join(root, '..', 'src', 'components');
const SIZES = [34, 40, 52];
const PROBE_SCALE = 8; // 每 px 的取樣倍率，讓 1px 的裁切也可見

/** 把 SFC 編成可直接 import 的暫存模組，保留相對路徑以便其 import 正常解析 */
async function loadSfc(name) {
  const filename = join(componentsDir, `${name}.vue`);
  const source = readFileSync(filename, 'utf8');
  const { descriptor } = parse(source, { filename });

  const { code } = compileTemplate({
    source: descriptor.template.content,
    filename,
    id: name,
    mode: 'module'
  });

  const script = descriptor.script.content
    .replace(/export default/, 'const __component__ =');
  const moduleSource = `${script}\n${code}\n__component__.render = render;\nexport default __component__;\n`;

  const tempFile = join(componentsDir, `.__check_${name}.mjs`);
  writeFileSync(tempFile, moduleSource);
  try {
    return (await import(pathToFileURL(tempFile).href)).default;
  } finally {
    unlinkSync(tempFile);
  }
}

const PY_ALPHA_COUNT = `
import sys
from PIL import Image
img = Image.open(sys.argv[1]).convert('RGBA')
print(sum(1 for p in img.getchannel('A').getdata() if p > 0))
`;

function alphaCount(svgMarkup, dir, tag) {
  const svgPath = join(dir, `${tag}.svg`);
  const pngPath = join(dir, `${tag}.png`);
  writeFileSync(svgPath, svgMarkup);
  execFileSync('rsvg-convert', ['-z', String(PROBE_SCALE), '-o', pngPath, svgPath]);
  return Number(execFileSync('python3', ['-c', PY_ALPHA_COUNT, pngPath]).toString().trim());
}

function document(defs, instance, size, overflow) {
  const style = overflow ? ' style="overflow: visible"' : '';
  const body = instance.replace('<svg', `<svg${style}`);
  // 外框放大，讓溢出的筆畫在「允許溢出」那一版確實畫得出來
  const pad = 16;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size + pad * 2}" height="${size + pad * 2}" color="#ffffff">`
    + defs
    + `<g transform="translate(${pad},${pad})">${body}</g>`
    + '</svg>';
}

/** 由 codeToIconId 反推每個圖示的代表代碼，避免另外維護一張對照表 */
function sampleCodes() {
  const found = new Map();
  for (let code = 1; code <= 42; code += 1) {
    const id = codeToIconId(String(code));
    if (!found.has(id)) found.set(id, String(code));
  }
  if (!found.has('unknown')) found.set('unknown', '999');
  return found;
}

const Sprite = await loadSfc('WeatherIconSprite');
const WeatherIcon = await loadSfc('WeatherIcon');

// 取出 sprite 的 symbol 定義（SSR 後是一個隱藏的 <svg>，內含 <defs>）
const spriteMarkup = await renderToString(createSSRApp({ render: () => h(Sprite) }));
const defs = spriteMarkup.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

requireTools();

const dir = mkdtempSync(join(tmpdir(), 'icon-render-'));
let failures = 0;
let checked = 0;

try {
  console.log('以實際 SFC 的 symbol/use 輸出比對預設 viewport 與允許溢出的渲染\n');

  const codes = sampleCodes();

  for (const id of ICON_IDS) {
    const code = codes.get(id);
    if (!code) {
      console.log(`✗ ${id.padEnd(8)} 找不到對應的代表代碼`);
      failures += 1;
      continue;
    }

    for (const size of SIZES) {
      // 實例取自 WeatherIcon 元件的實際輸出，而非手刻的 <use>——
      // 手刻會略過元件自身的外層 svg 屬性，讓 viewport 映射的缺陷驗不出來
      const instance = await renderToString(
        createSSRApp({ render: () => h(WeatherIcon, { code, size }) })
      );
      const tag = `${id}-${size}`;

      const clipped = alphaCount(document(defs, instance, size, false), dir, `${tag}-default`);
      const full = alphaCount(document(defs, instance, size, true), dir, `${tag}-overflow`);
      checked += 1;

      if (clipped === 0) {
        console.log(`✗ ${tag.padEnd(14)} 沒有任何筆畫`);
        failures += 1;
        continue;
      }
      if (clipped !== full) {
        console.log(`✗ ${tag.padEnd(14)} 裁切 ${full - clipped} 個像素（預設 ${clipped} / 允許溢出 ${full}）`);
        failures += 1;
        continue;
      }
      console.log(`✓ ${tag.padEnd(14)} ${clipped} 個像素，無差異`);
    }
  }

  // 同時確認實際元件渲染出的外層 svg 不會重複設定 viewBox
  const sample = await renderToString(
    createSSRApp({ render: () => h(WeatherIcon, { code: '18', size: 40 }) })
  );
  if (/<svg\b[^>]*\bviewBox\b/.test(sample)) {
    console.log('\n✗ WeatherIcon 的外層 svg 仍帶 viewBox，會使 <use> 的映射位移');
    failures += 1;
  } else {
    console.log('\n✓ WeatherIcon 外層 svg 無重複 viewBox');
  }

  console.log('');
  console.log(failures === 0
    ? `結果：${checked} 個實例（${ICON_IDS.length} 圖示 × ${SIZES.length} 尺寸）皆無裁切`
    : `結果：${failures} 項未通過`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

process.exit(failures === 0 ? 0 : 1);
