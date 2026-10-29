/**
 * Mise Manager — Mise CLI 异步子进程与流式执行控制模块
 * 架构量化规范：Node.js 异步流式子进程 + 流背压分块控制 (Chunk <= 64KB)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn, exec, execFile } = require('child_process');
const { ipcMain } = require('electron');
const {
  getAppBaseDir,
  getMiseRootDir,
  getMiseDataDir,
  getMiseBinDir,
  getMiseExeDir,
  getMiseBinPath,
  ensureLocalMiseExe,
  buildMiseEnv,
  saveConfig,
} = require('../config');

let currentExecProc = null;
let miseCheckMemoryCache = null;
const MAX_CHUNK_SIZE = 64 * 1024; // 64KB 分块上限

/** 流背压与分块推送助手，防止大块输出堵塞渲染管线 */
function sendStreamChunk(getMainWindow, chunk) {
  const win = getMainWindow();
  if (!win || !chunk) return;
  const str = typeof chunk === 'string' ? chunk : chunk.toString();
  if (str.length <= MAX_CHUNK_SIZE) {
    win.webContents.send('mise:stream', str);
  } else {
    for (let i = 0; i < str.length; i += MAX_CHUNK_SIZE) {
      win.webContents.send('mise:stream', str.substring(i, i + MAX_CHUNK_SIZE));
    }
  }
}

