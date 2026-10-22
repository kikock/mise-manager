/**
 * Mise Manager — 核心前端应用逻辑
 * 适配 Windows 11 Fluent Design
 * 支持 mise 安装路径自定义 (MISE_DATA_DIR / MISE_BIN_DIR)
 * 支持 mise-versions 官方 REST API 全量同步与本地离线缓存
 */

'use strict';

// ═══════════════════════════════════════════════
// 全局应用状态
// ═══════════════════════════════════════════════
const AppState = {
  currentPage: 'home',
  miseInstalled: false,
  miseVersion: null,
  miseDataDir: '',
  miseBinDir: '',
  miseBinPath: '',
  installedTools: [],        // { name, version }[]
  marketTools: [],           // 官方 REST API 工具库
  marketFiltered: [],        // 过滤后的列表
  marketLoaded: false,
  marketLoading: false,
  marketFilterType: 'all',   // 'all' | 'popular'
  installedLoaded: false,
};

// ═══════════════════════════════════════════════
// 主题模式控制 (深色 / 浅色 / 跟随系统)
// ═══════════════════════════════════════════════
function applyTheme(theme) {
  let effectiveTheme = theme;
  if (theme === 'auto') {
    effectiveTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.documentElement.setAttribute('data-theme', effectiveTheme);
  localStorage.setItem('mise-theme', theme);

  // 标题栏图标切换
  const iconEl = document.getElementById('theme-toggle-icon');
  if (iconEl) iconEl.textContent = effectiveTheme === 'light' ? '☀️' : '🌙';

  // 设置页文字与状态
  const labelEl = document.getElementById('current-theme-label');
  if (labelEl) {
    const textMap = { dark: '深色模式 🌙', light: '浅色模式 ☀️', auto: '跟随系统 💻' };
    labelEl.textContent = textMap[theme] || '深色模式';
  }

  // 按钮样式同步
  ['dark', 'light', 'auto'].forEach(t => {
    const btn = document.getElementById(`btn-theme-${t}`);
    if (btn) btn.className = t === theme ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
  });
}

function initTheme() {
  const saved = localStorage.getItem('mise-theme') || 'dark';
  applyTheme(saved);

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (localStorage.getItem('mise-theme') === 'auto') applyTheme('auto');
    });
  }
}

// ═══════════════════════════════════════════════
// UI 工具函数
// ═══════════════════════════════════════════════

/** 显示 Toast 通知 */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/** 追加终端输出内容 */
function appendTerminal(el, text, cls = '') {
  if (!el) return;
  const span = document.createElement('span');
  if (cls) span.className = cls;
  span.textContent = text;
  el.appendChild(span);
  el.scrollTop = el.scrollHeight;
}

/** 清空终端输出并展示 */
function clearTerminal(el, wrap) {
  if (el) el.innerHTML = '<span class="terminal-cursor"></span>';
  if (wrap) wrap.style.display = 'block';
}

/** 格式化时间戳为相对时间或标准日期 */
function formatDateTime(timestamp) {
  if (!timestamp) return '未同步';
  const d = new Date(timestamp);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function relativeTime(dateStr) {
  if (!dateStr) return '未知';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  if (isNaN(diff)) return dateStr;
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 30) return `${days} 天前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;
  return `${Math.floor(days / 365)} 年前`;
}

function truncate(str, len = 80) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

/** 智能推导工具 Emoji 图标 */
function getToolEmoji(name) {
  const map = {
    node: '🟢', python: '🐍', go: '🐹', java: '☕', rust: '🦀',
    ruby: '💎', php: '🐘', deno: '🦕', bun: '🍞', swift: '🔶',
    terraform: '🏗️', helm: '⚓', kubectl: '☸️', awscli: '☁️',
    gh: '🐙', jq: '🔧', yq: '📝', uv: '⚡', pnpm: '📦',
    yarn: '🧶', gradle: '🐘', maven: '🎯', docker: '🐳',
    codex: '🤖', claude: '🟠', opencode: '💻', ripgrep: '🔍',
    shfmt: '📄', shellcheck: '🔬', buf: '📡', just: '⚡',
    opentofu: '🔧', lefthook: '🪝', gitleaks: '🔐', erlang: '📡',
    golangci: '🔍', actionlint: '✅', zig: '⚡', elixir: '💧',
    scala: '🔴', kotlin: '🟣', julia: '🔮', dart: '🎯', flutter: '🦋'
  };
  const lower = String(name).toLowerCase();
  for (const [key, emoji] of Object.entries(map)) {
    if (lower.includes(key)) return emoji;
  }
  return '🛠️';
}

// ═══════════════════════════════════════════════
// 路由机制
// ═══════════════════════════════════════════════
function navigateTo(page) {
  if (AppState.currentPage === page) return;
  AppState.currentPage = page;

  // 导航高亮
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // 切换容器可见性
  document.querySelectorAll('.page').forEach(el => {
    el.classList.toggle('active', el.id === `page-${page}`);
  });

  // 按需加载数据
  if (page === 'market' && !AppState.marketLoaded) loadMarket();
  if (page === 'installed') loadInstalledTools();
  if (page === 'settings') loadSettings();
}

// ═══════════════════════════════════════════════
// 首页逻辑
// ═══════════════════════════════════════════════

/** 检测 mise 运行状态与配置路径 */
async function checkMiseStatus() {
  // 获取当前生效配置
  const cfg = await window.miseAPI.config.get();
  AppState.miseDataDir = cfg.miseDataDir || '';
  AppState.miseBinDir = cfg.miseBinDir || '';
  AppState.miseBinPath = cfg.miseBinPath || '';

  // 更新首页安装路径预览
  const installPreview = document.getElementById('install-dir-preview');
  if (installPreview) installPreview.textContent = AppState.miseDataDir || '正在初始化默认目录...';

  const miseDirDisplay = document.getElementById('mise-dir-display');
  if (miseDirDisplay) miseDirDisplay.textContent = AppState.miseDataDir || '-';

  // 运行检测
  const result = await window.miseAPI.mise.check();
  AppState.miseInstalled = result.installed;
  AppState.miseVersion = result.version;

  renderMiseStatus(result);
  updateStatusBar(result);
}

function renderMiseStatus({ installed, version }) {
  const content = document.getElementById('mise-status-content');
  const quickActions = document.getElementById('quick-actions');
  const cardInstall = document.getElementById('card-install-mise');
  const cardUpgrade = document.getElementById('card-upgrade-mise');
  const cardConfig = document.getElementById('card-open-config');

  quickActions.style.display = 'grid';

  if (installed) {
    content.innerHTML = `
      <div class="status-card">
        <div class="status-icon-wrap installed">✅</div>
        <div class="status-info">
          <div class="status-label">mise 运行时已就绪</div>
          <div class="status-value">版本: ${escapeHtml(version || '未知')}</div>
          <div class="status-sub">工作目录: ${escapeHtml(AppState.miseDataDir)}</div>
        </div>
        <div class="flex gap-8">
          <span class="badge badge-success">运行正常</span>
        </div>
      </div>`;
    cardInstall.style.display = 'none';
    cardUpgrade.style.display = 'block';
    cardConfig.style.display = 'block';
  } else {
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
    cardInstall.style.display = 'block';
    cardUpgrade.style.display = 'none';
    cardConfig.style.display = 'none';
  }

  // 加载首页工具快览
  loadHomeTools();
}

function updateStatusBar({ installed, version }) {
  const dot = document.getElementById('status-mise-dot');
  const text = document.getElementById('status-mise-text');
  if (installed) {
    dot.className = 'status-dot online';
    text.textContent = `mise ${version || ''}`;
  } else {
    dot.className = 'status-dot offline';
    text.textContent = 'mise 未就绪';
  }
}

/** 首页已安装工具快照 */
async function loadHomeTools() {
  const grid = document.getElementById('home-tools-grid');
  const subtitle = document.getElementById('home-tools-subtitle');

  if (!AppState.miseInstalled) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:24px">
      <div class="empty-icon">📦</div>
      <div class="empty-title">mise 尚未安装</div>
      <div class="empty-desc">安装 mise 后将在此显示全局与本地工具</div>
    </div>`;
    subtitle.textContent = '未安装 mise';
    return;
  }

  const res = await window.miseAPI.mise.listInstalled();
  const tools = res.success ? res.tools : [];
  AppState.installedTools = tools;

  const totalVersions = tools.reduce((sum, t) => sum + (t.versions ? t.versions.length : 1), 0);
  subtitle.textContent = `已扫描到 ${tools.length} 个开发工具，共 ${totalVersions} 个本地版本`;

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

