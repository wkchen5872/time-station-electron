/**
 * 在 node 下載入實際的 SFC
 *
 * 把 .vue 編成暫存 .mjs 放在原目錄（保留相對路徑，使其 import 正常解析），
 * 並遞迴處理它所 import 的其他 .vue，讓測試能渲染真正的元件而非替身。
 *
 * 使用 @vue/compiler-sfc 與 vue/server-renderer，兩者隨 vue 安裝，不需新增套件。
 */

import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { parse, compileTemplate } from '@vue/compiler-sfc';

const PREFIX = '.__sfc_test_';

function tempPathFor(vuePath) {
  return join(dirname(vuePath), `${PREFIX}${basename(vuePath, '.vue')}.mjs`);
}

function compileOne(vuePath, created) {
  const tempPath = tempPathFor(vuePath);
  if (created.includes(tempPath)) return tempPath;

  const source = readFileSync(vuePath, 'utf8');
  const name = basename(vuePath, '.vue');
  const { descriptor } = parse(source, { filename: vuePath });

  const { code: renderCode } = compileTemplate({
    source: descriptor.template.content,
    filename: vuePath,
    id: name,
    mode: 'module'
  });

  let script = descriptor.script.content;

  // 先把相依的 .vue 一併編譯，再改寫 import 指向其暫存模組
  const vueImports = [...script.matchAll(/from\s+'([^']+\.vue)'/g)].map((m) => m[1]);
  for (const specifier of vueImports) {
    const depPath = resolve(dirname(vuePath), specifier);
    compileOne(depPath, created);
    const depTemp = `${dirname(specifier)}/${PREFIX}${basename(specifier, '.vue')}.mjs`;
    script = script.replaceAll(`from '${specifier}'`, `from '${depTemp}'`);
  }

  script = script.replace(/export default/, 'const __component__ =');
  const moduleSource = `${script}\n${renderCode}\n__component__.render = render;\nexport default __component__;\n`;

  writeFileSync(tempPath, moduleSource);
  created.push(tempPath);
  return tempPath;
}

/**
 * @param {string} vuePath - .vue 的絕對路徑
 * @returns {Promise<{component: object, cleanup: () => void}>}
 */
export async function loadSfc(vuePath) {
  const created = [];
  try {
    const tempPath = compileOne(vuePath, created);
    // 加上查詢字串避免同一路徑被模組快取沿用
    const url = `${pathToFileURL(tempPath).href}?t=${Date.now()}`;
    const component = (await import(url)).default;
    return {
      component,
      cleanup: () => {
        for (const file of created) rmSync(file, { force: true });
      }
    };
  } catch (error) {
    for (const file of created) rmSync(file, { force: true });
    throw error;
  }
}
