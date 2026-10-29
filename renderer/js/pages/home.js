/**
 * Mise Manager — 首页逻辑模块 (pages/home.js)
 * 职责：mise 运行时状态检测、已安装快览、一键安装与自升级控制
 */

'use strict';

/** 快速从本地缓存恢复上次成功状态（秒开策略，消除白屏等待） */
function restoreCachedState() {
  try {
    const rawStatus = localStorage.getItem('mise_cache_status');
    if (rawStatus) {
      const cached = JSON.parse(rawStatus);
      if (cached && typeof cached.installed === 'boolean') {
        AppState.miseInstalled = cached.installed;
        AppState.miseVersion = cached.version;
        AppState.miseDataDir = cached.miseDataDir || '';
        renderMiseStatus(cached, true);
        updateStatusBar(cached);
      }
    }

    const rawTools = localStorage.getItem('mise_cache_installed');
    if (rawTools) {
      const tools = JSON.parse(rawTools);
      if (Array.isArray(tools) && tools.length > 0) {
        AppState.installedTools = tools;
        renderHomeToolsCards(tools, true);
      }
    }
  } catch (e) {
    // 忽略异常，平滑回退
  }
}
window.restoreCachedState = restoreCachedState;

/** 检测 mise 运行状态与配置路径 */
async function checkMiseStatus(forceRefresh = false) {
  try {
    const [cfg, result] = await Promise.all([
      window.miseAPI.config.get().catch(() => ({})),
      window.miseAPI.mise.check(forceRefresh).catch(() => ({ installed: false })),
    ]);

    AppState.miseDataDir = cfg.miseDataDir || result.miseDataDir || '';
    AppState.miseBinDir = cfg.miseBinDir || result.miseBinDir || '';
    AppState.miseBinPath = cfg.miseBinPath || result.miseBinPath || '';
    AppState.miseInstalled = !!result.installed;
    AppState.miseVersion = result.version;

    try {
      localStorage.setItem('mise_cache_status', JSON.stringify({
        installed: AppState.miseInstalled,
        version: AppState.miseVersion,
        miseDataDir: AppState.miseDataDir,
      }));
    } catch (e) {}

    const installPreview = document.getElementById('install-dir-preview');
    if (installPreview) installPreview.textContent = AppState.miseDataDir || '正在初始化默认目录...';

    const miseDirDisplay = document.getElementById('mise-dir-display');
    if (miseDirDisplay) miseDirDisplay.textContent = AppState.miseDataDir || '-';

    renderMiseStatus(result);
    updateStatusBar(result);
  } catch (err) {
    console.error('checkMiseStatus 异常:', err);
  }
}
window.checkMiseStatus = checkMiseStatus;

/** 渲染 mise 运行状态卡片 */
function renderMiseStatus({ installed, version }, isCached = false) {
  const content = document.getElementById('mise-status-content');
  const quickActions = document.getElementById('quick-actions');
  const cardInstall = document.getElementById('card-install-mise');
  const cardUpgrade = document.getElementById('card-upgrade-mise');
  const cardConfig = document.getElementById('card-open-config');

  if (quickActions) quickActions.style.display = 'grid';

  if (installed) {
    if (content) {
      content.innerHTML = `
        <div class="status-card">
          <div class="status-icon-wrap installed">✅</div>
          <div class="status-info">
            <div class="status-label">mise 运行时已就绪 ${isCached ? '<span style="font-size:11px;opacity:0.75">(快照)</span>' : ''}</div>
            <div class="status-value">版本: ${escapeHtml(version || '未知')}</div>
            <div class="status-sub">工作目录: ${escapeHtml(AppState.miseDataDir || '默认')}</div>
          </div>
          <div class="flex gap-8">
            <span class="badge badge-success">运行正常</span>
          </div>
        </div>`;
    }
    if (cardInstall) cardInstall.style.display = 'none';
    if (cardUpgrade) cardUpgrade.style.display = 'block';
    if (cardConfig) cardConfig.style.display = 'block';
  } else {
    if (content) {
      content.innerHTML = `
        <div class="status-card">
          <div class="status-icon-wrap not-installed">⚠️</div>
          <div class="status-info">
            <div class="status-label">未检测到 mise 核心组件</div>
            <div class="status-value">尚未安装</div>
            <div class="status-sub">可直接一键安装到应用程序默认目录，也可先自定义路径</div>
          </div>
          <span class="badge badge-warning">待安装</span>
        </div>`;
    }
    if (cardInstall) cardInstall.style.display = 'block';
    if (cardUpgrade) cardUpgrade.style.display = 'none';
    if (cardConfig) cardConfig.style.display = 'none';
  }

  loadHomeTools(isCached);
}
window.renderMiseStatus = renderMiseStatus;