// ═══════════════════════════════════════════════
// mise 安装与升级操作
// ═══════════════════════════════════════════════

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
    showToast('mise 安装成功！', 'success');
    await checkMiseStatus();
  } else {
    showToast('安装未完成，请检查网络或终端输出日志', 'error');
  }
}

async function upgradeMise() {
  const btn = document.getElementById('btn-upgrade-mise');
  const termWrap = document.getElementById('home-terminal-wrap');
  const termOut = document.getElementById('home-terminal-output');

  btn.classList.add('loading');
  btn.textContent = '升级中...';
  clearTerminal(termOut, termWrap);

  window.miseAPI.mise.onStream((data) => appendTerminal(termOut, data));
  const result = await window.miseAPI.mise.exec(['self-update']);
  window.miseAPI.mise.removeStreamListener();

  btn.classList.remove('loading');
  btn.textContent = '升级到最新版本';

  if (result.success) {
    showToast('mise 核心已升级到最新版本！', 'success');
    await checkMiseStatus();
  } else {
    showToast('升级失败：' + (result.output || ''), 'error');
  }
}

// ═══════════════════════════════════════════════
// 应用市场（官方 REST API 分页 + 本地持久化缓存）
// ═══════════════════════════════════════════════

async function loadMarket(forceRefresh = false) {
  if (AppState.marketLoading) return;
  AppState.marketLoading = true;

  const countEl = document.getElementById('market-tool-count');
  const cacheBadge = document.getElementById('market-cache-badge');
  const progressBarWrap = document.getElementById('market-load-progress');
  const progressText = document.getElementById('market-progress-text');
  const progressFill = document.getElementById('market-progress-fill');
  const grid = document.getElementById('market-tool-grid');

  if (forceRefresh) {
    progressBarWrap.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = '开始同步...';
  }

  // 监听分页拉取进度
  window.miseAPI.market.onProgress((data) => {
    progressBarWrap.style.display = 'block';
    const percent = data.total > 0 ? Math.round((data.current / data.total) * 100) : 0;
    progressFill.style.width = `${percent}%`;
    progressText.textContent = `第 ${data.current} / ${data.total} 页 · 已拉取 ${data.count} 个工具`;

    // 同步更新设置页中的动画进度条
    const setBox = document.getElementById('settings-sync-progress');
    const setFill = document.getElementById('settings-sync-progress-fill');
    const setPercent = document.getElementById('settings-sync-percent');
    const setStatus = document.getElementById('settings-sync-status-text');
    const setDetail = document.getElementById('settings-sync-detail');
    const setCount = document.getElementById('settings-sync-count');
    if (setBox && setBox.style.display !== 'none') {
      if (setFill) setFill.style.width = `${percent}%`;
      if (setPercent) setPercent.textContent = `${percent}%`;
      if (setStatus) setStatus.textContent = `🔄 正在全量同步工具生态数据 (${percent}%)...`;
      if (setDetail) setDetail.textContent = `第 ${data.current} / ${data.total} 页`;
      if (setCount) setCount.textContent = `已收录 ${data.count} / ${data.totalCount || '?'} 个工具`;
    }
  });

  countEl.textContent = '正在获取官方工具列表...';

  const result = await window.miseAPI.market.fetchTools({ useCache: !forceRefresh });
  window.miseAPI.market.removeProgressListener();

  progressBarWrap.style.display = 'none';
  AppState.marketLoading = false;

  if (!result.success || !result.tools || result.tools.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:40px">
      <div class="empty-icon">🌐</div>
      <div class="empty-title">无法拉取市场数据</div>
      <div class="empty-desc">${escapeHtml(result.error || '网络超时或连接失败，可配置代理后重试')}</div>
      <button class="btn btn-primary mt-8" onclick="loadMarket(true)">重试同步</button>
    </div>`;
    countEl.textContent = '同步失败';
    return;
  }

  AppState.marketTools = result.tools.filter(t => t.name);
  AppState.marketLoaded = true;

  // 缓存角标
  if (result.fromCache) {
    cacheBadge.style.display = 'inline-flex';
    cacheBadge.title = `缓存于: ${formatDateTime(result.cachedAt)}`;
  } else {
    cacheBadge.style.display = 'none';
  }

  // 侧边栏徽标
  const navBadge = document.getElementById('market-count');
  if (navBadge) navBadge.textContent = AppState.marketTools.length;

  filterMarket(AppState.marketFilterType || 'all');
  if (forceRefresh) {
    showToast(`市场同步完成！共载入 ${AppState.marketTools.length} 款工具`, 'success');
  }
}

function filterMarket(filter) {
  AppState.marketFilterType = filter;
  let list = AppState.marketTools;

  if (filter === 'popular') {
    // 按版本数量和知名度排序热门
    list = [...list].sort((a, b) => (b.version_count || 0) - (a.version_count || 0)).slice(0, 36);
  }

  AppState.marketFiltered = list;
  renderMarketTools(list);

  // 按钮状态切换
  const btnAll = document.getElementById('filter-all');
  const btnPop = document.getElementById('filter-popular');
  if (btnAll && btnPop) {
    btnAll.className = filter === 'all' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm';
    btnPop.className = filter === 'popular' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm';
  }
}

function renderMarketTools(tools) {
  const grid = document.getElementById('market-tool-grid');
  const countEl = document.getElementById('market-tool-count');

  countEl.textContent = `当前展示 ${tools.length} 个工具 (总计 ${AppState.marketTools.length})`;

  if (tools.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:40px">
      <div class="empty-icon">🔍</div>
      <div class="empty-title">未匹配到相关工具</div>
      <div class="empty-desc">尝试搜索其他工具名称或拼写</div>
    </div>`;
    return;
  }

  grid.innerHTML = tools.map(tool => {
    const isInstalled = AppState.installedTools.some(t => t.name === tool.name);
    return `
    <div class="tool-card" onclick="openToolModal('${escapeAttr(tool.name)}')">
      <div class="tool-card-header">
        <div class="flex gap-10" style="align-items:center;min-width:0">
          <span style="font-size:26px;flex-shrink:0">${getToolEmoji(tool.name)}</span>
          <div style="min-width:0">
            <div class="tool-name">${escapeHtml(tool.name)}</div>
            ${tool.github ? `<div style="font-size:11px;color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(tool.github)}</div>` : ''}
          </div>
        </div>
        <div class="flex" style="gap:4px;flex-direction:column;align-items:flex-end;flex-shrink:0">
          ${isInstalled ? '<span class="badge badge-success">已安装</span>' : ''}
        </div>
      </div>
      <div class="tool-description">${escapeHtml(truncate(tool.description || '官方版本库支持的开源工具', 90))}</div>
      <div class="tool-meta">
        <div>
          <div class="tool-version">${escapeHtml(tool.latest_stable_version || tool.latest_version || '-')}</div>
          <div class="tool-stats">最新稳定版</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:12px;font-weight:600;color:var(--text-secondary)">${(tool.version_count || 0).toLocaleString()}</div>
          <div class="tool-stats">可用版本数</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-tertiary)">同步更新: ${relativeTime(tool.last_updated)}</div>
    </div>`;
  }).join('');
}

function searchMarket(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) {
    renderMarketTools(AppState.marketFiltered.length ? AppState.marketFiltered : AppState.marketTools);
    return;
  }

  const filtered = AppState.marketTools.filter(t =>
    t.name?.toLowerCase().includes(q) ||
    t.description?.toLowerCase().includes(q) ||
    t.github?.toLowerCase().includes(q)
  );

  renderMarketTools(filtered);
  document.getElementById('market-tool-count').textContent = `匹配到 ${filtered.length} 个工具`;
}

// ═══════════════════════════════════════════════
// 工具详情模态框与版本管理
// ═══════════════════════════════════════════════

async function openToolModal(toolName) {
  const modal = document.getElementById('tool-modal');
  const tool = AppState.marketTools.find(t => t.name === toolName) || { name: toolName };

  document.getElementById('modal-tool-name').textContent = `${getToolEmoji(toolName)} ${toolName}`;
  document.getElementById('modal-tool-desc').textContent = tool.description || 'mise 官方工具库支持的软件包';
  document.getElementById('modal-latest-badge').textContent = `最新: ${tool.latest_version || '-'}`;
  document.getElementById('modal-stable-badge').textContent = `稳定: ${tool.latest_stable_version || '-'}`;
  document.getElementById('modal-count-badge').textContent = `版本数: ${tool.version_count || '-'}`;

  // 外部链接按钮
  const linksEl = document.getElementById('modal-links');
  linksEl.innerHTML = '';
  if (tool.github) {
    const btnGh = document.createElement('button');
    btnGh.className = 'btn btn-ghost btn-sm';
    btnGh.textContent = '🐙 GitHub 仓库';
    btnGh.onclick = () => window.miseAPI.shell.openExternal(`https://github.com/${tool.github}`);
    linksEl.appendChild(btnGh);
  }
  if (tool.homepage) {
    const btnHome = document.createElement('button');
    btnHome.className = 'btn btn-ghost btn-sm';
    btnHome.textContent = '🌐 官方网站';
    btnHome.onclick = () => window.miseAPI.shell.openExternal(tool.homepage);
    linksEl.appendChild(btnHome);
  }
  const btnMkt = document.createElement('button');
  btnMkt.className = 'btn btn-ghost btn-sm';
  btnMkt.textContent = '📋 查看 mise 市场页';
  btnMkt.onclick = () => window.miseAPI.shell.openExternal(`https://mise-versions.jdx.dev/${toolName}`);
  linksEl.appendChild(btnMkt);

  // 清理终端与进度条
  const versionList = document.getElementById('modal-version-list');
  const progressBar = document.getElementById('modal-progress-bar');
  const termWrap = document.getElementById('modal-terminal-wrap');
  const termOut = document.getElementById('modal-terminal-output');
  termWrap.style.display = 'none';
  termOut.innerHTML = '';
  progressBar.style.display = 'block';
  versionList.innerHTML = '<div class="empty-state" style="padding:24px"><div class="empty-icon">⏳</div><div class="empty-title">正在获取远程可用版本...</div></div>';

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  loadToolVersions(toolName, tool);
}

