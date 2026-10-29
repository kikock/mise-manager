/**
 * Mise Manager — 基础配置与路径管理中枢
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');

/** 安全获取用户数据目录 */
function getUserDataDir() {
  try {
    if (app.isReady()) {
      return app.getPath('userData');
    }
  } catch (e) {}
  const base = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : path.join(os.homedir(), '.config'));
  const dir = path.join(base, 'mise-manager');
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  return dir;
}

function getConfigPath() {
  return path.join(getUserDataDir(), 'config.json');
}

function loadConfig() {
  try {
    const p = getConfigPath();
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

function saveConfig(data) {
  try {
    const p = getConfigPath();
    const current = loadConfig();
    const merged = { ...current, ...data };
    fs.writeFileSync(p, JSON.stringify(merged, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

/** 获取应用运行基础目录 */
function getAppBaseDir() {
  try {
    return app.isPackaged ? path.dirname(app.getPath('exe')) : path.resolve(__dirname, '..', '..');
  } catch (e) {
    return path.resolve(__dirname, '..', '..');
  }
}

/** 获取 MISE 统一主目录：默认 [应用运行根目录]\mise */
function getMiseRootDir() {
  const cfg = loadConfig();
  return cfg.miseRootDir || path.join(getAppBaseDir(), 'mise');
}

/** 获取 MISE_DATA_DIR 数据目录：严格对应 [MISE 统一主目录]\data */
function getMiseDataDir() {
  const cfg = loadConfig();
  return cfg.miseDataDir || path.join(getMiseRootDir(), 'data');
}

/** 获取 MISE_BIN_DIR shims 目录：严格对应 [MISE_DATA_DIR]\shims 即 [MISE 统一主目录]\data\shims */
function getMiseBinDir() {
  const cfg = loadConfig();
  return cfg.miseBinDir || path.join(getMiseDataDir(), 'shims');
}

/** 获取 mise 可执行程序所在的 bin 目录：[MISE 统一主目录]\bin */
function getMiseExeDir() {
  return path.join(getMiseRootDir(), 'bin');
}

/** 获取 mise 实际可执行文件入口：严格对应 [MISE 统一主目录]\bin\mise.exe */
function getMiseBinPath() {
  const primary = path.join(getMiseExeDir(), 'mise.exe');
  if (fs.existsSync(primary)) return primary;
  const cfg = loadConfig();
  if (cfg.miseBinPath && fs.existsSync(cfg.miseBinPath)) return cfg.miseBinPath;
  return primary;
}

/** 辅助：如果统一主目录尚无 mise.exe，但系统已有，自动克隆部署一份 */
function ensureLocalMiseExe() {
  const targetExe = path.join(getMiseExeDir(), 'mise.exe');
  if (fs.existsSync(targetExe)) return targetExe;

  const fallbacks = [
    'C:\\Users\\ck\\.local\\bin\\mise.exe',
    'D:\\developmentTool\\mise\\bin\\mise.exe',
    path.join(os.homedir(), '.local', 'bin', 'mise.exe'),
  ];
  for (const src of fallbacks) {
    if (fs.existsSync(src)) {
      try {
        fs.mkdirSync(getMiseExeDir(), { recursive: true });
        fs.copyFileSync(src, targetExe);
        return targetExe;
      } catch (e) {}
    }
  }
  return targetExe;
}

/** 构建携带完整 mise 路径变量与代理的环境 */
function buildMiseEnv(overrides = {}) {
  const miseDataDir = getMiseDataDir();
  const miseBinDir  = getMiseBinDir();
  const miseExeDir  = getMiseExeDir();
  const cfg         = loadConfig();
  const proxy       = (cfg && cfg.proxy) || process.env.HTTP_PROXY || process.env.http_proxy || '';

  const proxyEnv = {};
  if (proxy && typeof proxy === 'string' && proxy.trim()) {
    const p = proxy.trim();
    proxyEnv.HTTP_PROXY = p;
    proxyEnv.HTTPS_PROXY = p;
    proxyEnv.ALL_PROXY = p;
    proxyEnv.http_proxy = p;
    proxyEnv.https_proxy = p;
    proxyEnv.all_proxy = p;
  }

  return {
    ...process.env,
    MISE_DATA_DIR: miseDataDir,
    MISE_BIN_DIR:  miseBinDir,
    MISE_INSTALL_DIR: miseExeDir,
    PATH: `${miseBinDir}${path.delimiter}${miseExeDir}${path.delimiter}${miseDataDir}${path.delimiter}${process.env.PATH || ''}`,
    ...proxyEnv,
    ...overrides,
  };
}

module.exports = {
  getUserDataDir,
  getConfigPath,
  loadConfig,
  saveConfig,
  getAppBaseDir,
  getMiseRootDir,
  getMiseDataDir,
  getMiseBinDir,
  getMiseExeDir,
  getMiseBinPath,
  ensureLocalMiseExe,
  buildMiseEnv,
};
