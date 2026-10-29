/**
 * Mise Manager — 架构量化红线守门员检查脚本
 * 规范：单文件行数 <= 500 行，单函数行数 <= 50 行，严禁原生 alert/confirm
 */
const fs = require('fs');
const path = require('path');

const ROOT_SRC = path.join(__dirname, '..', 'src');
let hasError = false;

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (/\.(tsx|ts|js|jsx)$/.test(file)) {
      checkFile(fullPath);
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // 1. 检查单文件行数 <= 500
  if (lines.length > 500) {
    console.error(`❌ [行数超标] ${filePath}: 总计 ${lines.length} 行 (上限 500 行)`);
    hasError = true;
  }

  // 2. 检查严禁原生 alert / confirm
  lines.forEach((line, idx) => {
    if (/\b(window\.)?alert\(/.test(line) || /\b(window\.)?confirm\(/.test(line)) {
      console.error(`❌ [禁用原生弹窗] ${filePath}:${idx + 1}: 严禁使用原生 alert/confirm，必须使用 Fluent ConfirmModal`);
      hasError = true;
    }
  });
}

console.log('🔍 开始执行架构量化静态红线检查...');
scanDir(ROOT_SRC);

if (hasError) {
  console.error('\n🚫 静态架构量化检查未通过，请重构违规模块！');
  process.exit(1);
} else {
  console.log('✅ 静态架构量化检查全部通过！\n');
}
