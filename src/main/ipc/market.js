/**
 * Mise Manager — 官方生态市场数据拉取与离线缓存模块
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { ipcMain, net } = require('electron');
const { getUserDataDir, getMiseBinPath, buildMiseEnv } = require('../config');

function getMarketCachePath() {
  return path.join(getUserDataDir(), 'market_cache.json');
}

function registerMarketIPC(getMainWindow) {
  // 从官方 REST API 分页拉取全量数据并缓存
  ipcMain.handle('market:fetchTools', async (event, options = {}) => {
    const useCache = options.useCache !== false;
    const cachePath = getMarketCachePath();

    if (useCache) {
      try {
        if (fs.existsSync(cachePath)) {
          const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
          const age = Date.now() - (cached.cachedAt || 0);
          if (age < 6 * 3600 * 1000) {
            return { success: true, tools: cached.tools, downloads: cached.downloads, fromCache: true, cachedAt: cached.cachedAt };
          }
        }
      } catch (e) {}
    }

    try {
      let allTools = [];
      let allDownloads = {};
      let page = 1;
      let totalPages = 1;
      const limit = 50;
      const win = getMainWindow();

      do {
        const url = `https://mise-versions.jdx.dev/api/tools?page=${page}&limit=${limit}`;
        const resp = await net.fetch(url);
        if (!resp.ok) throw new Error(`API 请求失败: ${resp.status}`);
        const data = await resp.json();

        allTools = allTools.concat(data.tools || []);
        Object.assign(allDownloads, data.downloads || {});
        totalPages = data.total_pages || 1;

        if (win) {
          win.webContents.send('market:progress', {
            current: page,
            total: totalPages,
            count: allTools.length,
            totalCount: data.total_count,
          });
        }
        page++;
      } while (page <= totalPages);

      const cacheData = { tools: allTools, downloads: allDownloads, cachedAt: Date.now() };
      try { fs.writeFileSync(cachePath, JSON.stringify(cacheData)); } catch (e) {}

      return { success: true, tools: allTools, downloads: allDownloads, fromCache: false, total: allTools.length };
    } catch (e) {
      try {
        if (fs.existsSync(cachePath)) {
          const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
          return { success: true, tools: cached.tools, downloads: cached.downloads, fromCache: true, stale: true, cachedAt: cached.cachedAt };
        }
      } catch {}
      return { success: false, tools: [], error: e.message };
    }
  });

  // 获取缓存信息
  ipcMain.handle('market:getCacheInfo', async () => {
    try {
      const cachePath = getMarketCachePath();
      if (fs.existsSync(cachePath)) {
        const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
        return { exists: true, cachedAt: cached.cachedAt, count: cached.tools?.length || 0 };
      }
    } catch {}
    return { exists: false };
  });

  // 清除市场缓存
  ipcMain.handle('market:clearCache', async () => {
    try {
      const cachePath = getMarketCachePath();
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      return true;
    } catch {
      return false;
    }
  });

  // 查询单个工具可用版本
  ipcMain.handle('market:fetchVersions', async (event, toolName) => {
    return new Promise((resolve) => {
      const miseExe = getMiseBinPath();
      const proc = spawn(miseExe || 'mise', ['ls-remote', toolName], {
        shell: true,
        env: buildMiseEnv(),
      });
      let out = '';
      proc.stdout.on('data', (d) => { out += d; });
      proc.stderr.on('data', (d) => { out += d; });
      proc.on('close', () => {
        const versions = out.split('\n').map(v => v.trim()).filter(v => v && !v.startsWith('#')).reverse();
        resolve({ success: true, versions });
      });
      proc.on('error', () => resolve({ success: false, versions: [] }));
    });
  });
}

module.exports = { registerMarketIPC };
