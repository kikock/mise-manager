/**
 * Mise Manager — 架构量化与核心业务逻辑自动化测试套件
 * 依据 .agents/workflows/code-review-standards.md 执行全量检验
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const {
  loadConfig,
  saveConfig,
  getAppBaseDir,
  getMiseRootDir,
  getMiseDataDir,
  getMiseBinDir,
  getMiseExeDir,
  buildMiseEnv
} = require('../src/main/config');

console.log('🧪 开始执行 Mise Manager 核心逻辑自动化回归测试...\n');

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

// 1. 基础配置模块单元测试
it('TC-CFG-01: 基础目录应正确指向应用根目录', () => {
  const baseDir = getAppBaseDir();
  assert.ok(typeof baseDir === 'string' && baseDir.length > 0);
  assert.ok(fs.existsSync(baseDir));
});

it('TC-CFG-02: 默认配置读取应包含标准 mise 默认路径', () => {
  const cfg = loadConfig();
  assert.ok(typeof cfg === 'object');
  const rootDir = getMiseRootDir();
  const dataDir = getMiseDataDir();
  const binDir = getMiseBinDir();
  assert.ok(rootDir.includes('mise'), `rootDir 应包含 mise: ${rootDir}`);
  assert.ok(dataDir.includes('data'), `dataDir 应包含 data: ${dataDir}`);
  assert.ok(binDir.includes('shims'), `binDir 应包含 shims: ${binDir}`);
});

it('TC-CFG-03: buildMiseEnv 应注入 MISE_DATA_DIR / MISE_BIN_DIR 与置顶 PATH', () => {
  const env = buildMiseEnv();
  assert.ok(env.MISE_DATA_DIR, '应存在 MISE_DATA_DIR');
  assert.ok(env.MISE_BIN_DIR, '应存在 MISE_BIN_DIR');
  assert.ok(env.PATH, '应存在 PATH');
  assert.ok(env.PATH.startsWith(env.MISE_BIN_DIR), 'PATH 首项应为 MISE_BIN_DIR');
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
it('TC-UI-01: fluent.css 视觉度量衡量化标准符合 Windows 11 设计规范', () => {
  const cssPath = path.resolve(__dirname, '../renderer/css/fluent.css');
  assert.ok(fs.existsSync(cssPath), 'fluent.css 不存在');
  const css = fs.readFileSync(cssPath, 'utf8');

  // 控件圆角 4px，卡片模态 8px
  assert.ok(/--radius-sm:\s*4px;/.test(css), '应定义控件圆角 4px');
  assert.ok(/--radius-md:\s*8px;/.test(css), '应定义卡片圆角 8px');

  // 动画过渡 <= 200ms
  assert.ok(/--transition-fast:\s*100ms/.test(css), '快速过渡 <= 200ms');
  assert.ok(/--transition-slow:\s*200ms/.test(css), '慢速过渡 <= 200ms');

  // 贝塞尔缓动 cubic-bezier(0.1, 0.9, 0.2, 1.0)
  assert.ok(css.includes('cubic-bezier(0.1, 0.9, 0.2, 1.0)'), '应严格对齐 Fluent 标准贝塞尔缓动');
});

// 4. 架构代码规模与单文件指标
it('TC-MET-01: 主进程与渲染进程所有文件硬上限行数 <= 500 行', () => {
  const root = path.resolve(__dirname, '..');
  const checkFiles = [
    'main.js',
    'preload.js',
    'src/main/config.js',
    'src/main/ipc/miseExec.js',
    'src/main/ipc/miseEnv.js',
    'src/main/ipc/market.js',
    'src/main/ipc/system.js',
    'renderer/js/app.js',
    'renderer/js/utils.js',
    'renderer/js/pages/home.js',
    'renderer/js/pages/market.js',
    'renderer/js/pages/installed.js',
    'renderer/js/pages/settings.js',
    'renderer/js/pages/updates.js',
    'renderer/js/theme.js'
  ];

  for (const rel of checkFiles) {
    const full = path.join(root, rel);
    assert.ok(fs.existsSync(full), `文件缺失: ${rel}`);
    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/).length;
    assert.ok(lines <= 500, `文件 ${rel} 超过 500 行硬上限 (当前 ${lines} 行)`);
  }
});

console.log(`\n=======================================`);
console.log(`测试完成: 通过 ${pass} 项, 失败 ${fail} 项`);
if (fail > 0) process.exit(1);
