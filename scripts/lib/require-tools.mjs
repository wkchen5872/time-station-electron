/**
 * 外部工具前置檢查
 *
 * 圖示檢查需要 npm 以外的工具。缺少時必須明確報錯並以非零結束——
 * 靜默跳過卻回報成功，等於把「沒有驗證」說成「驗證通過」。
 */

import { execFileSync } from 'node:child_process';

function probe(command, args) {
  try {
    execFileSync(command, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const TOOLS = [
  {
    name: 'rsvg-convert',
    check: () => probe('rsvg-convert', ['--version']),
    hint: 'macOS: brew install librsvg｜Debian/Ubuntu: apt install librsvg2-bin'
  },
  {
    name: 'python3 + Pillow',
    check: () => probe('python3', ['-c', 'import PIL']),
    hint: 'pip3 install Pillow（或 macOS: brew install pillow）'
  }
];

/**
 * 確認工具齊備；缺少時列出缺項與安裝方式並結束程序。
 */
export function requireTools() {
  const missing = TOOLS.filter((tool) => !tool.check());
  if (missing.length === 0) return;

  console.error('無法執行圖示檢查：缺少下列外部工具\n');
  for (const tool of missing) {
    console.error(`  - ${tool.name}`);
    console.error(`    ${tool.hint}`);
  }
  console.error('\n這些工具不在 npm 相依中，需另行安裝。');
  console.error('在工具齊備前，不得將圖示檢查視為通過。');
  process.exit(1);
}
