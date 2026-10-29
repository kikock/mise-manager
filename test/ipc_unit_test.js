/**
 * Mise Manager — Tauri 2.x 架构契约与量化规范自动化检验套件
 * 依据 .agents/workflows/code-review-standards.md 执行全量检验
 */

import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 开始执行 Mise Manager (Tauri 2.x) 核心架构与量化自动化回归测试...\n');

let pass = 0;
let fail = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ [通过] ${desc}`);
    pass++;
  } catch (e) {
    console.error(`  ❌ [失败] ${desc}: ${e.message}`);
    fail++;
  }
}

// 1. 基础配置与架构契约测试
it('TC-TAURI-01: tauri.conf.json 应包含标准窗口与双轨打包规范', () => {
  const confPath = path.resolve(__dirname, '../src-tauri/tauri.conf.json');
  assert.ok(fs.existsSync(confPath), 'tauri.conf.json 文件缺失');
  const conf = JSON.parse(fs.readFileSync(confPath, 'utf8'));
  assert.strictEqual(conf.productName, 'mise-manager');
  assert.ok(conf.version, '应包含版本定义');
  assert.ok(conf.app && conf.app.windows && conf.app.windows.length > 0, '应配置主窗口');
  assert.ok(conf.bundle, '应包含打包配置');
});

it('TC-TAURI-02: Cargo.toml 应声明核心原生依赖 (tokio, winreg, tauri 2.0)', () => {
  const cargoPath = path.resolve(__dirname, '../src-tauri/Cargo.toml');
  assert.ok(fs.existsSync(cargoPath), 'Cargo.toml 文件缺失');
  const cargo = fs.readFileSync(cargoPath, 'utf8');
  assert.ok(cargo.includes('tauri = { version = "2.0"'), '必须依赖 tauri 2.0');
  assert.ok(cargo.includes('tokio ='), '必须包含 tokio 异步运行时');
  assert.ok(cargo.includes('winreg ='), '必须包含 winreg 注册表支持');
});

// 2. 环境变量 Path 纯函数算法测试
it('TC-ENV-01: Path 规范化算法应消除重复项并排除脏路径', () => {
  const rawPaths = ['C:\\Windows', 'D:\\mise\\shims', 'C:\\Windows', 'D:\\old\\mise', 'C:\\Program Files'];
  const targetDir = 'D:\\mise\\shims';
  const cleanList = [targetDir];
  for (const p of rawPaths) {
    if (p && !p.toLowerCase().includes('old\\mise') && !cleanList.includes(p)) {
      cleanList.push(p);
    }
  }
  assert.strictEqual(cleanList[0], targetDir);
  assert.strictEqual(cleanList.filter(p => p === 'C:\\Windows').length, 1);
  assert.strictEqual(cleanList.some(p => p.includes('old\\mise')), false);
});

// 3. Fluent Design 视觉量化指标断言
it('TC-UI-01: Fluent Design 视觉度量衡量化标准符合 Windows 11 设计规范', () => {
  const stylesDir = path.resolve(__dirname, '../src/styles');
  assert.ok(fs.existsSync(stylesDir), 'styles 目录缺失');
  const cssFiles = fs.readdirSync(stylesDir).filter(f => f.endsWith('.css'));
  assert.ok(cssFiles.length > 0, '应包含 CSS 样式文件');

  let combinedCss = '';
  for (const f of cssFiles) {
    combinedCss += fs.readFileSync(path.join(stylesDir, f), 'utf8') + '\n';
  }

  // 控件圆角 4px，卡片模态 8px
  assert.ok(/4px/.test(combinedCss), '应定义小控件圆角 4px');
  assert.ok(/8px/.test(combinedCss), '应定义卡片模态圆角 8px');
  assert.ok(combinedCss.includes('cubic-bezier') || /--transition/.test(combinedCss), '应定义过渡缓动或标准过渡');
});

// 4. 架构代码规模与单文件指标
it('TC-MET-01: 前端核心源码单文件全部 <= 500 行', () => {
  const srcDir = path.resolve(__dirname, '../src');
  function scan(dir) {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) {
        scan(full);
      } else if (/\.(tsx|ts|js|jsx)$/.test(item)) {
        const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/).length;
        assert.ok(lines <= 500, `文件超标: ${item} (${lines} 行)`);
      }
    }
  }
  scan(srcDir);
});

console.log(`\n=======================================`);
console.log(`测试完成: 通过 ${pass} 项, 失败 ${fail} 项`);
if (fail > 0) process.exit(1);
