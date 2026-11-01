#!/usr/bin/env node
/**
 * 圖示筆畫裁切檢查
 *
 * 驗收以筆畫的實際範圍為準，不以 symbol 的框寬高相符作為通過依據：框正確但筆畫
 * 仍可能溢出。做法是把同一組幾何畫進一個比 ICON_VIEWBOX 更大的畫布，量出含
 * stroke 的實際墨水範圍（user units），再確認它落在 ICON_VIEWBOX 之內。
 *
 * 需要 rsvg-convert 與 python3 + Pillow。
 *   node scripts/check-icon-clipping.mjs
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  ICONS,
  ICON_IDS,
  ICON_VIEWBOX,
  ICON_STROKE_WIDTH
} from '../src/services/weatherIcons.mjs';
import { requireTools } from './lib/require-tools.mjs';

const SIZES = [40, 34, 52];
const PROBE_MARGIN = 8; // 量測畫布向外多留的 user units
const SCALE = 16; // 量測解析度：每 user unit 的像素數

const [vbX, vbY, vbW, vbH] = ICON_VIEWBOX.split(/\s+/).map(Number);
const visible = { minX: vbX, minY: vbY, maxX: vbX + vbW, maxY: vbY + vbH };

function geometryMarkup(icon) {
  const circles = (icon.circles || [])
    .map((c) => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}"/>`)
    .join('');
  const paths = (icon.paths || []).map((d) => `<path d="${d}"/>`).join('');
  const groups = (icon.groups || [])
    .map(
      (g) =>
        `<g transform="${g.transform}" stroke-width="${g.strokeWidth}">`
        + g.paths.map((d) => `<path d="${d}"/>`).join('')
        + '</g>'
    )
    .join('');
  return circles + paths + groups;
}

function probeSvg(icon) {
  const minX = vbX - PROBE_MARGIN;
  const minY = vbY - PROBE_MARGIN;
  const width = vbW + PROBE_MARGIN * 2;
  const height = vbH + PROBE_MARGIN * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * SCALE}" height="${height * SCALE}" viewBox="${minX} ${minY} ${width} ${height}" fill="none" stroke="#ffffff" stroke-width="${ICON_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">${geometryMarkup(icon)}</svg>`;
}

const PY_BBOX = `
import sys
from PIL import Image
img = Image.open(sys.argv[1]).convert('RGBA')
bbox = img.getchannel('A').getbbox()
print('' if bbox is None else ','.join(str(v) for v in bbox))
`;

function inkBounds(icon, dir) {
  const svgPath = join(dir, 'probe.svg');
  const pngPath = join(dir, 'probe.png');
  writeFileSync(svgPath, probeSvg(icon));
  execFileSync('rsvg-convert', ['-o', pngPath, svgPath]);
  const out = execFileSync('python3', ['-c', PY_BBOX, pngPath]).toString().trim();
  if (!out) return null;
  const [left, top, right, bottom] = out.split(',').map(Number);
  // 像素座標轉回 user units
  return {
    minX: vbX - PROBE_MARGIN + left / SCALE,
    minY: vbY - PROBE_MARGIN + top / SCALE,
    maxX: vbX - PROBE_MARGIN + right / SCALE,
    maxY: vbY - PROBE_MARGIN + bottom / SCALE
  };
}

requireTools();

const dir = mkdtempSync(join(tmpdir(), 'icon-clip-'));
let failures = 0;

try {
  console.log(`viewBox ${ICON_VIEWBOX} -> 可視範圍 x[${visible.minX}, ${visible.maxX}] y[${visible.minY}, ${visible.maxY}]`);
  console.log('');

  for (const id of ICON_IDS) {
    const bounds = inkBounds(ICONS[id], dir);
    if (!bounds) {
      console.log(`✗ ${id.padEnd(8)} 沒有可量測的筆畫`);
      failures += 1;
      continue;
    }

    const clipped =
      bounds.minX < visible.minX
      || bounds.minY < visible.minY
      || bounds.maxX > visible.maxX
      || bounds.maxY > visible.maxY;

    const slackTop = (bounds.minY - visible.minY).toFixed(2);
    const slackLeft = (bounds.minX - visible.minX).toFixed(2);
    const slackRight = (visible.maxX - bounds.maxX).toFixed(2);
    const slackBottom = (visible.maxY - bounds.maxY).toFixed(2);

    const mark = clipped ? '✗' : '✓';
    if (clipped) failures += 1;

    console.log(
      `${mark} ${id.padEnd(8)} 墨水 x[${bounds.minX.toFixed(2)}, ${bounds.maxX.toFixed(2)}] `
      + `y[${bounds.minY.toFixed(2)}, ${bounds.maxY.toFixed(2)}] `
      + `餘裕 上${slackTop} 下${slackBottom} 左${slackLeft} 右${slackRight}`
    );
  }

  console.log('');
  console.log(`套用尺寸 ${SIZES.join(' / ')}px：幾何與 viewBox 等比縮放，故筆畫餘裕比例一致；`);
  console.log('上述量測以 user units 表示，對三種尺寸同時成立。');
  console.log('');
  console.log(failures === 0 ? '結果：全部圖示無裁切' : `結果：${failures} 個圖示被裁切`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

process.exit(failures === 0 ? 0 : 1);
