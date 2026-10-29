/**
 * Mise Manager — 系统窗口控制、配置与在线更新检测模块
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { ipcMain, shell, dialog, net } = require('electron');
const {
  loadConfig,
  saveConfig,
  getConfigPath,
  getAppBaseDir,
  getMiseRootDir,
  getMiseDataDir,
  getMiseBinDir,
  getMiseExeDir,
  getMiseBinPath,
} = require('../config');

function getAppVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'package.json'), 'utf-8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

function isNewerVersion(latest, current) {
  const parse = (v) => (v || '').split('.').map((n) => parseInt(n, 10) || 0);
  const [l1, l2, l3] = parse(latest);
  const [c1, c2, c3] = parse(current);
  if (l1 > c1) return true;
  if (l1 === c1 && l2 > c2) return true;
  if (l1 === c1 && l2 === c2 && l3 > c3) return true;
  return false;
}

let releasesCache = { data: null, timestamp: 0 };

function registerSystemIPC(getMainWindow) {
  // 窗口控制
  ipcMain.handle('window:minimize', () => {
    const win = getMainWindow();
    if (win) win.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    const win = getMainWindow();
    if (win) win.close();
  });

  // 配置操作
  ipcMain.handle('config:get', async () => {
    const cfg = loadConfig();
    return {
      ...cfg,
      appBaseDir:  getAppBaseDir(),
      miseRootDir: getMiseRootDir(),
      miseDataDir: getMiseDataDir(),
      miseBinDir:  getMiseBinDir(),
      miseExeDir:  getMiseExeDir(),
      miseBinPath: getMiseBinPath(),
    };
  });

  ipcMain.handle('config:set', async (event, data) => {
    return saveConfig(data);
  });

  ipcMain.handle('config:reset', async () => {
    try {
      fs.unlinkSync(getConfigPath());
      return true;
    } catch {
      return false;
    }
  });

  // 文件夹选择器
  ipcMain.handle('dialog:selectDir', async () => {
    const win = getMainWindow();
    const result = await dialog.showOpenDialog(win, {
      title: '选择 mise 统一安装目录',
      properties: ['openDirectory', 'createDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // 外部链接与文件夹定位
  ipcMain.handle('shell:openExternal', async (event, url) => {
    if (!url || typeof url !== 'string') return false;
    const target = url.trim();
    if (!/^https?:\/\//i.test(target) && !target.startsWith('file://')) return false;

    if (process.platform === 'win32' && /^https?:\/\//i.test(target)) {
      try {
        const child = spawn('cmd.exe', ['/c', 'start', '', target], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        });
        child.unref();
        return true;
      } catch (err) {}
    }

    try {
      await shell.openExternal(target);
      return true;
    } catch (err) {
      return false;
    }
  });

  ipcMain.handle('shell:openPath', async (event, fullPath) => {
    if (!fullPath || typeof fullPath !== 'string') return false;
    let targetPath = path.normalize(fullPath.trim());
    let exists = fs.existsSync(targetPath);
    if (!exists) {
      const parent = path.dirname(targetPath);
      if (fs.existsSync(parent)) {
        targetPath = parent;
        exists = true;
      }
    }
    if (!exists) return false;

    try {
      const err = await shell.openPath(targetPath);
      if (!err) return true;
    } catch (e) {}

    if (process.platform === 'win32') {
      try {
        const child = spawn('explorer.exe', [targetPath], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
        return true;
      } catch (e) {}
    }
    return false;
  });

  // 版本与更新
  ipcMain.handle('app:getVersion', () => {
    return {
      version: getAppVersion(),
      name: 'Mise Manager',
      electron: process.versions.electron,
      node: process.versions.node,
      platform: process.platform,
      arch: process.arch,
    };
  });

  ipcMain.handle('app:checkUpdate', async () => {
    const currentVersion = getAppVersion();
    const repo = 'kikock/mise-manager';

    try {
      const resp = await net.fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: { 'User-Agent': 'Mise-Manager-Desktop' },
      });

      if (resp.status === 404) {
        return {
          success: true,
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          message: '当前已是最新版本',
          releasesUrl: `https://github.com/${repo}/releases`,
        };
      }

      if (!resp.ok) throw new Error(`GitHub API 响应异常: ${resp.status}`);

      const data = await resp.json();
      const tag = (data.tag_name || '').replace(/^v/i, '').trim();
      const latestVersion = tag || currentVersion;
      const hasUpdate = isNewerVersion(latestVersion, currentVersion);

      return {
        success: true,
        hasUpdate,
        currentVersion,
        latestVersion,
        releaseName: data.name || data.tag_name,
        releaseNotes: data.body || '包含性能改进和稳定性优化。',
        publishedAt: data.published_at,
        downloadUrl: data.html_url || `https://github.com/${repo}/releases`,
        assets: (data.assets || []).map((a) => ({
          name: a.name,
          size: a.size,
          downloadUrl: a.browser_download_url,
        })),
      };
    } catch (e) {
      return {
        success: false,
        currentVersion,
        error: e.message,
        releasesUrl: `https://github.com/${repo}/releases`,
      };
    }
  });

  ipcMain.handle('app:getReleases', async () => {
    const currentVersion = getAppVersion();
    const repo = 'kikock/mise-manager';
    const now = Date.now();

    if (releasesCache.data && now - releasesCache.timestamp < 10 * 60 * 1000) {
      return { ...releasesCache.data, fromCache: true, currentVersion };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const resp = await net.fetch(`https://api.github.com/repos/${repo}/releases?per_page=15`, {
        headers: { 'User-Agent': 'Mise-Manager-Desktop' },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const list = await resp.json();
      const releases = (Array.isArray(list) ? list : []).map((r) => {
        const tag = (r.tag_name || '').replace(/^v/i, '').trim();
        return {
          id: r.id,
          tagName: r.tag_name,
          version: tag,
          name: r.name || r.tag_name,
          body: r.body || '',
          publishedAt: r.published_at,
          htmlUrl: r.html_url,
          isLatest: !r.prerelease && tag === list[0]?.tag_name?.replace(/^v/i, '').trim(),
          isCurrent: tag === currentVersion,
          isNewer: isNewerVersion(tag, currentVersion),
          assets: (r.assets || []).map((a) => ({
            name: a.name,
            size: a.size,
            downloadUrl: a.browser_download_url,
          })),
        };
      });

      const resData = { success: true, releases, currentVersion };
      releasesCache = { data: resData, timestamp: now };
      return resData;
    } catch (err) {
      if (releasesCache.data) {
        return { ...releasesCache.data, fromCache: true, stale: true, currentVersion };
      }
      return { success: false, error: err.message, currentVersion };
    }
  });
}

module.exports = { registerSystemIPC };