/** 更新底部状态栏运行指示灯 */
function updateStatusBar({ installed, version }) {
  const dot = document.getElementById('status-mise-dot');
  const text = document.getElementById('status-mise-text');
  if (installed) {
    if (dot) dot.className = 'status-dot online';
    if (text) text.textContent = `mise ${version || ''}`;
  } else {
    if (dot) dot.className = 'status-dot offline';
    if (text) text.textContent = 'mise 未就绪';
  }
}
window.updateStatusBar = updateStatusBar;

/** 渲染首页工具卡片集合 */
function renderHomeToolsCards(tools, isFromCache = false) {
  const grid = document.getElementById('home-tools-grid');
  const subtitle = document.getElementById('home-tools-subtitle');
  if (!grid || !subtitle) return;

  const totalVersions = tools.reduce((sum, t) => sum + (t.versions ? t.versions.length : 1), 0);
  subtitle.textContent = isFromCache
    ? `已就绪 ${tools.length} 个工具 (正在核验实时状态...)`
    : `已扫描到 ${tools.length} 个开发工具，共 ${totalVersions} 个本地版本`;

  const countBadge = document.getElementById('installed-count');
  if (countBadge) {
    countBadge.textContent = tools.length;
    countBadge.style.display = tools.length > 0 ? '' : 'none';
  }

  if (tools.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:24px">
      <div class="empty-icon">🛠️</div>
      <div class="empty-title">暂未安装任何开发工具</div>
      <div class="empty-desc">前往应用市场即可一键安装 Node.js, Python, Go, Rust 等</div>
    </div>`;
    return;
  }

  grid.innerHTML = tools.slice(0, 8).map(t => {
    const activeVer = t.activeVersion;
    const verCount = t.versions ? t.versions.length : 1;
    return `
    <div class="tool-card" style="cursor:pointer;padding:14px" onclick="navigateTo('installed')">
      <div class="flex gap-10" style="align-items:center">
        <span style="font-size:24px">${getToolEmoji(t.name)}</span>
        <div style="flex:1;min-width:0">
          <div class="tool-name" style="font-size:14px">${escapeHtml(t.name)}</div>
          <div class="tool-version" style="font-size:12px;color:${activeVer ? 'var(--accent)' : 'var(--text-tertiary)'}">
            ${activeVer ? `当前激活: ${escapeHtml(activeVer)}` : '未激活 (点击配置)'}
          </div>
        </div>
        <span class="badge ${activeVer ? 'badge-success' : 'badge-neutral'}" style="font-size:10.5px">
          ${verCount} 个版本
        </span>
      </div>
    </div>`;
  }).join('');
}
window.renderHomeToolsCards = renderHomeToolsCards;

/** 首页已安装工具快照加载 */
async function loadHomeTools(isCached = false) {
  const grid = document.getElementById('home-tools-grid');
  const subtitle = document.getElementById('home-tools-subtitle');

  if (!AppState.miseInstalled) {
    if (grid) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:24px">
        <div class="empty-icon">📦</div>
        <div class="empty-title">mise 尚未安装</div>
        <div class="empty-desc">安装 mise 后将在此显示全局与本地工具</div>
      </div>`;
    }
    if (subtitle) subtitle.textContent = '未安装 mise';
    return;
  }

  if (!AppState.installedTools || AppState.installedTools.length === 0) {
    if (grid) {
      grid.innerHTML = `
        <div class="skeleton" style="height:76px;border-radius:12px"></div>
        <div class="skeleton" style="height:76px;border-radius:12px"></div>
        <div class="skeleton" style="height:76px;border-radius:12px"></div>
      `;
    }
    if (subtitle) subtitle.textContent = '正在检测已安装工具...';
  }

  try {
    const res = await window.miseAPI.mise.listInstalled();
    const tools = res.success ? (res.tools || []) : [];
    AppState.installedTools = tools;

    try {
      localStorage.setItem('mise_cache_installed', JSON.stringify(tools));
    } catch (e) {}

    renderHomeToolsCards(tools, false);
  } catch (e) {
    console.error('获取已安装工具失败:', e);
  }
}
window.loadHomeTools = loadHomeTools;

