/**
 * Mise Manager — Electron 主进程入口中枢
 * 架构量化规范：模块化路由、流式子进程解耦
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

const { registerMiseExecIPC } = require('./src/main/ipc/miseExec');
const { registerMiseEnvIPC } = require('./src/main/ipc/miseEnv');
const { registerMarketIPC } = require('./src/main/ipc/market');
const { registerSystemIPC } = require('./src/main/ipc/system');

let mainWindow = null;

function getMainWindow() {
  return mainWindow;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 920,
    minHeight: 620,
    center: true,
    frame: false,
    transparent: false,
    backgroundColor: '#16192b',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
    titleBarStyle: 'hidden',
    show: false,
  });

  if (process.platform === 'win32') {
    try { mainWindow.setBackgroundMaterial('mica'); } catch (e) {}
  }

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  let isShown = false;
  const showSafely = () => {
    if (mainWindow && !isShown) {
      isShown = true;
      mainWindow.show();
      mainWindow.focus();
    }
  };

  mainWindow.once('ready-to-show', showSafely);
  mainWindow.webContents.once('did-finish-load', showSafely);
  setTimeout(showSafely, 250);

  if (process.argv.includes('--screenshot')) {
    mainWindow.webContents.once('did-finish-load', () => {
      runScreenshotAutomation();
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/** 自动化截取软件界面截图并输出到 docs/screenshots/ 目录 */
async function runScreenshotAutomation() {
  const screenshotsDir = path.join(__dirname, 'docs', 'screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await sleep(3500);

  let image = await mainWindow.webContents.capturePage();
  fs.writeFileSync(path.join(screenshotsDir, '01-home.png'), image.toPNG());

  await mainWindow.webContents.executeJavaScript(`navigateTo('market');`);
  await sleep(3500);
  image = await mainWindow.webContents.capturePage();
  fs.writeFileSync(path.join(screenshotsDir, '02-market.png'), image.toPNG());

  await mainWindow.webContents.executeJavaScript(`navigateTo('installed');`);
  await sleep(2500);
  image = await mainWindow.webContents.capturePage();
  fs.writeFileSync(path.join(screenshotsDir, '03-installed.png'), image.toPNG());

  await mainWindow.webContents.executeJavaScript(`navigateTo('settings');`);
  await sleep(2000);
  image = await mainWindow.webContents.capturePage();
  fs.writeFileSync(path.join(screenshotsDir, '04-settings.png'), image.toPNG());

  await mainWindow.webContents.executeJavaScript(`showReleasesModal();`);
  await sleep(3000);
  image = await mainWindow.webContents.capturePage();
  fs.writeFileSync(path.join(screenshotsDir, '05-releases-modal.png'), image.toPNG());

  await mainWindow.webContents.executeJavaScript(`
    closeReleasesModal();
    applyTheme('light');
    navigateTo('home');
  `);
  await sleep(2000);
  image = await mainWindow.webContents.capturePage();
  fs.writeFileSync(path.join(screenshotsDir, '06-home-light.png'), image.toPNG());

  await mainWindow.webContents.executeJavaScript(`applyTheme('dark');`);
  await sleep(500);

  app.quit();
}

// 注册所有模块化 IPC 路由
registerSystemIPC(getMainWindow);
registerMiseExecIPC(getMainWindow);
registerMiseEnvIPC();
registerMarketIPC(getMainWindow);

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

app.whenReady().then(() => {
  createWindow();
}).catch((err) => {
  console.error('whenReady ERROR:', err);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