async function loadToolVersions(toolName, tool) {
  const versionList = document.getElementById('modal-version-list');
  const progressBar = document.getElementById('modal-progress-bar');

  // 获取远程版本
  const result = await window.miseAPI.market.fetchVersions(toolName);
  progressBar.style.display = 'none';

  // 读取已安装版本
  const toolEntry = AppState.installedTools.find(t => t.name === toolName);
  const installedVersions = toolEntry && toolEntry.versions ? toolEntry.versions.map(v => v.version) : [];

  if (!result.success || !result.versions || result.versions.length === 0) {
    versionList.innerHTML = `<div class="empty-state" style="padding:30px">
      <div class="empty-icon">⚠️</div>
      <div class="empty-title">无法读取版本列表</div>
      <div class="empty-desc">若未安装 mise，可先在主页安装 mise 运行时</div>
    </div>`;
    return;
  }

  const versions = result.versions;
  const latestStable = tool.latest_stable_version;
  const latestAll = tool.latest_version;

  versionList.innerHTML = versions.slice(0, 100).map(v => {
    const isInstalled = installedVersions.includes(v);
    const isLatest = v === latestAll;
    const isStable = v === latestStable;

    return `
    <div class="version-item ${isInstalled ? 'installed' : ''}">
      <div class="version-tag">${escapeHtml(v)}</div>
      <div class="flex gap-6" style="align-items:center;flex-wrap:wrap">
        ${isLatest ? '<span class="badge badge-info" style="font-size:10px">最新</span>' : ''}
        ${isStable && !isLatest ? '<span class="badge badge-success" style="font-size:10px">稳定</span>' : ''}
        ${isInstalled ? '<span class="badge badge-success" style="font-size:10px">已安装</span>' : ''}
        <div class="version-actions">
          ${isInstalled
            ? `<button class="btn btn-danger btn-sm" onclick="uninstallTool('${escapeAttr(toolName)}','${escapeAttr(v)}',this)">卸载</button>`
            : `<button class="btn btn-primary btn-sm" onclick="installTool('${escapeAttr(toolName)}','${escapeAttr(v)}',this)">安装</button>`
          }
          ${isInstalled
            ? `<button class="btn btn-secondary btn-sm" onclick="setGlobal('${escapeAttr(toolName)}','${escapeAttr(v)}',this)">设为默认</button>`
            : ''
          }
        </div>
      </div>
    </div>`;
  }).join('');

  if (versions.length > 100) {
    versionList.innerHTML += `<div style="text-align:center;padding:12px;color:var(--text-tertiary);font-size:12px">
      当前已显示前 100 个最新版本，共检索到 ${versions.length} 个版本
    </div>`;
  }
}