function registerMiseExecIPC(getMainWindow) {
  // 执行 mise 命令
  ipcMain.handle('mise:exec', async (event, args) => {
    return new Promise((resolve) => {
      const cmdArgs = Array.isArray(args) ? args : String(args).split(' ');
      const miseExe = getMiseBinPath();

      if (currentExecProc) {
        try {
          if (process.platform === 'win32' && currentExecProc.pid) {
            exec(`taskkill /pid ${currentExecProc.pid} /f /t`);
          } else {
            currentExecProc.kill('SIGKILL');
          }
        } catch (e) {}
        currentExecProc = null;
      }

      const proc = spawn(miseExe || 'mise', cmdArgs, {
        shell: true,
        env: buildMiseEnv(),
      });
      currentExecProc = proc;

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        sendStreamChunk(getMainWindow, data);
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        sendStreamChunk(getMainWindow, data);
      });

      const cleanup = () => {
        if (currentExecProc === proc) currentExecProc = null;
      };

      proc.on('close', (code) => {
        cleanup();
        miseCheckMemoryCache = null;
        if (code === 0) {
          resolve({ success: true, output: stdout });
        } else {
          resolve({ success: false, output: stderr || stdout, code });
        }
      });

      proc.on('error', (err) => {
        cleanup();
        resolve({ success: false, output: err.message, code: -1 });
      });
    });
  });

  // 中断当前正在执行的 mise 子进程
  ipcMain.handle('mise:abortExec', async () => {
    if (currentExecProc) {
      try {
        const pid = currentExecProc.pid;
        if (process.platform === 'win32' && pid) {
          exec(`taskkill /pid ${pid} /f /t`);
        } else {
          currentExecProc.kill('SIGKILL');
        }
        currentExecProc = null;
        return { success: true, message: '进程已成功终止' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: true, message: '当前无正在运行的进程' };
  });

  // 读取与设置 mise 运行设定项
  ipcMain.handle('mise:getSettings', async () => {
    return new Promise((resolve) => {
      const miseExe = getMiseBinPath();
      if (!fs.existsSync(miseExe)) {
        return resolve({ success: false, not_found_auto_install: false, auto_install: true });
      }
      execFile(miseExe, ['settings', '--all', '--json'], { env: buildMiseEnv() }, (err, stdout) => {
        try {
          const data = JSON.parse(stdout || '{}');
          resolve({
            success: true,
            not_found_auto_install: !!data.not_found_auto_install,
            auto_install: data.auto_install !== false,
            exec_auto_install: data.exec_auto_install !== false,
          });
        } catch {
          resolve({ success: false, not_found_auto_install: false, auto_install: true });
        }
      });
    });
  });

  ipcMain.handle('mise:setSetting', async (event, { key, value }) => {
    return new Promise((resolve) => {
      const miseExe = getMiseBinPath();
      if (!fs.existsSync(miseExe)) {
        return resolve({ success: false, error: 'mise.exe 不存在' });
      }
      execFile(miseExe, ['settings', 'set', key, String(value)], { env: buildMiseEnv() }, (err, stdout, stderr) => {
        if (err) {
          resolve({ success: false, error: stderr || err.message });
        } else {
          resolve({ success: true, output: (stdout || '').trim() });
        }
      });
    });
  });

  // 一键全量安装声明工具
  ipcMain.handle('mise:installAll', async () => {
    return new Promise((resolve) => {
      const miseExe = getMiseBinPath();
      const proc = spawn(miseExe, ['install', '-y'], {
        shell: true,
        env: buildMiseEnv(),
      });
      let output = '';
      proc.stdout.on('data', (d) => {
        output += d.toString();
        sendStreamChunk(getMainWindow, d);
      });
      proc.stderr.on('data', (d) => {
        output += d.toString();
        sendStreamChunk(getMainWindow, d);
      });
      proc.on('close', (code) => {
        resolve({ success: code === 0, output });
      });
    });
  });

  // 检测 mise 是否已安装
  ipcMain.handle('mise:check', async (event, forceRefresh = false) => {
    return new Promise((resolve) => {
      const miseExe = getMiseBinPath();

      if (!forceRefresh && miseCheckMemoryCache && fs.existsSync(miseExe)) {
        try {
          const stat = fs.statSync(miseExe);
          if (stat.mtimeMs === miseCheckMemoryCache.mtimeMs && stat.size === miseCheckMemoryCache.size) {
            return resolve(miseCheckMemoryCache.data);
          }
        } catch (e) {}
      }

      let resolved = false;
      const finish = (data) => {
        if (!resolved) {
          resolved = true;
          if (data && data.installed && fs.existsSync(miseExe)) {
            try {
              const stat = fs.statSync(miseExe);
              miseCheckMemoryCache = { mtimeMs: stat.mtimeMs, size: stat.size, data };
            } catch (e) {}
          }
          resolve(data);
        }
      };

      const timer = setTimeout(() => {
        finish({
          installed: false,
          version: null,
          appBaseDir:  getAppBaseDir(),
          miseRootDir: getMiseRootDir(),
          miseDataDir: getMiseDataDir(),
          miseBinDir:  getMiseBinDir(),
          miseExeDir:  getMiseExeDir(),
          miseBinPath: getMiseBinPath(),
        });
      }, 2500);

      const env = buildMiseEnv();
      const testExe = (exePath) => {
        if (!fs.existsSync(exePath)) return false;
        try {
          execFile(exePath, ['--version'], { env, timeout: 1800 }, (err, stdout) => {
            clearTimeout(timer);
            const isOk = !err && stdout && stdout.trim();
            finish({
              installed: isOk,
              version: isOk ? stdout.trim().replace(/^mise\s*/i, '') : null,
              appBaseDir:  getAppBaseDir(),
              miseRootDir: getMiseRootDir(),
              miseDataDir: getMiseDataDir(),
              miseBinDir:  getMiseBinDir(),
              miseExeDir:  getMiseExeDir(),
              miseBinPath: exePath,
            });
          });
          return true;
        } catch (e) {
          return false;
        }
      };

      if (testExe(miseExe)) return;
      const localExe = ensureLocalMiseExe();
      if (testExe(localExe)) return;

      clearTimeout(timer);
      finish({
        installed: false,
        version: null,
        appBaseDir:  getAppBaseDir(),
        miseRootDir: getMiseRootDir(),
        miseDataDir: getMiseDataDir(),
        miseBinDir:  getMiseBinDir(),
        miseExeDir:  getMiseExeDir(),
        miseBinPath: miseExe,
      });
    });
  });

  // 查询实际安装物理路径
  ipcMain.handle('mise:where', async (event, toolVersion) => {
    return new Promise((resolve) => {
      const miseExe = getMiseBinPath();
      if (!fs.existsSync(miseExe)) return resolve({ found: false, path: null });
      const [tool, ver] = String(toolVersion).split('@');
      const args = ver ? ['where', `${tool}@${ver}`] : ['where', tool];
      execFile(miseExe, args, { env: buildMiseEnv(), timeout: 2000 }, (err, stdout) => {
        if (err || !stdout || !stdout.trim()) {
          resolve({ found: false, path: null });
        } else {
          const p = stdout.trim();
          resolve({ found: fs.existsSync(p), path: p });
        }
      });
    });
  });

  // 扫描已安装工具
  ipcMain.handle('mise:listInstalled', async () => {
    return new Promise((resolve) => {
      const miseExe = getMiseBinPath();
      const env = buildMiseEnv();
      const dataDir = getMiseDataDir();
      const installsDir = path.join(dataDir, 'installs');

      let isDone = false;
      const finish = (resultList) => {
        if (!isDone) {
          isDone = true;
          resolve({ success: true, tools: resultList, count: resultList.length });
        }
      };

      const scanPhysicalInstalls = (toolsMap = {}) => {
        if (fs.existsSync(installsDir)) {
          try {
            const toolDirs = fs.readdirSync(installsDir, { withFileTypes: true });
            for (const tDir of toolDirs) {
              if (!tDir.isDirectory()) continue;
              const toolName = tDir.name;
              if (!toolsMap[toolName]) toolsMap[toolName] = [];
              const toolSubDir = path.join(installsDir, toolName);
              const verDirs = fs.readdirSync(toolSubDir, { withFileTypes: true });
              for (const vDir of verDirs) {
                if (!vDir.isDirectory()) continue;
                const vName = vDir.name;
                const existing = toolsMap[toolName].find(x => x.version === vName);
                if (!existing) {
                  toolsMap[toolName].push({
                    version: vName,
                    installPath: path.join(toolSubDir, vName),
                    installed: true,
                    active: false,
                    source: null,
                    requestedVersion: null,
                  });
                }
              }
            }
          } catch (e) {
            console.error('扫描物理 installs 目录异常:', e);
          }
        }

        return Object.keys(toolsMap).sort().map(toolName => {
          const versions = toolsMap[toolName];
          const activeVerObj = versions.find(v => v.active);
          return {
            name: toolName,
            activeVersion: activeVerObj ? activeVerObj.version : null,
            versions: versions.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true })),
          };
        });
      };

      if (!fs.existsSync(miseExe)) return finish(scanPhysicalInstalls());

      const timer = setTimeout(() => finish(scanPhysicalInstalls()), 3000);

      execFile(miseExe, ['ls', '--installed', '--json'], { env, timeout: 2800, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
        clearTimeout(timer);
        const toolsMap = {};
        try {
          if (!err && stdout && stdout.trim()) {
            const raw = JSON.parse(stdout.trim());
            for (const [toolName, versionsList] of Object.entries(raw)) {
              if (!Array.isArray(versionsList)) continue;
              toolsMap[toolName] = versionsList.map(v => ({
                version: v.version,
                installPath: v.install_path || path.join(installsDir, toolName, v.version),
                installed: v.installed !== false,
                active: !!v.active,
                source: v.source?.path || null,
                requestedVersion: v.requested_version || null,
              }));
            }
          }
        } catch (e) {}
        finish(scanPhysicalInstalls(toolsMap));
      });
    });
  });

  // 版本切换与激活
  ipcMain.handle('mise:use', async (event, { tool, version, isGlobal = true, cwd = null }) => {
    return new Promise((resolve) => {
      const miseExe = getMiseBinPath();
      const flag = isGlobal ? '-g' : '';
      const cmd = `"${miseExe}" use ${flag} ${tool}@${version}`;
      const execOpts = { shell: true, env: buildMiseEnv() };
      if (cwd && fs.existsSync(cwd)) execOpts.cwd = cwd;

      exec(cmd, execOpts, (err, stdout, stderr) => {
        const out = stdout || stderr || '';
        sendStreamChunk(getMainWindow, `[mise use${cwd ? ` @ ${cwd}` : ''}] ${cmd}\r\n${out}\r\n`);
        if (err) {
          resolve({ success: false, output: out, error: err.message });
        } else {
          resolve({ success: true, output: out });
        }
      });
    });
  });

  // 安装 mise
  ipcMain.handle('mise:install', async (event, options = {}) => {
    const miseRootDir = options.miseRootDir || getMiseRootDir();
    const miseExeDir  = path.join(miseRootDir, 'bin');
    const miseDataDir = path.join(miseRootDir, 'data');
    const miseBinDir  = path.join(miseDataDir, 'shims');
    const targetExe   = path.join(miseExeDir, 'mise.exe');

    try { fs.mkdirSync(miseRootDir, { recursive: true }); } catch {}
    try { fs.mkdirSync(miseExeDir,  { recursive: true }); } catch {}
    try { fs.mkdirSync(miseDataDir, { recursive: true }); } catch {}
    try { fs.mkdirSync(miseBinDir,  { recursive: true }); } catch {}

    saveConfig({ miseRootDir, miseDataDir, miseBinDir });
    miseCheckMemoryCache = null;

    const existingExe = [
      'C:\\Users\\ck\\.local\\bin\\mise.exe',
      'D:\\developmentTool\\mise\\bin\\mise.exe',
      path.join(require('os').homedir(), '.local', 'bin', 'mise.exe'),
    ].find(p => fs.existsSync(p));

    if (existingExe && !fs.existsSync(targetExe)) {
      try {
        fs.copyFileSync(existingExe, targetExe);
        sendStreamChunk(getMainWindow, `✅ 已直接将现有 mise 程序部署到应用目录: ${targetExe}\r\n`);
        return { success: true, localCopied: true };
      } catch (e) {}
    }

    return new Promise((resolve) => {
      const env = { ...process.env, MISE_DATA_DIR: miseDataDir, MISE_BIN_DIR: miseBinDir, MISE_INSTALL_DIR: miseExeDir };
      const ps = process.platform === 'win32'
        ? `powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:MISE_INSTALL_DIR='${miseExeDir}'; irm https://mise.run | iex"`
        : `MISE_INSTALL_DIR='${miseExeDir}' curl https://mise.run | sh`;

      const proc = spawn(ps, [], { shell: true, env });
      proc.stdout.on('data', (data) => sendStreamChunk(getMainWindow, data));
      proc.stderr.on('data', (data) => sendStreamChunk(getMainWindow, data));
      proc.on('close', (code) => {
        resolve({ success: code === 0 || fs.existsSync(targetExe) });
      });
    });
  });

  // 卸载 mise
  ipcMain.handle('mise:uninstall', async () => {
    try {
      miseCheckMemoryCache = null;
      const miseRootDir = getMiseRootDir();
      if (fs.existsSync(miseRootDir)) {
        fs.rmSync(miseRootDir, { recursive: true, force: true });
      }
      saveConfig({ miseRootDir: undefined, miseDataDir: undefined, miseBinDir: undefined });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

module.exports = { registerMiseExecIPC };