/** 一键安装 mise 核心组件并进行自动环境初始化 */
async function installMise() {
  const btn = document.getElementById('btn-install-mise');
  const termWrap = document.getElementById('home-terminal-wrap');
  const termOut = document.getElementById('home-terminal-output');

  btn.classList.add('loading');
  btn.textContent = '正在安装...';
  clearTerminal(termOut, termWrap);

  window.miseAPI.mise.onStream((data) => {
    appendTerminal(termOut, data);
  });

  const result = await window.miseAPI.mise.install({
    miseDataDir: AppState.miseDataDir,
    miseBinDir:  AppState.miseBinDir
  });

  window.miseAPI.mise.removeStreamListener();
  btn.classList.remove('loading');
  btn.textContent = '🚀 立即安装 mise';

  if (result.success) {
    const autoApplyEnv = document.getElementById('chk-auto-apply-env')?.checked ?? true;
    const autoActivatePwsh = document.getElementById('chk-auto-activate-pwsh')?.checked ?? true;

    if (autoApplyEnv) {
      appendTerminal(termOut, '\r\n⏳ 正在自动配置 Windows 环境变量与 Shims 垫片...\r\n');
      try {
        const envRes = await window.miseAPI.env.apply();
        if (envRes && envRes.success) {
          appendTerminal(termOut, '✅ 已自动激活 CMD 与通用终端环境变量\r\n');
        }
      } catch (e) {
        appendTerminal(termOut, `⚠️ 自动配置环境变量异常: ${e.message}\r\n`);
      }
    }

    if (autoActivatePwsh) {
      appendTerminal(termOut, '⏳ 正在自动配置 PowerShell Profile 激活脚本...\r\n');
      try {
        const pwshRes = await window.miseAPI.env.applyPwshProfile();
        if (pwshRes && pwshRes.success) {
          appendTerminal(termOut, '✅ 已自动激活 PowerShell 终端\r\n');
        }
      } catch (e) {
        appendTerminal(termOut, `⚠️ 自动配置 PowerShell Profile 异常: ${e.message}\r\n`);
      }
    }

    showToast('mise 安装成功！已完成自动激活配置。', 'success');
    await checkMiseStatus();
    if (window.checkEnvStatus) await window.checkEnvStatus();
  } else {
    showToast('安装未完成，请检查网络或终端输出日志', 'error');
  }
}
window.installMise = installMise;

let isUpgradingMise = false;