async function installTool(toolName, version, btn) {
  const termWrap = document.getElementById('modal-terminal-wrap');
  const termOut = document.getElementById('modal-terminal-output');
  clearTerminal(termOut, termWrap);
  btn.classList.add('loading');
  btn.textContent = '安装中';

  window.miseAPI.mise.onStream((data) => appendTerminal(termOut, data));

  const result = await window.miseAPI.mise.exec(['install', `${toolName}@${version}`]);
  window.miseAPI.mise.removeStreamListener();
  btn.classList.remove('loading');

  // 关键：二次通过 mise where 校验物理文件是否真实安装就绪
  const whereInfo = await window.miseAPI.mise.where(`${toolName}@${version}`);
  const isInstalled = result.success || (whereInfo && whereInfo.found);

  if (isInstalled) {
    if (whereInfo && whereInfo.path) {
      appendTerminal(termOut, `\n[校验成功] 工具已安装到本地: ${whereInfo.path}\n`);
    }
    // 检测是否包含 Windows 软链接警告并追加解释
    const out = String(result.output || '');
    if (out.includes('failed to ln -sf') || out.includes('os error 1') || out.includes('函数不正确')) {
      appendTerminal(termOut, `\n💡 提示: 检测到 Windows 未开启开发者模式，系统跳过了次版本别名软链接创建。工具核心二进制已完整安装成功并可正常被 mise 调用。\n`);
    }
    showToast(`${toolName}@${version} 安装成功！`, 'success');
    btn.textContent = '已安装';
    btn.className = 'btn btn-secondary btn-sm';
    btn.disabled = true;
    AppState.installedLoaded = false;
    await loadHomeTools();
  } else {
    showToast(`安装失败: ${result.output || ''}`, 'error');
    btn.textContent = '安装';
  }
}

async function uninstallTool(toolName, version, btn) {
  btn.classList.add('loading');
  btn.textContent = '卸载中';

  const result = await window.miseAPI.mise.exec(['uninstall', `${toolName}@${version}`]);
  btn.classList.remove('loading');

  if (result.success) {
    showToast(`${toolName}@${version} 已成功卸载`, 'info');
    const item = btn.closest('.version-item');
    if (item) item.classList.remove('installed');
    btn.textContent = '安装';
    btn.className = 'btn btn-primary btn-sm';
    btn.onclick = () => installTool(toolName, version, btn);
    AppState.installedLoaded = false;
    await loadHomeTools();
  } else {
    showToast('卸载失败: ' + result.output, 'error');
    btn.textContent = '卸载';
  }
}

async function setGlobal(toolName, version, btn) {
  btn.classList.add('loading');
  btn.textContent = '配置中';
  const result = await window.miseAPI.mise.exec(['use', '--global', `${toolName}@${version}`]);
  btn.classList.remove('loading');
  btn.textContent = '设为默认';

  if (result.success) {
    showToast(`已成功将 ${toolName}@${version} 设为全局激活版本`, 'success');
    await loadHomeTools();
  } else {
    showToast('设置失败: ' + result.output, 'error');
  }
}

function closeModal() {
  const modal = document.getElementById('tool-modal');
  modal.style.display = 'none';
  document.body.style.overflow = '';
  window.miseAPI.mise.removeStreamListener();
}

// ═══════════════════════════════════════════════
// 已安装工具页面
// ═══════════════════════════════════════════════

