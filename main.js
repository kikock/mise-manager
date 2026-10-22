const fs = require('fs');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { spawn, exec, execFile } = require('child_process');
const path = require('path');
const os = require('os');

let mainWindow;

// ─────────────────────────────────────────────
// 安全获取用户数据目录（兼容 app.isReady 前后）
// ─────────────────────────────────────────────
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

/** 获取应用运行基础目录（已安装打包时为 exe 所在目录，开发时为当前项目根目录） */
function getAppBaseDir() {
  try {
    return app.isPackaged ? path.dirname(app.getPath('exe')) : path.resolve(__dirname);
  } catch (e) {
    return path.resolve(__dirname);
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
  return primary; // 默认规范入口
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

/** 构建携带完整 mise 路径变量的环境 */
function buildMiseEnv(overrides = {}) {
  const miseDataDir = getMiseDataDir();
  const miseBinDir  = getMiseBinDir(); // shims: .../data/shims
  const miseExeDir  = getMiseExeDir(); // bin: .../bin

  return {
    ...process.env,
    MISE_DATA_DIR: miseDataDir,
    MISE_BIN_DIR:  miseBinDir,
    MISE_INSTALL_DIR: miseExeDir,
    // 将 shims 和 bin 目录前置到 PATH
    PATH: `${miseBinDir}${path.delimiter}${miseExeDir}${path.delimiter}${miseDataDir}${path.delimiter}${process.env.PATH || ''}`,
    ...overrides,
  };
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
    show: false, // 首选隐藏，待渲染就绪后展示，消除白屏顿挫
  });

  // Windows 11 视觉优化
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

  // 渲染完成即刻展示
  mainWindow.once('ready-to-show', showSafely);
  mainWindow.webContents.once('did-finish-load', showSafely);
  // 250ms 超时安全兜底
  setTimeout(showSafely, 250);

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    console.error('页面加载失败:', code, desc);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

app.whenReady().then(() => {
  createWindow();
}).catch(err => {
  console.error('whenReady ERROR:', err);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// ─────────────────────────────────────────────
// IPC 处理器：窗口控制
// ─────────────────────────────────────────────
ipcMain.handle('window:minimize', () => mainWindow.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.restore();
  else mainWindow.maximize();
});
ipcMain.handle('window:close', () => mainWindow.close());

// ─────────────────────────────────────────────
// IPC 处理器：执行 mise 命令（同步，返回输出）
// ─────────────────────────────────────────────
ipcMain.handle('mise:exec', async (event, args) => {
  return new Promise((resolve, reject) => {
    const cmdArgs = Array.isArray(args) ? args : args.split(' ');
    const miseExe = getMiseBinPath();
    const proc = spawn(miseExe || 'mise', cmdArgs, {
      shell: true,
      env: buildMiseEnv(),
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      // 实时推送输出到渲染进程
      if (mainWindow) {
        mainWindow.webContents.send('mise:stream', data.toString());
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      if (mainWindow) {
        mainWindow.webContents.send('mise:stream', data.toString());
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        resolve({ success: false, output: stderr || stdout, code });
      }
    });

    proc.on('error', (err) => {
      resolve({ success: false, output: err.message, code: -1 });
    });
  });
});

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// IPC 处理器：检测 mise 是否已安装
// ─────────────────────────────────────────────
ipcMain.handle('mise:check', async () => {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (data) => {
      if (!resolved) {
        resolved = true;
        resolve(data);
      }
    };

    // 2.5 秒全局安全兜底超时，防止进程卡死
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

    const miseExe = getMiseBinPath();
    const env = buildMiseEnv();

    const testExe = (exePath) => {
      if (!fs.existsSync(exePath)) return false;
      try {
        execFile(exePath, ['--version'], { env, timeout: 1800 }, (err, stdout) => {
          clearTimeout(timer);
          if (!err && stdout && stdout.trim()) {
            finish({
              installed: true,
              version: stdout.trim().replace(/^mise\s*/i, ''),
              appBaseDir:  getAppBaseDir(),
              miseRootDir: getMiseRootDir(),
              miseDataDir: getMiseDataDir(),
              miseBinDir:  getMiseBinDir(),
              miseExeDir:  getMiseExeDir(),
              miseBinPath: exePath,
            });
          } else {
            finish({
              installed: false,
              version: null,
              appBaseDir:  getAppBaseDir(),
              miseRootDir: getMiseRootDir(),
              miseDataDir: getMiseDataDir(),
              miseBinDir:  getMiseBinDir(),
              miseExeDir:  getMiseExeDir(),
              miseBinPath: exePath,
            });
          }
        });
        return true;
      } catch (e) {
        return false;
      }
    };

    // 1. 优先检测主目录下的 mise.exe
    if (testExe(miseExe)) return;

    // 2. 兜底从系统已知路径克隆一份
    const localExe = ensureLocalMiseExe();
    if (testExe(localExe)) return;

    // 3. 确实未找到
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

// 查询工具版本实际安装物理路径
ipcMain.handle('mise:where', async (event, toolVersion) => {
  return new Promise((resolve) => {
    const miseExe = getMiseBinPath();
    if (!fs.existsSync(miseExe)) {
      return resolve({ found: false, path: null });
    }
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

// ─────────────────────────────────────────────
// IPC 处理器：扫描并获取所有已安装与启用的工具及其完整版本
// ─────────────────────────────────────────────
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

    // 辅助：从物理目录极速扫描工具与版本
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

    // 如果 mise.exe 物理文件都不存在，直接快速查物理目录
    if (!fs.existsSync(miseExe)) {
      return finish(scanPhysicalInstalls());
    }

    // 3 秒超时保障，超时后立即降级走物理目录
    const timer = setTimeout(() => {
      finish(scanPhysicalInstalls());
    }, 3000);

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
      } catch (e) {
        console.error('解析 mise ls JSON 失败:', e);
      }

      finish(scanPhysicalInstalls(toolsMap));
    });
  });
});

// ─────────────────────────────────────────────
// IPC 处理器：版本切换与激活 (mise use)
// ─────────────────────────────────────────────
ipcMain.handle('mise:use', async (event, { tool, version, isGlobal = true, cwd = null }) => {
  return new Promise((resolve) => {
    const miseExe = getMiseBinPath();
    const env = buildMiseEnv();
    const flag = isGlobal ? '-g' : '';
    const cmd = `"${miseExe}" use ${flag} ${tool}@${version}`;
    const execOpts = { shell: true, env };
    if (cwd && fs.existsSync(cwd)) {
      execOpts.cwd = cwd;
    }

    exec(cmd, execOpts, (err, stdout, stderr) => {
      const out = stdout || stderr || '';
      if (mainWindow) {
        mainWindow.webContents.send('mise:stream', `[mise use${cwd ? ` @ ${cwd}` : ''}] ${cmd}\r\n${out}\r\n`);
      }
      if (err) {
        resolve({ success: false, output: out, error: err.message });
      } else {
        resolve({ success: true, output: out });
      }
    });
  });
});

// ─────────────────────────────────────────────
// IPC 处理器：配置管理
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// IPC 处理器：打开目录选择对话框
// ─────────────────────────────────────────────
ipcMain.handle('dialog:selectDir', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择 mise 统一安装目录',
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

// ─────────────────────────────────────────────
// IPC 处理器：安装 mise（应用与数据同目录版）
// ─────────────────────────────────────────────
ipcMain.handle('mise:install', async (event, options = {}) => {
  const miseRootDir = options.miseRootDir || getMiseRootDir();
  const miseExeDir  = path.join(miseRootDir, 'bin');
  const miseDataDir = path.join(miseRootDir, 'data');
  const miseBinDir  = path.join(miseDataDir, 'shims');
  const targetExe   = path.join(miseExeDir, 'mise.exe');

  // 确保统一目录结构完整创建
  try { fs.mkdirSync(miseRootDir, { recursive: true }); } catch {}
  try { fs.mkdirSync(miseExeDir,  { recursive: true }); } catch {}
  try { fs.mkdirSync(miseDataDir, { recursive: true }); } catch {}
  try { fs.mkdirSync(miseBinDir,  { recursive: true }); } catch {}

  // 持久化保存统一根目录
  saveConfig({ miseRootDir, miseDataDir, miseBinDir });

  // 优先直接本地复制
  const existingExe = [
    'C:\\Users\\ck\\.local\\bin\\mise.exe',
    'D:\\developmentTool\\mise\\bin\\mise.exe',
    path.join(os.homedir(), '.local', 'bin', 'mise.exe')
  ].find(p => fs.existsSync(p));

  if (existingExe && !fs.existsSync(targetExe)) {
    try {
      fs.copyFileSync(existingExe, targetExe);
      if (mainWindow) {
        mainWindow.webContents.send('mise:stream', `✅ 已直接将现有 mise 程序部署到应用目录: ${targetExe}\r\n`);
      }
      return { success: true, localCopied: true };
    } catch (e) {}
  }

  return new Promise((resolve) => {
    const env = {
      ...process.env,
      MISE_DATA_DIR: miseDataDir,
      MISE_BIN_DIR:  miseBinDir,
      MISE_INSTALL_DIR: miseExeDir,
    };
    let ps;
    if (process.platform === 'win32') {
      ps = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:MISE_INSTALL_DIR='${miseExeDir}'; irm https://mise.run | iex"`;
    } else {
      ps = `MISE_INSTALL_DIR='${miseExeDir}' curl https://mise.run | sh`;
    }
    const proc = spawn(ps, [], { shell: true, env });

    proc.stdout.on('data', (data) => {
      if (mainWindow) mainWindow.webContents.send('mise:stream', data.toString());
    });
    proc.stderr.on('data', (data) => {
      if (mainWindow) mainWindow.webContents.send('mise:stream', data.toString());
    });
    proc.on('close', (code) => {
      resolve({ success: code === 0 || fs.existsSync(targetExe) });
    });
  });
});

// ─────────────────────────────────────────────
// IPC 处理器：卸载 mise（清除本地目录与关联数据）
// ─────────────────────────────────────────────
ipcMain.handle('mise:uninstall', async () => {
  try {
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

// ─────────────────────────────────────────────
// IPC 处理器：Windows 用户环境变量读取与配置
// 1. mise入口所在目录 (miseRootDir/bin)
// 2. MISE_BIN_DIR (miseRootDir/data/shims)
// 3. MISE_DATA_DIR (miseRootDir/data)
// ─────────────────────────────────────────────
ipcMain.handle('env:get', async () => {
  return new Promise((resolve) => {
    const ps = `powershell -NoProfile -Command "[PSCustomObject]@{ MISE_DATA_DIR = [Environment]::GetEnvironmentVariable('MISE_DATA_DIR', 'User'); MISE_BIN_DIR = [Environment]::GetEnvironmentVariable('MISE_BIN_DIR', 'User'); Path = [Environment]::GetEnvironmentVariable('Path', 'User') } | ConvertTo-Json"`;
    exec(ps, (err, stdout) => {
      try {
        const data = JSON.parse(stdout.trim());
        const exeDir  = getMiseExeDir();   // 1. mise入口目录
        const binDir  = getMiseBinDir();   // 2. MISE_BIN_DIR
        const dataDir = getMiseDataDir();  // 3. MISE_DATA_DIR
        const currentPath = data.Path || '';
        const pathParts = currentPath.split(';').map(p => p.trim().toLowerCase());

        resolve({
          success: true,
          currentDataDir: data.MISE_DATA_DIR || '',
          currentBinDir:  data.MISE_BIN_DIR || '',
          targetExeDir:   exeDir,
          targetBinDir:   binDir,
          targetDataDir:  dataDir,
          pathHasExeDir:  pathParts.includes(exeDir.toLowerCase()),
          pathHasBinDir:  pathParts.includes(binDir.toLowerCase()),
          pathHasDataDir: pathParts.includes(dataDir.toLowerCase()),
          dataDirMatched: (data.MISE_DATA_DIR || '').toLowerCase() === dataDir.toLowerCase(),
          binDirMatched:  (data.MISE_BIN_DIR || '').toLowerCase() === binDir.toLowerCase(),
        });
      } catch {
        resolve({ success: false });
      }
    });
  });
});

/** 安全执行 PowerShell 脚本（采用 UTF-16LE Base64 编码，杜绝反斜杠和转义字符问题） */
function runPowerShellScript(scriptText) {
  return new Promise((resolve) => {
    const b64 = Buffer.from(scriptText, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -EncodedCommand ${b64}`, (err, stdout, stderr) => {
      if (err) resolve({ success: false, error: stderr || err.message });
      else resolve({ success: true, output: (stdout || '').trim() });
    });
  });
}

// 一键同步写入 Windows 用户环境变量
ipcMain.handle('env:apply', async () => {
  const exeDir  = getMiseExeDir();
  const binDir  = getMiseBinDir();
  const dataDir = getMiseDataDir();

  const script = `
    $exeDir  = '${exeDir}';
    $binDir  = '${binDir}';
    $dataDir = '${dataDir}';

    [Environment]::SetEnvironmentVariable('MISE_DATA_DIR', $dataDir, 'User');
    [Environment]::SetEnvironmentVariable('MISE_BIN_DIR', $binDir, 'User');

    $currentPath = [Environment]::GetEnvironmentVariable('Path', 'User');
    $parts = @($currentPath -split ';') | Where-Object { 
      $_ -and $_.Trim() -and 
      ($_.Trim().ToLower() -notmatch 'developmenttool[\\\\/]mise') -and
      ($_.Trim().ToLower() -ne $exeDir.ToLower()) -and
      ($_.Trim().ToLower() -ne $binDir.ToLower()) -and
      ($_.Trim().ToLower() -ne $dataDir.ToLower())
    };

    $parts = @($exeDir, $binDir, $dataDir) + $parts;
    $newPath = $parts -join ';';
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User');
    Write-Output 'OK';
  `;

  const res = await runPowerShellScript(script);
  if (res.success) {
    return { success: true, exeDir, binDir, dataDir };
  } else {
    return { success: false, error: res.error };
  }
});

// 一键从 Windows 用户环境变量中清除
ipcMain.handle('env:remove', async () => {
  const exeDir  = getMiseExeDir();
  const binDir  = getMiseBinDir();
  const dataDir = getMiseDataDir();

  const script = `
    $exeDir  = '${exeDir}';
    $binDir  = '${binDir}';
    $dataDir = '${dataDir}';

    [Environment]::SetEnvironmentVariable('MISE_DATA_DIR', $null, 'User');
    [Environment]::SetEnvironmentVariable('MISE_BIN_DIR', $null, 'User');

    $currentPath = [Environment]::GetEnvironmentVariable('Path', 'User');
    $parts = @($currentPath -split ';') | Where-Object { 
      $_ -and $_.Trim() -and 
      ($_.Trim().ToLower() -ne $exeDir.ToLower()) -and
      ($_.Trim().ToLower() -ne $binDir.ToLower()) -and
      ($_.Trim().ToLower() -ne $dataDir.ToLower()) -and
      ($_.Trim().ToLower() -notmatch 'developmenttool[\\\\/]mise')
    };
    $newPath = $parts -join ';';
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User');
    Write-Output 'OK';
  `;

  const res = await runPowerShellScript(script);
  if (res.success) {
    return { success: true };
  } else {
    return { success: false, error: res.error };
  }
});

// ─────────────────────────────────────────────
// IPC 处理器：从官方 REST API 获取工具列表（支持分页全量拉取）
// API: https://mise-versions.jdx.dev/api/tools?page=N&limit=50
// ─────────────────────────────────────────────
function getMarketCachePath() {
  return path.join(getUserDataDir(), 'market_cache.json');
}

ipcMain.handle('market:fetchTools', async (event, options = {}) => {
  const { net } = require('electron');
  const useCache = options.useCache !== false;
  const cachePath = getMarketCachePath();

  // 尝试读取本地缓存
  if (useCache) {
    try {
      if (fs.existsSync(cachePath)) {
        const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
        const age = Date.now() - (cached.cachedAt || 0);
        if (age < 6 * 3600 * 1000) { // 6小时缓存
          return { success: true, tools: cached.tools, downloads: cached.downloads, fromCache: true, cachedAt: cached.cachedAt };
        }
      }
    } catch (e) {}
  }

  // 从官方 API 分页拉取全量数据
  try {
    let allTools = [];
    let allDownloads = {};
    let page = 1;
    let totalPages = 1;
    const limit = 50;

    do {
      const url = `https://mise-versions.jdx.dev/api/tools?page=${page}&limit=${limit}`;
      const resp = await net.fetch(url);
      if (!resp.ok) throw new Error(`API 请求失败: ${resp.status}`);
      const data = await resp.json();

      allTools = allTools.concat(data.tools || []);
      Object.assign(allDownloads, data.downloads || {});
      totalPages = data.total_pages || 1;

      // 推送进度到渲染进程
      if (mainWindow) {
        mainWindow.webContents.send('market:progress', {
          current: page, total: totalPages,
          count: allTools.length, totalCount: data.total_count
        });
      }
      page++;
    } while (page <= totalPages);

    // 写入本地缓存
    const cacheData = { tools: allTools, downloads: allDownloads, cachedAt: Date.now() };
    try { fs.writeFileSync(cachePath, JSON.stringify(cacheData)); } catch (e) {}

    return { success: true, tools: allTools, downloads: allDownloads, fromCache: false, total: allTools.length };
  } catch (e) {
    // API 失败时尝试返回旧缓存
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

// 清除市场缓存（强制重新拉取）
ipcMain.handle('market:clearCache', async () => {
  try {
    const cachePath = getMarketCachePath();
    fs.unlinkSync(cachePath);
    return true;
  } catch {
    return false;
  }
});

// 获取单个工具的版本列表（来自 mise ls-remote 命令）
ipcMain.handle('market:fetchVersions', async (event, toolName) => {
  return new Promise((resolve) => {
    const miseExe = getMiseBinPath();
    const proc = spawn(miseExe || 'mise', ['ls-remote', toolName], {
      shell: true, env: buildMiseEnv()
    });
    let out = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { out += d; });
    proc.on('close', code => {
      const versions = out.split('\n').map(v => v.trim()).filter(v => v && !v.startsWith('#')).reverse();
      resolve({ success: true, versions });
    });
    proc.on('error', () => resolve({ success: false, versions: [] }));
  });
});

// ─────────────────────────────────────────────
// IPC 处理器：打开外部链接与物理目录
// ─────────────────────────────────────────────
ipcMain.handle('shell:openExternal', async (event, url) => {
  if (!url || typeof url !== 'string') return false;
  const target = url.trim();
  // 安全校验协议
  if (!/^https?:\/\//i.test(target) && !target.startsWith('file://')) {
    return false;
  }

  // Windows 平台下如果使用 shell.openExternal，部分系统会因 COM/DDE 协商或安全软件拦截发生数秒延迟
  // 使用 cmd.exe /c start "" 异步分离子进程能实现毫秒级快速唤起外部浏览器
  if (process.platform === 'win32' && /^https?:\/\//i.test(target)) {
    try {
      const { spawn } = require('child_process');
      const child = spawn('cmd.exe', ['/c', 'start', '', target], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();
      return true;
    } catch (err) {
      console.warn('Windows 原生 start 唤起异常，回退至 shell.openExternal:', err);
    }
  }

  try {
    await shell.openExternal(target);
    return true;
  } catch (err) {
    console.error('shell.openExternal 失败:', err);
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

  if (!exists) {
    console.warn('shell:openPath 物理路径不存在:', targetPath);
    return false;
  }

  try {
    const err = await shell.openPath(targetPath);
    if (!err) return true;
    console.warn('shell.openPath 返回错误，尝试 explorer 回退:', err);
  } catch (e) {
    console.warn('shell.openPath 异常:', e);
  }

  // Windows 原生 explorer 回退，保障 100% 成功弹出资源管理器窗口
  if (process.platform === 'win32') {
    try {
      const { spawn } = require('child_process');
      const child = spawn('explorer.exe', [targetPath], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return true;
    } catch (e) {
      console.error('explorer 回退调用失败:', e);
    }
  }
  return false;
});

// ─────────────────────────────────────────────
// IPC 处理器：应用自身版本与在线更新检测
// ─────────────────────────────────────────────
function getAppVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

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
  const { net } = require('electron');
  const currentVersion = getAppVersion();
  const repo = 'kikock/mise-manager';

  try {
    const resp = await net.fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { 'User-Agent': 'Mise-Manager-Desktop' }
    });

    if (resp.status === 404) {
      return {
        success: true,
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        message: '当前已是最新版本（GitHub 仓库暂未发布更高 Release）',
        releasesUrl: `https://github.com/${repo}/releases`
      };
    }

    if (!resp.ok) {
      throw new Error(`GitHub API 响应异常: ${resp.status}`);
    }

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
      assets: (data.assets || []).map(a => ({
        name: a.name,
        size: a.size,
        downloadUrl: a.browser_download_url
      }))
    };
  } catch (e) {
    return {
      success: false,
      currentVersion,
      error: e.message,
      releasesUrl: `https://github.com/${repo}/releases`
    };
  }
});

function isNewerVersion(latest, current) {
  const parse = v => (v || '').split('.').map(n => parseInt(n, 10) || 0);
  const [l1, l2, l3] = parse(latest);
  const [c1, c2, c3] = parse(current);
  if (l1 > c1) return true;
  if (l1 === c1 && l2 > c2) return true;
  if (l1 === c1 && l2 === c2 && l3 > c3) return true;
  return false;
}

// 缓存历史版本数据（10分钟）
let releasesCache = { data: null, timestamp: 0 };

ipcMain.handle('app:getReleases', async () => {
  const currentVersion = getAppVersion();
  const repo = 'kikock/mise-manager';
  const now = Date.now();

  // 若存在有效缓存则秒级返回
  if (releasesCache.data && (now - releasesCache.timestamp < 10 * 60 * 1000)) {
    return { ...releasesCache.data, fromCache: true, currentVersion };
  }

  const { net } = require('electron');
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const resp = await net.fetch(`https://api.github.com/repos/${repo}/releases?per_page=15`, {
      headers: { 'User-Agent': 'Mise-Manager-Desktop' },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!resp.ok) throw new Error(`GitHub 响应异常: ${resp.status}`);

    const rawList = await resp.json();
    const releases = (Array.isArray(rawList) ? rawList : []).map(r => ({
      id: r.id,
      name: r.name || r.tag_name,
      tag: (r.tag_name || '').replace(/^v/i, '').trim(),
      tagName: r.tag_name,
      publishedAt: r.published_at,
      body: r.body || '',
      htmlUrl: r.html_url,
      isPrerelease: !!r.prerelease,
      assets: (r.assets || []).map(a => ({
        name: a.name,
        size: a.size,
        downloadCount: a.download_count,
        downloadUrl: a.browser_download_url
      }))
    }));

    const result = {
      success: true,
      currentVersion,
      releases,
      releasesUrl: `https://github.com/${repo}/releases`
    };
    releasesCache = { data: result, timestamp: now };
    return result;
  } catch (err) {
    return {
      success: false,
      currentVersion,
      error: err.name === 'AbortError' ? '请求超时，网络连接较慢' : (err.message || '网络连接异常'),
      cachedReleases: releasesCache.data?.releases || [],
      releasesUrl: `https://github.com/${repo}/releases`
    };
  }
});