/** 升级 mise 核心程序 */
async function upgradeMise() {
  if (isUpgradingMise) return;
  const btn = document.getElementById('btn-upgrade-mise');
  const termWrap = document.getElementById('home-terminal-wrap');
  const termOut = document.getElementById('home-terminal-output');
  const progressWrap = document.getElementById('upgrade-progress-wrap');
  const progressStatus = document.getElementById('upgrade-progress-status');
  const progressPercent = document.getElementById('upgrade-progress-percent');
  const progressFill = document.getElementById('upgrade-progress-fill');
  const progressDetail = document.getElementById('upgrade-progress-detail');
  const btnCancel = document.getElementById('btn-cancel-upgrade');

  isUpgradingMise = true;
  btn.classList.add('loading');
  btn.textContent = '升级中...';
  btn.disabled = true;

  if (progressWrap) progressWrap.style.display = 'block';
  if (progressPercent) progressPercent.textContent = '5%';
  if (progressFill) progressFill.style.width = '5%';
  if (progressStatus) progressStatus.textContent = '正在启动升级任务...';
  if (progressDetail) progressDetail.textContent = '正在连接 GitHub 发行源...';

  clearTerminal(termOut, termWrap);
  if (termWrap) termWrap.style.display = 'block';

  let currentPercent = 5;
  const updateProgress = (pct, statusText, detailText) => {
    if (pct > currentPercent) {
      currentPercent = Math.min(pct, 98);
      if (progressPercent) progressPercent.textContent = `${Math.round(currentPercent)}%`;
      if (progressFill) progressFill.style.width = `${currentPercent}%`;
    }
    if (statusText && progressStatus) progressStatus.textContent = statusText;
    if (detailText && progressDetail) progressDetail.textContent = detailText;
  };

  let userAborted = false;
  if (btnCancel) {
    btnCancel.onclick = async () => {
      userAborted = true;
      if (progressStatus) progressStatus.textContent = '正在中止升级任务...';
      appendTerminal(termOut, '\r\n⚠️ 用户手动中止了升级操作。\r\n');
      try {
        await window.miseAPI.mise.abortExec();
      } catch (e) {}
    };
  }

  window.miseAPI.mise.onStream((data) => {
    appendTerminal(termOut, data);
    const text = String(data).toLowerCase();
    if (text.includes('checking') || text.includes('version')) {
      updateProgress(25, '正在检查最新版本与下载源...', '已连接 GitHub 仓库，正在检索构建...');
    } else if (text.includes('downloading') || text.includes('.zip') || text.includes('.tar.gz')) {
      updateProgress(55, '正在下载最新构建资产...', '正在拉取 mise 预编译二进制组件...');
    } else if (text.includes('extracting') || text.includes('replacing') || text.includes('upgrading')) {
      updateProgress(85, '正在解压并更新 mise 核心...', '解压资源并替换可执行程序...');
    } else if (text.includes('updated mise to') || text.includes('already up to date')) {
      updateProgress(100, '升级已完成！', '核心程序已更新至最新稳定版。');
    }
  });

  let timeoutTriggered = false;
  const timer = setTimeout(async () => {
    if (isUpgradingMise) {
      timeoutTriggered = true;
      appendTerminal(termOut, '\r\n⚠️ 升级任务超过 120 秒无响应，已自动保护性终止。\r\n');
      try {
        await window.miseAPI.mise.abortExec();
      } catch (e) {}
    }
  }, 120000);

  let result;
  try {
    result = await window.miseAPI.mise.exec(['self-update', '-y']);
  } catch (err) {
    result = { success: false, output: err.message };
  } finally {
    clearTimeout(timer);
    window.miseAPI.mise.removeStreamListener();
    isUpgradingMise = false;
    btn.classList.remove('loading');
    btn.textContent = '⬆️ 升级到最新版本';
    btn.disabled = false;
  }

  if (userAborted) {
    if (progressWrap) progressWrap.style.display = 'none';
    showToast('已取消升级任务', 'info');
    return;
  }

  if (timeoutTriggered) {
    showToast('升级超时，建议在设置中配置代理后重试', 'error');
    return;
  }

  if (result.success) {
    if (progressPercent) progressPercent.textContent = '100%';
    if (progressFill) progressFill.style.width = '100%';
    if (progressStatus) progressStatus.textContent = '✅ 升级完成！';
    showToast('mise 核心已升级到最新版本！', 'success');
    setTimeout(() => {
      if (progressWrap) progressWrap.style.display = 'none';
    }, 4000);
    await checkMiseStatus(true);
  } else {
    showToast('升级未完成，请检查控制台日志或代理配置', 'error');
  }
}
window.upgradeMise = upgradeMise;