async function loadInstalledTools() {
  const container = document.getElementById('installed-list-container');
  container.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-title">正在全面扫描本地已安装与启用工具...</div></div>`;

  // 同步展示当前扫描的生效目录
  try {
    const cfg = await window.miseAPI.config.get();
    const dirEl = document.getElementById('installed-active-dir');
    if (dirEl) dirEl.textContent = cfg.miseDataDir || '默认统一主目录/data';
  } catch (e) {}

  if (!AppState.miseInstalled) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <div class="empty-title">mise 运行时未就绪</div>
      <div class="empty-desc">请先返回主页完成 mise 的初始化安装</div>
      <button class="btn btn-primary mt-8" onclick="navigateTo('home')">返回主页</button>
    </div>`;
    return;
  }

  const res = await window.miseAPI.mise.listInstalled();
  const tools = res.success ? res.tools : [];
  AppState.installedTools = tools;
  AppState.installedLoaded = true;

  const countBadge = document.getElementById('installed-count');
  if (countBadge) {
    countBadge.textContent = tools.length;
    countBadge.style.display = tools.length > 0 ? '' : 'none';
  }

  renderInstalledList(tools);
}

function renderInstalledList(tools) {
  const container = document.getElementById('installed-list-container');
  if (!tools || tools.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📦</div>
      <div class="empty-title">未检索到已安装的工具</div>
      <div class="empty-desc">您可以前往应用市场，挑选需要的开发语言或工具一键安装</div>
      <button class="btn btn-primary mt-8" onclick="navigateTo('market')">前往应用市场</button>
    </div>`;
    return;
  }

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      ${tools.map(t => {
        const versions = t.versions || [];
        const activeVer = t.activeVersion;
        return `
        <div class="card" style="padding:16px 20px;border-left:4px solid ${activeVer ? 'var(--accent)' : 'var(--border)'}">
          <!-- 卡片顶栏 -->
          <div class="flex-between" style="align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px">
            <div class="flex gap-12" style="align-items:center">
              <span style="font-size:32px">${getToolEmoji(t.name)}</span>
              <div>
                <div class="flex gap-8" style="align-items:center;flex-wrap:wrap">
                  <span class="tool-name" style="font-size:16px;font-weight:600">${escapeHtml(t.name)}</span>
                  ${activeVer 
                    ? `<span class="badge badge-success" style="font-size:11px">⭐ 当前激活: ${escapeHtml(activeVer)}</span>`
                    : `<span class="badge badge-warning" style="font-size:11px;background:rgba(255,185,0,0.15);color:#ffb900">⚠️ 未激活任何版本</span>`
                  }
                  <span class="badge badge-neutral" style="font-size:11px">共 ${versions.length} 个已安装版本</span>
                </div>
                <div style="font-size:12px;color:var(--text-tertiary);margin-top:3px">
                  ${activeVer ? '当前激活版本已生效于全局环境变量，命令行可直接调起' : '已下载至本地目录，点击下方版本按钮即可一键激活'}
                </div>
              </div>
            </div>
            <div class="flex gap-8" style="align-items:center">
              <button class="btn btn-ghost btn-sm" onclick="openToolModal('${escapeAttr(t.name)}')">
                🏪 安装其他版本
              </button>
            </div>
          </div>

          <!-- 版本矩阵列表 -->
          <div style="background:var(--bg-tertiary);border-radius:var(--radius-sm);border:1px solid var(--border);overflow:hidden">
            <div style="padding:8px 14px;background:rgba(255,255,255,0.02);border-bottom:1px solid var(--border);font-size:11.5px;font-weight:600;color:var(--text-tertiary);display:flex;justify-content:space-between">
              <span>本地版本与物理存储路径</span>
              <span>版本切换控制 (mise use)</span>
            </div>
            <div style="display:flex;flex-direction:column">
              ${versions.map(v => {
                const isActive = v.active;
                return `
                <div class="flex-between" style="padding:10px 14px;align-items:center;border-bottom:1px solid rgba(255,255,255,0.04);background:${isActive ? 'rgba(0,120,212,0.07)' : 'transparent'}">
                  <div style="display:flex;flex-direction:column;gap:3px;min-width:0;flex:1;padding-right:12px">
                    <div class="flex gap-8" style="align-items:center">
                      <span style="font-family:var(--font-mono);font-size:13.5px;font-weight:${isActive ? '700' : '500'};color:${isActive ? 'var(--accent)' : 'var(--text-primary)'}">
                        ${escapeHtml(v.version)}
                      </span>
                      ${isActive 
                        ? `<span class="badge badge-success" style="font-size:10px;padding:2px 6px">当前使用中 (Active)</span>` 
                        : `<span style="font-size:11px;color:var(--text-tertiary)">未激活</span>`
                      }
                      ${v.source ? `<span style="font-size:10.5px;color:var(--text-tertiary);font-family:var(--font-mono)" title="${escapeAttr(v.source)}">(${escapeHtml(v.source.split(/[\\\\/]/).pop())})</span>` : ''}
                    </div>
                    <div style="font-size:11px;color:var(--text-tertiary);font-family:var(--font-mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeAttr(v.installPath || '')}">
                      📁 ${escapeHtml(v.installPath || '未知路径')}
                    </div>
                  </div>

                  <div class="flex gap-6" style="align-items:center;flex-shrink:0">
                    ${isActive
                      ? `<button class="btn btn-secondary btn-sm" disabled style="opacity:0.85;cursor:default">
                           ⭐ 已是默认
                         </button>`
                      : `<button class="btn btn-primary btn-sm" title="执行 mise use -g 设为全局默认版本" onclick="event.stopPropagation();activateToolVersion('${escapeAttr(t.name)}', '${escapeAttr(v.version)}', true, this)">
                           🌟 设为全局使用
                         </button>
                         <button class="btn btn-ghost btn-sm" title="执行 mise use 设为当前项目生效" onclick="event.stopPropagation();activateToolVersion('${escapeAttr(t.name)}', '${escapeAttr(v.version)}', false, this)">
                           📍 本地使用
                         </button>`
                    }
                    <button class="btn btn-ghost btn-sm" title="在 Windows 资源管理器中打开安装目录" onclick="event.stopPropagation();openVersionFolder('${escapeAttr(v.installPath)}')">
                      📂
                    </button>
                    <button class="btn btn-danger btn-sm" title="卸载此版本" onclick="event.stopPropagation();uninstallTool('${escapeAttr(t.name)}', '${escapeAttr(v.version)}', this)">
                      🗑️
                    </button>
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

/** 切换使用特定工具版本 (mise use) */
async function activateToolVersion(toolName, version, isGlobal, btn) {
  if (btn) {
    btn.classList.add('loading');
    btn.disabled = true;
  }
  try {
    const res = await window.miseAPI.mise.use(toolName, version, isGlobal);
    if (res.success) {
      showToast(`已成功将 ${toolName}@${version} 切换为${isGlobal ? '全局' : '本地'}激活版本`, 'success');
      await loadInstalledTools();
      await loadHomeTools();
    } else {
      showToast('切换版本失败: ' + (res.error || res.output), 'error');
    }
  } catch (err) {
    showToast('执行异常: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }
}

/** 打开指定版本的物理安装文件夹 */
async function openVersionFolder(fullPath) {
  if (!fullPath) {
    showToast('该版本未找到物理路径', 'warning');
    return;
  }
  const ok = await window.miseAPI.shell.openPath(fullPath);
  if (!ok) {
    showToast('未能打开目录，请确认文件夹是否存在', 'warning');
  }
}

// ═══════════════════════════════════════════════
// 设置页：路径自定义、缓存与配置
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// 设置页：路径自定义、缓存与配置
// ═══════════════════════════════════════════════

async function loadSettings() {
  const cfg = await window.miseAPI.config.get();

  const rootDirInput = document.getElementById('input-mise-root-dir');
  const dataDirInput = document.getElementById('input-mise-data-dir');
  const binDirInput  = document.getElementById('input-mise-bin-dir');

  const previewAppBase = document.getElementById('preview-app-base');
  const previewRootDir = document.getElementById('preview-root-dir');
  const previewData    = document.getElementById('preview-data-dir');
  const previewBin     = document.getElementById('preview-bin-dir');
  const previewPath    = document.getElementById('preview-bin-path');

  if (rootDirInput) rootDirInput.value = cfg.miseRootDir || '';
  if (dataDirInput) dataDirInput.value = cfg.miseDataDir || '';
  if (binDirInput)  binDirInput.value  = cfg.miseBinDir || '';

  if (previewAppBase) previewAppBase.textContent = cfg.appBaseDir || '-';
  if (previewRootDir) previewRootDir.textContent = cfg.miseRootDir || '-';
  if (previewData)    previewData.textContent    = cfg.miseDataDir || '-';
  if (previewBin)     previewBin.textContent     = cfg.miseBinDir || '-';
  if (previewPath)    previewPath.textContent    = cfg.miseBinPath || '自动检测';

  // 刷新 Windows 环境变量状态
  await checkEnvStatus();

  // 加载缓存详情
  loadCacheInfo();

  // 读取已保存的代理设置
  const proxy = localStorage.getItem('mise-proxy') || '';
  const proxyInput = document.getElementById('input-proxy');
  if (proxyInput) proxyInput.value = proxy;
}

/** 检测 Windows 用户环境变量状态 */
async function checkEnvStatus() {
  const exeVal  = document.getElementById('env-val-exe-dir');
  const binVal  = document.getElementById('env-val-bin-dir');
  const dataVal = document.getElementById('env-val-data-dir');

  const statusPathExe  = document.getElementById('env-status-path-exe');
  const statusVarBin   = document.getElementById('env-status-var-bin');
  const statusPathBin  = document.getElementById('env-status-path-bin');
  const statusVarData  = document.getElementById('env-status-var-data');
  const statusPathData = document.getElementById('env-status-path-data');

  try {
    const env = await window.miseAPI.env.get();
    if (!env || !env.success) return;

    if (exeVal)  exeVal.textContent  = env.targetExeDir;
    if (binVal)  binVal.textContent  = env.targetBinDir;
    if (dataVal) dataVal.textContent = env.targetDataDir;

    // 1. mise 入口目录在 Path 中的状态
    if (statusPathExe) {
      statusPathExe.innerHTML = env.pathHasExeDir
        ? '<span class="badge badge-success">✅ 已在 Path 中</span>'
        : '<span class="badge badge-warning">⚠️ 未在 Path 中</span>';
    }

    // 2. MISE_BIN_DIR 独立变量与 Path 状态
    if (statusVarBin) {
      statusVarBin.innerHTML = env.binDirMatched
        ? '<span class="badge badge-success">✅ 已匹配设置</span>'
        : '<span class="badge badge-warning">⚠️ 未设置或不符</span>';
    }
    if (statusPathBin) {
      statusPathBin.innerHTML = env.pathHasBinDir
        ? '<span class="badge badge-success">✅ 已在 Path 中</span>'
        : '<span class="badge badge-warning">⚠️ 未在 Path 中</span>';
    }

    // 3. MISE_DATA_DIR 独立变量与 Path 状态
    if (statusVarData) {
      statusVarData.innerHTML = env.dataDirMatched
        ? '<span class="badge badge-success">✅ 已匹配设置</span>'
        : '<span class="badge badge-warning">⚠️ 未设置或不符</span>';
    }
    if (statusPathData) {
      statusPathData.innerHTML = env.pathHasDataDir
        ? '<span class="badge badge-success">✅ 已在 Path 中</span>'
        : '<span class="badge badge-warning">⚠️ 未在 Path 中</span>';
    }
  } catch (e) {
    console.error('获取环境变量失败:', e);
  }
}

/** 一键将 3 个对应地址写入 Windows 用户环境变量 */
async function applyEnvSettings() {
  const btn = document.getElementById('btn-apply-env');
  const oldText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ 正在同步环境变量...';
  }

  try {
    const res = await window.miseAPI.env.apply();
    if (res && res.success) {
      showToast('⚡ 环境变量与 Path 已成功同步写入 Windows 用户环境！', 'success', 4500);
      await checkEnvStatus();
    } else {
      showToast('写入失败: ' + (res?.error || '未知错误'), 'error');
    }
  } catch (err) {
    showToast('执行异常: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = oldText;
    }
  }
}

/** 从 Windows 用户环境变量中清除 */
async function removeEnvSettings() {
  if (!confirm('确定要从 Windows 用户环境变量中清除 mise 相关配置（MISE_DATA_DIR、MISE_BIN_DIR 及 Path 路径）吗？')) {
    return;
  }

  const btn = document.getElementById('btn-remove-env');
  if (btn) btn.disabled = true;

  try {
    const res = await window.miseAPI.env.remove();
    if (res && res.success) {
      showToast('🗑️ 已成功从用户环境变量中移除 mise 相关配置！', 'info');
      await checkEnvStatus();
    } else {
      showToast('清理失败: ' + (res?.error || '未知错误'), 'error');
    }
  } catch (err) {
    showToast('执行异常: ' + err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

/** 卸载 mise 核心与数据目录 */
async function uninstallMise() {
  const cfg = await window.miseAPI.config.get();
  const rootDir = cfg.miseRootDir || '应用 mise 目录';
  
  const msg = `⚠️ 高风险操作确认：\n\n您确定要彻底卸载 mise 吗？\n该操作将直接删除统一主目录及其所有已下载安装的工具与数据：\n${rootDir}\n\n确认后不可撤销，是否继续？`;
  if (!confirm(msg)) {
    return;
  }

  showToast('正在清理 mise 核心与数据目录...', 'info', 3000);
  try {
    const res = await window.miseAPI.mise.uninstall();
    if (res && res.success) {
      showToast('✅ mise 已彻底卸载完成！', 'success', 4000);
      await checkMiseStatus();
      await loadSettings();
    } else {
      showToast('卸载失败: ' + (res?.error || '未知错误'), 'error');
    }
  } catch (err) {
    showToast('卸载异常: ' + err.message, 'error');
  }
}

async function loadCacheInfo() {
  const cacheDisplay = document.getElementById('cache-info-display');
  if (!cacheDisplay) return;

  const info = await window.miseAPI.market.getCacheInfo();
  if (info.exists) {
    cacheDisplay.innerHTML = `
      <div>缓存状态：<span style="color:#81c784">已就绪</span></div>
      <div>工具总数：<b style="color:var(--accent)">${info.count}</b> 款</div>
      <div>同步时间：${formatDateTime(info.cachedAt)}</div>
    `;
  } else {
    cacheDisplay.innerHTML = `
      <div>缓存状态：<span style="color:var(--text-tertiary)">未生成</span></div>
      <div style="font-size:12px;color:var(--text-tertiary)">点击下方按钮即可全量同步市场数据至本地</div>
    `;
  }
}

// 保存路径配置
async function saveMisePaths() {
  const rootDir = document.getElementById('input-mise-root-dir')?.value.trim();
  const dataDir = document.getElementById('input-mise-data-dir')?.value.trim();
  const binDir  = document.getElementById('input-mise-bin-dir')?.value.trim();

  await window.miseAPI.config.set({
    miseRootDir: rootDir || undefined,
    miseDataDir: dataDir || undefined,
    miseBinDir:  binDir || undefined,
  });

  showToast('mise 目录配置已保存！', 'success');
  await checkMiseStatus();
  await loadSettings();
}

// 恢复默认路径
async function resetMisePaths() {
  await window.miseAPI.config.reset();
  showToast('已恢复为默认同目录配置', 'info');
  await checkMiseStatus();
  await loadSettings();
}

// 复制控制台日志
async function copyTerminalLog(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const text = el.innerText || el.textContent || '';
  if (!text.trim()) {
    showToast('控制台暂无日志可复制', 'info');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast('📋 日志已成功复制到剪贴板！', 'success');
  } catch (e) {
    showToast('复制失败，请手动选中文本复制', 'error');
  }
}

// ═══════════════════════════════════════════════
// 时钟与网络状态
// ═══════════════════════════════════════════════

function startClock() {
  const el = document.getElementById('status-time');
  function tick() {
    if (el) el.textContent = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  tick();
  setInterval(tick, 1000);
}

function checkNetwork() {
  const dot = document.getElementById('status-net-dot');
  const text = document.getElementById('status-net-text');
  if (!dot || !text) return;
  if (navigator.onLine) {
    dot.className = 'status-dot online';
    text.textContent = '网络已连接';
  } else {
    dot.className = 'status-dot offline';
    text.textContent = '网络已断开';
  }
}

// ═══════════════════════════════════════════════
// 全局事件绑定
// ═══════════════════════════════════════════════

function bindEvents() {
  // 窗口标题栏控制
  document.getElementById('btn-minimize').onclick = () => window.miseAPI.window.minimize();
  document.getElementById('btn-maximize').onclick = () => window.miseAPI.window.maximize();
  document.getElementById('btn-close').onclick    = () => window.miseAPI.window.close();

  // 侧边栏及通用导航
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.page));
  });
  document.getElementById('btn-view-all')?.addEventListener('click', () => navigateTo('installed'));
  document.getElementById('btn-settings-shortcut')?.addEventListener('click', () => navigateTo('settings'));

  // 复制日志按钮
  document.getElementById('btn-copy-home-log')?.addEventListener('click', () => copyTerminalLog('home-terminal-output'));
  document.getElementById('btn-copy-modal-log')?.addEventListener('click', () => copyTerminalLog('modal-terminal-output'));

  // 首页按钮
  document.getElementById('btn-refresh-status').onclick = checkMiseStatus;
  document.getElementById('btn-install-mise').onclick   = installMise;
  document.getElementById('btn-upgrade-mise').onclick   = upgradeMise;
  document.getElementById('btn-open-config').onclick    = () => {
    if (AppState.miseDataDir) window.miseAPI.shell.openExternal(AppState.miseDataDir);
  };
  document.getElementById('btn-change-install-dir').onclick = async () => {
    const dir = await window.miseAPI.dialog.selectDir();
    if (dir) {
      await window.miseAPI.config.set({ miseRootDir: dir });
      showToast('已更新统一主目录', 'success');
      await checkMiseStatus();
    }
  };

  // 市场页事件
  document.getElementById('btn-refresh-market').onclick = () => loadMarket(true);
  document.getElementById('market-search').addEventListener('input', (e) => {
    searchMarket(e.target.value);
  });
  document.getElementById('filter-all').onclick     = () => filterMarket('all');
  document.getElementById('filter-popular').onclick = () => filterMarket('popular');

  // 已安装页事件
  document.getElementById('btn-refresh-installed').onclick = loadInstalledTools;
  document.getElementById('installed-search')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = AppState.installedTools.filter(t => 
      t.name.toLowerCase().includes(q) ||
      (t.versions && t.versions.some(v => v.version.toLowerCase().includes(q)))
    );
    renderInstalledList(filtered);
  });

  // 模态框事件
  document.getElementById('modal-close').onclick  = closeModal;
  document.getElementById('modal-cancel').onclick = closeModal;
  document.getElementById('tool-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('tool-modal')) closeModal();
  });

  // 设置页事件
  document.getElementById('btn-browse-root-dir')?.addEventListener('click', async () => {
    const dir = await window.miseAPI.dialog.selectDir();
    if (dir) {
      document.getElementById('input-mise-root-dir').value = dir;
      // 自动跟随填充默认子目录
      document.getElementById('input-mise-data-dir').value = dir + '\\data';
      document.getElementById('input-mise-bin-dir').value  = dir + '\\data\\shims';
    }
  });
  document.getElementById('btn-browse-data-dir').onclick = async () => {
    const dir = await window.miseAPI.dialog.selectDir();
    if (dir) document.getElementById('input-mise-data-dir').value = dir;
  };
  document.getElementById('btn-browse-bin-dir').onclick = async () => {
    const dir = await window.miseAPI.dialog.selectDir();
    if (dir) document.getElementById('input-mise-bin-dir').value = dir;
  };
  document.getElementById('btn-save-mise-paths').onclick = saveMisePaths;
  document.getElementById('btn-reset-mise-paths').onclick = resetMisePaths;
  document.getElementById('btn-open-mise-data-dir').onclick = () => {
    if (AppState.miseDataDir) window.miseAPI.shell.openExternal(AppState.miseDataDir);
  };

  // 卸载 mise 按钮（首页与设置页）
  document.getElementById('btn-uninstall-mise-home')?.addEventListener('click', uninstallMise);
  document.getElementById('btn-uninstall-mise-settings')?.addEventListener('click', uninstallMise);

  // 环境变量控制按钮
  document.getElementById('btn-refresh-env')?.addEventListener('click', async () => {
    await checkEnvStatus();
    showToast('环境变量检测已刷新', 'info');
  });
  document.getElementById('btn-apply-env')?.addEventListener('click', applyEnvSettings);
  document.getElementById('btn-remove-env')?.addEventListener('click', removeEnvSettings);

  // ── 主题模式控制 ──
  document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'light' ? 'dark' : 'light');
    showToast(current === 'light' ? '已切换至深色模式 🌙' : '已切换至浅色模式 ☀️', 'info', 2000);
  });
  document.getElementById('btn-theme-dark')?.addEventListener('click', () => {
    applyTheme('dark');
    showToast('已切换至深色模式 🌙', 'info', 2000);
  });
  document.getElementById('btn-theme-light')?.addEventListener('click', () => {
    applyTheme('light');
    showToast('已切换至浅色模式 ☀️', 'info', 2000);
  });
  document.getElementById('btn-theme-auto')?.addEventListener('click', () => {
    applyTheme('auto');
    showToast('已设置为跟随系统外观 💻', 'info', 2000);
  });

  // ── 切换目录后刷新下载的应用 ──
  document.getElementById('btn-refresh-installed-active')?.addEventListener('click', async () => {
    showToast('正在重新扫描本地已下载工具...', 'info', 2000);
    await loadInstalledTools();
    showToast('已下载应用列表已刷新！', 'success');
  });
  document.getElementById('btn-refresh-apps-after-path')?.addEventListener('click', async () => {
    await saveMisePaths();
    navigateTo('installed');
    await loadInstalledTools();
    showToast('已自动切换至已安装页并刷新应用列表！', 'success');
  });

  // 市场缓存按钮
  document.getElementById('btn-refresh-cache').onclick = async () => {
    const btn = document.getElementById('btn-refresh-cache');
    const setBox = document.getElementById('settings-sync-progress');
    const setFill = document.getElementById('settings-sync-progress-fill');
    const setPercent = document.getElementById('settings-sync-percent');
    const setStatus = document.getElementById('settings-sync-status-text');
    const setDetail = document.getElementById('settings-sync-detail');
    const setCount = document.getElementById('settings-sync-count');

    btn.classList.add('loading');
    btn.disabled = true;
    if (setBox) setBox.style.display = 'block';
    if (setFill) {
      setFill.style.width = '0%';
      setFill.classList.remove('indeterminate');
    }
    if (setPercent) setPercent.textContent = '0%';
    if (setStatus) setStatus.textContent = '🚀 正在建立与官方数据源连接...';
    if (setDetail) setDetail.textContent = '准备拉取分页...';
    if (setCount) setCount.textContent = '0 个工具';

    try {
      await loadMarket(true);
      await loadCacheInfo();
      if (setFill) setFill.style.width = '100%';
      if (setPercent) setPercent.textContent = '100%';
      if (setStatus) setStatus.textContent = '✅ 官方生态全量数据已成功同步！';
      showToast('官方工具生态已完成全量同步', 'success');
      setTimeout(() => {
        if (setBox) setBox.style.display = 'none';
      }, 2500);
    } catch (e) {
      if (setStatus) setStatus.textContent = '❌ 同步失败: ' + e.message;
      showToast('同步失败，请检查网络或代理设置', 'error');
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  };
  document.getElementById('btn-clear-cache').onclick = async () => {
    const ok = await window.miseAPI.market.clearCache();
    if (ok) {
      showToast('本地市场缓存已清除', 'info');
      AppState.marketLoaded = false;
      await loadCacheInfo();
    }
  };

  // 代理与清理
  document.getElementById('btn-save-proxy').onclick = () => {
    const v = document.getElementById('input-proxy').value.trim();
    localStorage.setItem('mise-proxy', v);
    showToast('代理设置已保存', 'success');
  };
  document.getElementById('btn-clean-cache').onclick = async () => {
    const r = await window.miseAPI.mise.exec(['cache', 'clear']);
    showToast(r.success ? '下载缓存已成功清理' : '清理失败: ' + (r.output || ''), r.success ? 'success' : 'error');
  };

  // 外部链接
  document.getElementById('btn-mise-docs').onclick = () => window.miseAPI.shell.openExternal('https://mise.jdx.dev');
  document.getElementById('btn-mise-github').onclick = () => window.miseAPI.shell.openExternal('https://github.com/jdx/mise');
  document.getElementById('btn-mise-versions-site').onclick = () => window.miseAPI.shell.openExternal('https://mise-versions.jdx.dev');

  // 快捷键与网络
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
  window.addEventListener('online', checkNetwork);
  window.addEventListener('offline', checkNetwork);
}

// ═══════════════════════════════════════════════
// 应用初始化入口
// ═══════════════════════════════════════════════

async function init() {
  initTheme();
  bindEvents();
  startClock();
  checkNetwork();

  // 首先检测 mise 状态与配置
  await checkMiseStatus();

  // 预读取市场缓存（如果存在则自动展示，避免阻塞首屏）
  setTimeout(async () => {
    const info = await window.miseAPI.market.getCacheInfo();
    if (info.exists && !AppState.marketLoaded) {
      loadMarket(false);
    }
  }, 800);

  console.log('✅ Mise Manager 界面就绪');
}

document.addEventListener('DOMContentLoaded', init);
