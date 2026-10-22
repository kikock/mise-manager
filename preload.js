const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露 API 给渲染进程
contextBridge.exposeInMainWorld('miseAPI', {
  // 窗口控制
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close:    () => ipcRenderer.invoke('window:close'),
  },

  // mise 操作
  mise: {
    check:   () => ipcRenderer.invoke('mise:check'),
    where:   (toolVersion) => ipcRenderer.invoke('mise:where', toolVersion),
    exec:    (args) => ipcRenderer.invoke('mise:exec', args),
    install: (options) => ipcRenderer.invoke('mise:install', options),
    uninstall: () => ipcRenderer.invoke('mise:uninstall'),
    onStream: (callback) => {
      ipcRenderer.on('mise:stream', (event, data) => callback(data));
    },
    removeStreamListener: () => {
      ipcRenderer.removeAllListeners('mise:stream');
    },
  },

  // Windows 环境变量管理
  env: {
    get:    () => ipcRenderer.invoke('env:get'),
    apply:  () => ipcRenderer.invoke('env:apply'),
    remove: () => ipcRenderer.invoke('env:remove'),
  },

  // 应用市场（官方 REST API + 本地缓存）
  market: {
    fetchTools:   (options) => ipcRenderer.invoke('market:fetchTools', options),
    fetchVersions: (toolName) => ipcRenderer.invoke('market:fetchVersions', toolName),
    getCacheInfo: () => ipcRenderer.invoke('market:getCacheInfo'),
    clearCache:   () => ipcRenderer.invoke('market:clearCache'),
    onProgress: (callback) => {
      ipcRenderer.on('market:progress', (event, data) => callback(data));
    },
    removeProgressListener: () => {
      ipcRenderer.removeAllListeners('market:progress');
    },
  },

  // 配置管理
  config: {
    get:   () => ipcRenderer.invoke('config:get'),
    set:   (data) => ipcRenderer.invoke('config:set', data),
    reset: () => ipcRenderer.invoke('config:reset'),
  },

  // 对话框
  dialog: {
    selectDir: () => ipcRenderer.invoke('dialog:selectDir'),
  },

  // 外部链接
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  },
});
