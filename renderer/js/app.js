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

/** 带有即时视觉反馈与防抖的外部链接打开函数，消除Windows唤起浏览器的感知卡顿 */
async function openExternalWithFeedback(url, btn = null, desc = '网页') {
  if (!url) return;
  let originalHtml = '';
  if (btn && !btn.disabled) {
    btn.disabled = true;
    originalHtml = btn.innerHTML;
    btn.innerHTML = `<span style="display:inline-block;animation:spin 0.8s linear infinite;margin-right:4px">🔄</span> 正在调起...`;
  }
  showToast(`正在呼起系统浏览器访问 ${desc}...`, 'info', 2200);

  try {
    await window.miseAPI.shell.openExternal(url);
  } catch (err) {
    showToast('打开失败: ' + (err.message || '系统调用异常'), 'error');
  } finally {
    if (btn) {
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }, 1200);
    }
  }
}
window.openExternalWithFeedback = openExternalWithFeedback;

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

/** 
 * 高性能安全 Markdown 解析器，支持标题、列表、加粗、代码块、链接与分割线 
 */
function renderMarkdown(md) {
  if (!md || typeof md !== 'string') return '';

  // 1. 保护代码块
  const codeBlocks = [];
  let text = md.replace(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g, (match, lang, code) => {
    const id = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`);
    return id;
  });

  // 2. 保护行内代码
  const inlineCodes = [];
  text = text.replace(/`([^`\n]+)`/g, (match, code) => {
    const id = `__INLINE_CODE_${inlineCodes.length}__`;
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return id;
  });

  // 3. 逐行解析块级元素
  const lines = text.split(/\r?\n/);
  const out = [];
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 水平分割线 (--- / ***)
    if (/^\s*(?:---|___|\*\*\*)\s*$/.test(line)) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
      out.push('<hr />');
      continue;
    }

    // 标题 (# ~ ####)
    const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (hMatch) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
      const level = hMatch[1].length;
      out.push(`<h${level}>${formatInlineMd(hMatch[2])}</h${level}>`);
      continue;
    }

    // 引用块 (> text)
    const bMatch = line.match(/^>\s*(.+)$/);
    if (bMatch) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
      out.push(`<blockquote>${formatInlineMd(bMatch[1])}</blockquote>`);
      continue;
    }

    // 无序列表 (- / * / +)
    const ulMatch = line.match(/^\s*[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inUl) { out.push('<ul>'); inUl = true; }
      out.push(`<li>${formatInlineMd(ulMatch[1])}</li>`);
      continue;
    }

    // 有序列表 (1. text)
    const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (!inOl) { out.push('<ol>'); inOl = true; }
      out.push(`<li>${formatInlineMd(olMatch[1])}</li>`);
      continue;
    }

    // 普通文本行或空行
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }

    const trimmed = line.trim();
    if (trimmed === '') {
      out.push('<div style="height:4px"></div>');
    } else {
      out.push(`<p>${formatInlineMd(line)}</p>`);
    }
  }

  if (inUl) out.push('</ul>');
  if (inOl) out.push('</ol>');

  let result = out.join('\n');

  // 恢复行内代码
  inlineCodes.forEach((code, idx) => {
    result = result.replace(`__INLINE_CODE_${idx}__`, code);
  });

  // 恢复多行代码块
  codeBlocks.forEach((code, idx) => {
    result = result.replace(`__CODE_BLOCK_${idx}__`, code);
  });

  return result;
}

function formatInlineMd(str) {
  if (!str) return '';
  let s = escapeHtml(str);

  // 加粗 **bold** 与 __bold__
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // 斜体 *italic* 与 _italic_
  s = s.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
  s = s.replace(/_([^_]+?)_/g, '<em>$1</em>');

  // 链接 [text](url)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match, txt, url) => {
    return `<a href="#" onclick="openExternalWithFeedback('${escapeAttr(url)}', this, '${escapeAttr(txt)}'); return false;">${txt}</a>`;
  });

  return s;
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

/** 检测 mise 运行状态与配置路径（支持毫秒级内存缓存秒开，消除界面白屏卡顿） */
async function checkMiseStatus(forceRefresh = false) {
  try {
    // 并发获取配置与 mise 安装状态
    const [cfg, result] = await Promise.all([
      window.miseAPI.config.get().catch(() => ({})),
      window.miseAPI.mise.check(forceRefresh).catch(() => ({ installed: false })),
    ]);

    AppState.miseDataDir = cfg.miseDataDir || result.miseDataDir || '';
    AppState.miseBinDir = cfg.miseBinDir || result.miseBinDir || '';
    AppState.miseBinPath = cfg.miseBinPath || result.miseBinPath || '';
    AppState.miseInstalled = !!result.installed;
    AppState.miseVersion = result.version;

    // 持久化存储供下次启动秒开
    try {
      localStorage.setItem('mise_cache_status', JSON.stringify({
        installed: AppState.miseInstalled,
        version: AppState.miseVersion,
        miseDataDir: AppState.miseDataDir,
      }));
    } catch (e) {}

    // 更新首页安装路径预览
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

  // 加载首页工具快览
  loadHomeTools(isCached);
}

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

/** 首页已安装工具快照（支持旧数据先展示，后台静默刷新） */
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

  // 如果没有缓存呈现，展示流畅的骨架占位
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

    // 存入缓存供下次秒开
    try {
      localStorage.setItem('mise_cache_installed', JSON.stringify(tools));
    } catch (e) {}

    renderHomeToolsCards(tools, false);
  } catch (e) {
    console.error('获取已安装工具失败:', e);
  }
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
    // 首次安装自动激活处理
    const autoApplyEnv = document.getElementById('chk-auto-apply-env')?.checked ?? true;
    const autoActivatePwsh = document.getElementById('chk-auto-activate-pwsh')?.checked ?? true;

    if (autoApplyEnv) {
      appendTerminal(termOut, '\r\n⏳ 正在自动配置 Windows 环境变量与 Shims 垫片...\r\n');
      try {
        const envRes = await window.miseAPI.env.apply();
        if (envRes && envRes.success) {
          appendTerminal(termOut, '✅ 已自动激活 CMD 与通用终端环境变量 (MISE_BIN_DIR / Shims已写入用户Path)\r\n');
        } else {
          appendTerminal(termOut, `⚠️ 自动配置环境变量提示: ${envRes?.error || '写入失败'}\r\n`);
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
          appendTerminal(termOut, '✅ 已自动激活 PowerShell 终端 (已写入 Profile 并智能处理兼容警告)\r\n');
        } else {
          appendTerminal(termOut, `⚠️ 自动配置 PowerShell Profile 提示: ${pwshRes?.error || '写入失败'}\r\n`);
        }
      } catch (e) {
        appendTerminal(termOut, `⚠️ 自动配置 PowerShell Profile 异常: ${e.message}\r\n`);
      }
    }

    showToast('mise 安装成功！已完成自动激活配置。', 'success');
    await checkMiseStatus();
    await checkEnvStatus();
  } else {
    showToast('安装未完成，请检查网络或终端输出日志', 'error');
  }
}

let isUpgradingMise = false;

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
  if (progressDetail) progressDetail.textContent = '正在连接 GitHub 发行源 (若较慢可先在设置配置代理)...';

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

  // 绑定取消按钮
  let userAborted = false;
  if (btnCancel) {
    btnCancel.onclick = async () => {
      userAborted = true;
      if (progressStatus) progressStatus.textContent = '正在中止升级任务...';
      if (progressDetail) progressDetail.textContent = '已发送终止信号...';
      appendTerminal(termOut, '\r\n⚠️ 用户手动中止了升级操作。\r\n');
      try {
        await window.miseAPI.mise.abortExec();
      } catch (e) {}
    };
  }

  // 监听输出流进行智能进度解析
  window.miseAPI.mise.onStream((data) => {
    appendTerminal(termOut, data);
    const text = String(data).toLowerCase();

    if (text.includes('checking') || text.includes('github') || text.includes('version') || text.includes('fetching')) {
      updateProgress(25, '正在检查最新版本与下载源...', '已连接 GitHub 仓库，正在检索发行构建...');
    } else if (text.includes('downloading') || text.includes('mise-v') || text.includes('.zip') || text.includes('.tar.gz')) {
      updateProgress(55, '正在下载最新构建资产...', '正在拉取 mise 预编译二进制组件...');
    } else if (text.includes('extracting') || text.includes('installing') || text.includes('replacing') || text.includes('upgrading')) {
      updateProgress(85, '正在解压并更新 mise 核心...', '解压资源并替换可执行程序...');
    } else if (text.includes('updated mise to') || text.includes('already up to date')) {
      updateProgress(100, '升级已完成！', '核心程序已更新至最新稳定版。');
    } else {
      // 提取可能的详细信息行
      const lines = String(data).trim().split(/\r?\n/).filter(Boolean);
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1].replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').trim();
        if (lastLine && progressDetail) {
          progressDetail.textContent = lastLine.slice(0, 80);
        }
      }
    }
  });

  // 超时熔断保护：120 秒
  let timeoutTriggered = false;
  const timer = setTimeout(async () => {
    if (isUpgradingMise) {
      timeoutTriggered = true;
      appendTerminal(termOut, '\r\n⚠️ 升级任务超过 120 秒无响应，可能因网络连接 GitHub 受限，已自动保护性终止。\r\n💡 建议在右上方“设置”中配置本地代理 (如 http://127.0.0.1:7890) 后重试。\r\n');
      try {
        await window.miseAPI.mise.abortExec();
      } catch (e) {}
    }
  }, 120000);

  let result;
  try {
    // 关键修复：加入 -y 自动确认参数，避免卡在 stdin 提示中
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
    if (progressStatus) progressStatus.textContent = '升级超时';
    if (progressDetail) progressDetail.textContent = '网络访问受限，请配置代理后重试';
    showToast('升级超时：国内直连 GitHub 受限，建议在设置中配置代理后重试', 'error');
    return;
  }

  if (result.success) {
    if (progressPercent) progressPercent.textContent = '100%';
    if (progressFill) progressFill.style.width = '100%';
    if (progressStatus) progressStatus.textContent = '✅ 升级完成！';
    if (progressDetail) progressDetail.textContent = 'mise 核心已成功更新。';
    showToast('mise 核心已升级到最新版本！', 'success');
    setTimeout(() => {
      if (progressWrap) progressWrap.style.display = 'none';
    }, 4000);
    await checkMiseStatus(true);
  } else {
    if (progressStatus) progressStatus.textContent = '❌ 升级未完成';
    if (progressDetail) progressDetail.textContent = '详情请查看下方控制台日志';
    showToast('升级未完成，请检查控制台日志或代理配置', 'error');
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
    btnGh.onclick = function() { openExternalWithFeedback(`https://github.com/${tool.github}`, this, `${tool.name} GitHub 仓库`); };
    linksEl.appendChild(btnGh);
  }
  if (tool.homepage) {
    const btnHome = document.createElement('button');
    btnHome.className = 'btn btn-ghost btn-sm';
    btnHome.textContent = '🌐 官方网站';
    btnHome.onclick = function() { openExternalWithFeedback(tool.homepage, this, `${tool.name} 官网`); };
    linksEl.appendChild(btnHome);
  }
  const btnMkt = document.createElement('button');
  btnMkt.className = 'btn btn-ghost btn-sm';
  btnMkt.textContent = '📋 查看 mise 市场页';
  btnMkt.onclick = function() { openExternalWithFeedback(`https://mise-versions.jdx.dev/${toolName}`, this, `${toolName} 市场页`); };
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
                      : `<button class="btn btn-primary btn-sm" title="设为全局默认版本：写入 ~/.config/mise/config.toml，在所有终端直接生效" onclick="event.stopPropagation();activateToolVersion('${escapeAttr(t.name)}', '${escapeAttr(v.version)}', true, this)">
                           🌟 设为全局使用
                         </button>
                         <button class="btn btn-ghost btn-sm" title="设为本地项目生效：选择工程目录并生成 .mise.toml，仅在该项目内生效" onclick="event.stopPropagation();activateToolVersion('${escapeAttr(t.name)}', '${escapeAttr(v.version)}', false, this)">
                           📍 本地项目使用
                         </button>`
                    }
                    <button class="btn btn-ghost btn-sm" title="在 Windows 资源管理器中打开安装目录" data-install-path="${escapeAttr(v.installPath)}" onclick="event.stopPropagation();openVersionFolderFromEl(this)">
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
  let targetCwd = null;
  if (!isGlobal) {
    showToast('请在弹出的窗口中选择需要应用此版本的本地项目文件夹...', 'info', 3000);
    const selectedDir = await window.miseAPI.dialog.selectDir();
    if (!selectedDir) {
      showToast('已取消本地项目版本配置', 'info');
      return;
    }
    targetCwd = selectedDir;
  }

  if (btn) {
    btn.classList.add('loading');
    btn.disabled = true;
  }
  try {
    const res = await window.miseAPI.mise.use(toolName, version, isGlobal, targetCwd);
    if (res.success) {
      if (isGlobal) {
        showToast(`已成功将 ${toolName}@${version} 设为全局默认版本 ✨`, 'success');
      } else {
        const folderName = targetCwd.split(/[\\/]/).pop() || targetCwd;
        showToast(`已成功为项目 [${folderName}] 配置本地版本 ${toolName}@${version} (生成 .mise.toml) ✨`, 'success', 4500);
        // 自动贴心在资源管理器中定位打开该项目文件夹，让用户第一时间确认
        setTimeout(() => {
          window.miseAPI.shell.openPath(targetCwd);
        }, 300);
      }
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

/** 从元素原生属性安全读取路径并打开物理安装文件夹，绝不经过 JS 字符串反斜杠转义 */
async function openVersionFolderFromEl(btn) {
  if (!btn) return;
  const fullPath = btn.getAttribute('data-install-path') || '';
  await openVersionFolder(fullPath);
}
window.openVersionFolderFromEl = openVersionFolderFromEl;

/** 打开指定版本的物理安装文件夹 */
async function openVersionFolder(fullPath) {
  if (!fullPath) {
    showToast('该版本未找到物理路径', 'warning');
    return;
  }
  const cleanPath = String(fullPath).trim();
  const ok = await window.miseAPI.shell.openPath(cleanPath);
  if (!ok) {
    showToast(`未能打开目录，请确认文件夹是否存在: ${cleanPath}`, 'warning', 3500);
  }
}
window.openVersionFolder = openVersionFolder;

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

  // 加载应用版本与在线更新信息
  loadAppVersionInfo();
}

/** 加载应用自身版本与宿主环境信息 */
async function loadAppVersionInfo() {
  try {
    const info = await window.miseAPI.app.getVersion();
    const verBadge = document.getElementById('app-current-version-badge');
    const elVer = document.getElementById('app-electron-ver');
    const nodeVer = document.getElementById('app-node-ver');
    const miseCoreVer = document.getElementById('app-mise-core-ver');

    if (verBadge && info.version) verBadge.textContent = `v${info.version}`;
    if (elVer && info.electron) elVer.textContent = info.electron;
    if (nodeVer && info.node) nodeVer.textContent = info.node;

    if (AppState.miseVersion && miseCoreVer) {
      miseCoreVer.textContent = `mise ${AppState.miseVersion}`;
    } else if (miseCoreVer) {
      miseCoreVer.textContent = '未就绪';
    }
  } catch (e) {
    console.error('加载版本信息失败:', e);
  }
}

/** 检查 Mise Manager 应用在线更新 */
async function checkAppUpdate() {
  const btn = document.getElementById('btn-check-app-update');
  const text = document.getElementById('check-update-text');
  const statusPill = document.getElementById('update-status-pill');
  const resultCard = document.getElementById('update-result-card');
  const resultIcon = document.getElementById('update-result-icon');
  const resultTitle = document.getElementById('update-result-title');
  const resultTime = document.getElementById('update-result-time');
  const resultNotes = document.getElementById('update-result-notes');
  const resultActions = document.getElementById('update-result-actions');

  if (btn) {
    btn.classList.add('loading');
    btn.disabled = true;
  }
  if (text) text.textContent = '正在检测 GitHub...';

  try {
    const res = await window.miseAPI.app.checkUpdate();
    if (resultCard) resultCard.style.display = 'block';
    if (resultTime) resultTime.textContent = new Date().toLocaleTimeString();

    if (res.success && res.hasUpdate) {
      if (statusPill) {
        statusPill.className = 'badge badge-warning';
        statusPill.style.background = 'rgba(255, 152, 0, 0.18)';
        statusPill.style.color = '#ff9800';
        statusPill.textContent = `发现新版 v${res.latestVersion}`;
      }
      if (resultIcon) resultIcon.textContent = '🎉';
      if (resultTitle) resultTitle.textContent = `发现更高版本可用: v${res.latestVersion} (当前 v${res.currentVersion})`;
      if (resultNotes) {
        resultNotes.className = 'markdown-body';
        resultNotes.innerHTML = renderMarkdown(res.releaseNotes || '包含性能改进和稳定性优化。');
      }
      if (resultActions) {
        resultActions.innerHTML = `
          <button class="btn btn-primary btn-sm" onclick="openExternalWithFeedback('${escapeAttr(res.downloadUrl)}', this, '新版本下载页面')">
            🚀 前往 GitHub 下载安装包
          </button>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('update-result-card').style.display='none'">
            稍后提醒
          </button>`;
      }
      showToast(`检测到新版本 v${res.latestVersion}，可点击前往下载`, 'info', 4000);
    } else if (res.success && !res.hasUpdate) {
      if (statusPill) {
        statusPill.className = 'badge badge-success';
        statusPill.textContent = '已是最新版';
      }
      if (resultIcon) resultIcon.textContent = '✨';
      if (resultTitle) resultTitle.textContent = '当前已是最新版本';
      if (resultNotes) {
        resultNotes.textContent = res.message || `当前版本 v${res.currentVersion} 为官方最新版本，无需更新。`;
      }
      if (resultActions) {
        resultActions.innerHTML = `
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('update-result-card').style.display='none'">
            我知道了
          </button>`;
      }
      showToast('当前已是最新版 Mise Manager ✨', 'success');
    } else {
      if (resultIcon) resultIcon.textContent = '⚠️';
      if (resultTitle) resultTitle.textContent = '未能获取版本信息';
      if (resultNotes) {
        resultNotes.textContent = `网络请求失败: ${res.error || '无法连接 GitHub API'}\n如果处于特定网络环境，可在下方配置代理后重试，或直接访问 Releases 页面查看。`;
      }
      if (resultActions) {
        resultActions.innerHTML = `
          <button class="btn btn-secondary btn-sm" onclick="openExternalWithFeedback('https://github.com/kikock/mise-manager/releases', this, 'Releases 页面')">
            🌐 打开 Releases 网页
          </button>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('update-result-card').style.display='none'">
            关闭
          </button>`;
      }
      showToast('检查更新失败，请检查网络连接', 'error');
    }
  } catch (err) {
    showToast('更新检查异常: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
    if (text) text.textContent = '检查应用更新';
  }
}

// ═══════════════════════════════════════════════
// 历史发行版本模态框逻辑
// ═══════════════════════════════════════════════

function closeReleasesModal() {
  const modal = document.getElementById('releases-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

async function showReleasesModal() {
  const modal = document.getElementById('releases-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  const bodyEl = document.getElementById('releases-modal-body');
  const badgeEl = document.getElementById('releases-current-badge');
  const cacheTag = document.getElementById('releases-cache-tag');
  const statusTip = document.getElementById('releases-status-tip');

  let currentVer = '1.0.0';
  try {
    const vInfo = await window.miseAPI.app.getVersion();
    if (vInfo && vInfo.version) {
      currentVer = vInfo.version;
      if (badgeEl) badgeEl.textContent = `v${currentVer}`;
    }
  } catch (e) {}

  bodyEl.innerHTML = `
    <div class="empty-state" style="padding:40px 0">
      <div class="empty-icon" style="animation:spin 1s linear infinite;display:inline-block">🔄</div>
      <div class="empty-title" style="margin-top:10px">正在获取历史发行版本...</div>
      <div style="font-size:12px;color:var(--text-tertiary);margin-top:6px">如遇网络受限将自动提供本地降级列表</div>
    </div>
  `;

  try {
    const res = await window.miseAPI.app.getReleases();
    if (cacheTag) cacheTag.style.display = res.fromCache ? 'inline-block' : 'none';

    const releases = (res && res.releases && res.releases.length > 0)
      ? res.releases
      : (res.cachedReleases || []);

    if (releases.length === 0) {
      bodyEl.innerHTML = `
        <div style="padding:16px;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:var(--radius-md);margin-bottom:12px">
          <div class="flex-between" style="align-items:center;margin-bottom:8px">
            <div class="flex gap-8" style="align-items:center">
              <span class="badge badge-success" style="font-size:13px;padding:3px 10px">v${currentVer}</span>
              <span style="font-weight:600;font-size:14px">当前安装版本 (官方正式发布)</span>
            </div>
            <span style="font-size:11.5px;color:var(--text-tertiary)">本地已知</span>
          </div>
          <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
            由于网络连接受限，未能从 GitHub Releases 抓取历史发布流。<br>
            您可直接在外部浏览器中访问 GitHub 专页查看或下载最新历史构建。
          </div>
          <div class="flex gap-8">
            <button class="btn btn-primary btn-sm" onclick="openExternalWithFeedback('https://github.com/kikock/mise-manager/releases', this, 'Releases')">
              🚀 浏览器打开 Releases
            </button>
            <button class="btn btn-ghost btn-sm" onclick="showReleasesModal()">
              🔄 重试同步
            </button>
          </div>
        </div>
      `;
      if (statusTip) statusTip.textContent = `提示: ${res.error || '无法直连 GitHub API'}`;
      return;
    }

    let html = '';
    releases.forEach((r, idx) => {
      const isCurrent = (r.tag === currentVer || r.tagName === `v${currentVer}`);
      const pubDate = r.publishedAt 
        ? new Date(r.publishedAt).toLocaleDateString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit' }) 
        : '官方发布';
      const safeBody = (r.body || '包含性能改进和稳定性优化。')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      const assetListHtml = (r.assets && r.assets.length > 0)
        ? `
          <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border)">
            <div style="font-size:11.5px;color:var(--text-secondary);margin-bottom:6px;font-weight:600">📦 安装包产物与安装文件:</div>
            <div class="flex gap-8" style="flex-wrap:wrap">
              ${r.assets.map(a => {
                const mb = (a.size / (1024 * 1024)).toFixed(1);
                return `
                  <button class="btn btn-secondary btn-sm" style="font-size:11px;padding:3px 9px" onclick="openExternalWithFeedback('${escapeAttr(a.downloadUrl)}', this, '${escapeAttr(a.name)}')">
                    ⬇️ ${escapeHtml(a.name)} <span style="opacity:0.7">(${mb}MB)</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        `
        : '';

      html += `
        <div style="padding:16px 18px;background:var(--bg-tertiary);border:1px solid ${isCurrent ? 'var(--accent)' : 'var(--border)'};border-radius:var(--radius-md);margin-bottom:12px">
          <div class="flex-between" style="align-items:center;margin-bottom:8px">
            <div class="flex gap-8" style="align-items:center">
              <span class="badge ${isCurrent ? 'badge-success' : 'badge-neutral'}" style="font-size:13px;font-weight:700;padding:2px 9px">
                ${escapeHtml(r.tagName || ('v' + r.tag))}
              </span>
              <span style="font-weight:600;font-size:13.5px;color:var(--text-primary)">
                ${escapeHtml(r.name || r.tagName)}
              </span>
              ${isCurrent ? '<span class="badge badge-info" style="font-size:10.5px;padding:1px 6px">当前使用</span>' : ''}
              ${r.isPrerelease ? '<span class="badge badge-warning" style="font-size:10.5px;padding:1px 6px">预发布</span>' : ''}
            </div>
            <span style="font-size:11.5px;color:var(--text-tertiary)">${pubDate}</span>
          </div>
          <div class="markdown-body" style="max-height:180px;overflow-y:auto;background:var(--bg-card);padding:10px 14px;border-radius:var(--radius-sm);border:1px solid rgba(255,255,255,0.03)">${renderMarkdown(r.body || '包含多项体验优化与稳定性修复。')}</div>
          ${assetListHtml}
          <div style="margin-top:10px;display:flex;justify-content:flex-end;gap:8px">
            <button class="btn btn-ghost btn-sm" style="font-size:11.5px" onclick="openExternalWithFeedback('${escapeAttr(r.htmlUrl || 'https://github.com/kikock/mise-manager/releases')}', this, 'GitHub Release 页面')">
              🔗 在 GitHub 查看发布详情
            </button>
          </div>
        </div>
      `;
    });

    bodyEl.innerHTML = html;
    if (statusTip) {
      statusTip.textContent = res.fromCache 
        ? '⚡ 已从本地高速缓存瞬间加载 · 共 ' + releases.length + ' 个版本记录' 
        : '✨ 已实时同步官方发布记录 · 共 ' + releases.length + ' 个版本记录';
    }
  } catch (err) {
    bodyEl.innerHTML = `
      <div class="empty-state" style="padding:30px 0">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">获取版本列表失败</div>
        <div style="font-size:12px;color:var(--text-secondary);margin:8px 0 16px">${escapeHtml(err.message || '网络连接异常')}</div>
        <button class="btn btn-primary btn-sm" onclick="openExternalWithFeedback('https://github.com/kikock/mise-manager/releases', this, 'Releases')">
          🌐 直接在浏览器中访问 GitHub Releases
        </button>
      </div>
    `;
  }
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

    // 同步检测终端与 Shims 激活状态
    await checkActivationStatus();

    // 同步读取 mise 运行时自动安装设定
    await loadMiseSettings();
  } catch (e) {
    console.error('获取环境变量失败:', e);
  }
}

/** 检测终端与 Shims 激活状态 (CMD & PowerShell) */
async function checkActivationStatus() {
  const badgeCmd = document.getElementById('badge-cmd-activation');
  const badgePwsh = document.getElementById('badge-pwsh-activation');
  const txtPs51 = document.getElementById('txt-ps51-status');
  const txtPs7 = document.getElementById('txt-ps7-status');

  try {
    const [env, pwsh] = await Promise.all([
      window.miseAPI.env.get().catch(() => null),
      window.miseAPI.env.getPwshProfileStatus().catch(() => null),
    ]);

    // 1. CMD / 通用终端 Shims 垫片状态
    if (badgeCmd) {
      if (env && env.pathHasBinDir) {
        badgeCmd.innerHTML = '<span class="badge badge-success">✅ 已激活 (Shims 已在 Path)</span>';
      } else {
        badgeCmd.innerHTML = '<span class="badge badge-warning">⚠️ 未激活 (未加入 Path)</span>';
      }
    }

    // 2. PowerShell Profile 状态
    if (pwsh && pwsh.success) {
      if (txtPs51) {
        txtPs51.innerHTML = pwsh.ps51Activated
          ? '<span style="color:#81c784;font-weight:600">✅ 已激活</span>'
          : (pwsh.ps51Exists ? '<span style="color:#ffb74d">⚠️ 未激活</span>' : '<span style="color:var(--text-tertiary)">⚪ 未创建</span>');
      }
      if (txtPs7) {
        txtPs7.innerHTML = pwsh.ps7Activated
          ? '<span style="color:#81c784;font-weight:600">✅ 已激活</span>'
          : (pwsh.ps7Exists ? '<span style="color:#ffb74d">⚠️ 未激活</span>' : '<span style="color:var(--text-tertiary)">⚪ 未创建</span>');
      }
      if (badgePwsh) {
        if (pwsh.ps51Activated || pwsh.ps7Activated) {
          badgePwsh.innerHTML = '<span class="badge badge-success">✅ 已激活 (Hook 已注入)</span>';
        } else {
          badgePwsh.innerHTML = '<span class="badge badge-warning">⚠️ 未激活</span>';
        }
      }
    } else if (badgePwsh) {
      badgePwsh.innerHTML = '<span class="badge badge-neutral">检测失败</span>';
    }
  } catch (err) {
    console.error('检测终端激活状态异常:', err);
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

/** 一键写入激活脚本到 PowerShell Profile */
async function applyPwshProfileSettings() {
  const btn = document.getElementById('btn-apply-pwsh-profile');
  const oldText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ 正在写入 Profile...';
  }

  try {
    const res = await window.miseAPI.env.applyPwshProfile();
    if (res && res.success) {
      showToast('⚡ PowerShell Profile 激活脚本已写入完成！（已自动屏蔽 5.1 告警）', 'success', 4500);
      await checkActivationStatus();
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

/** 从 PowerShell Profile 中移除激活脚本 */
async function removePwshProfileSettings() {
  if (!confirm('确定要从 PowerShell Profile 中移除 mise 激活配置吗？')) {
    return;
  }
  const btn = document.getElementById('btn-remove-pwsh-profile');
  if (btn) btn.disabled = true;

  try {
    const res = await window.miseAPI.env.removePwshProfile();
    if (res && res.success) {
      showToast('🗑️ 已成功从 PowerShell Profile 中移除激活脚本！', 'info');
      await checkActivationStatus();
    } else {
      showToast('移除失败: ' + (res?.error || '未知错误'), 'error');
    }
  } catch (err) {
    showToast('执行异常: ' + err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

/** 读取并同步 mise 运行时自动安装设置 */
async function loadMiseSettings() {
  const chkNotFound = document.getElementById('chk-not-found-auto-install');
  const chkAuto = document.getElementById('chk-auto-install');
  if (!chkNotFound || !chkAuto) return;

  try {
    const res = await window.miseAPI.mise.getSettings();
    if (res && res.success) {
      chkNotFound.checked = !!res.not_found_auto_install;
      chkAuto.checked = res.auto_install !== false;
    }
  } catch (e) {
    console.error('获取 mise 运行时设定失败:', e);
  }
}

/** 一键扫描并全量补齐所有已声明工具 */
async function installMissingTools() {
  const btn = document.getElementById('btn-install-missing-tools');
  const oldText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ 正在补齐工具...';
  }

  showToast('开始扫描并补齐所有已声明工具，请稍候...', 'info', 3000);
  try {
    const res = await window.miseAPI.mise.installAll();
    if (res && res.success) {
      showToast('🎉 所有已声明工具已成功补齐安装就绪！', 'success', 4500);
      await loadInstalledTools();
      await checkMiseStatus();
    } else {
      showToast('补齐未完全成功，请检查网络或日志输出', 'error');
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
  document.getElementById('btn-refresh-status').onclick = () => {
    showToast('正在实时重新核验 mise 核心状态...', 'info', 1500);
    checkMiseStatus(true);
  };
  document.getElementById('btn-install-mise').onclick   = installMise;
  document.getElementById('btn-upgrade-mise').onclick   = upgradeMise;
  document.getElementById('btn-open-config').onclick    = async () => {
    if (AppState.miseDataDir) {
      const ok = await window.miseAPI.shell.openPath(AppState.miseDataDir);
      if (!ok) window.miseAPI.shell.openExternal(AppState.miseDataDir);
    }
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
  document.getElementById('btn-open-mise-data-dir').onclick = async () => {
    if (AppState.miseDataDir) {
      const ok = await window.miseAPI.shell.openPath(AppState.miseDataDir);
      if (!ok) window.miseAPI.shell.openExternal(AppState.miseDataDir);
    }
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

  // 终端与 Shims 激活管理按钮
  document.getElementById('btn-refresh-activation')?.addEventListener('click', async () => {
    await checkActivationStatus();
    showToast('终端激活状态已刷新', 'info');
  });
  document.getElementById('btn-activate-cmd')?.addEventListener('click', applyEnvSettings);
  document.getElementById('btn-apply-pwsh-profile')?.addEventListener('click', applyPwshProfileSettings);
  document.getElementById('btn-remove-pwsh-profile')?.addEventListener('click', removePwshProfileSettings);

  // 运行时自动安装设定与补齐工具
  document.getElementById('chk-not-found-auto-install')?.addEventListener('change', async function() {
    await window.miseAPI.mise.setSetting('not_found_auto_install', this.checked);
    showToast(this.checked ? '⚡ 已开启：终端执行未安装命令将自动拉取安装' : '已关闭终端执行自动安装', 'info');
  });
  document.getElementById('chk-auto-install')?.addEventListener('change', async function() {
    await window.miseAPI.mise.setSetting('auto_install', this.checked);
    showToast(this.checked ? '已开启环境变更自动安装' : '已关闭环境变更自动安装', 'info');
  });
  document.getElementById('btn-refresh-mise-settings')?.addEventListener('click', async () => {
    await loadMiseSettings();
    showToast('运行时设定已刷新', 'info');
  });
  document.getElementById('btn-install-missing-tools')?.addEventListener('click', installMissingTools);

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
  document.getElementById('btn-save-proxy').onclick = async () => {
    const v = document.getElementById('input-proxy').value.trim();
    localStorage.setItem('mise-proxy', v);
    try {
      await window.miseAPI.config.set({ proxy: v });
      showToast('代理设置已保存并同步给子进程与升级服务', 'success');
    } catch (e) {
      showToast('代理已保存到本地: ' + e.message, 'warning');
    }
  };
  document.getElementById('btn-clean-cache').onclick = async () => {
    const r = await window.miseAPI.mise.exec(['cache', 'clear']);
    showToast(r.success ? '下载缓存已成功清理' : '清理失败: ' + (r.output || ''), r.success ? 'success' : 'error');
  };

  // 应用版本更新与发行版查看
  document.getElementById('btn-check-app-update')?.addEventListener('click', checkAppUpdate);
  document.getElementById('btn-view-releases')?.addEventListener('click', showReleasesModal);

  // 历史发行版本模态框事件
  document.getElementById('releases-modal-close')?.addEventListener('click', closeReleasesModal);
  document.getElementById('releases-modal-cancel')?.addEventListener('click', closeReleasesModal);
  document.getElementById('releases-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('releases-modal')) closeReleasesModal();
  });
  document.getElementById('btn-releases-open-browser')?.addEventListener('click', function() {
    openExternalWithFeedback('https://github.com/kikock/mise-manager/releases', this, 'GitHub Releases 页面');
  });

  // 底部外部链接
  document.getElementById('btn-mise-docs').onclick = function() { openExternalWithFeedback('https://mise.jdx.dev', this, 'Mise 官方文档'); };
  document.getElementById('btn-mise-github').onclick = function() { openExternalWithFeedback('https://github.com/jdx/mise', this, 'Mise GitHub 源码'); };
  document.getElementById('btn-mise-versions-github').onclick = function() { openExternalWithFeedback('https://github.com/jdx/mise-versions', this, 'mise-versions 生态源码'); };
  document.getElementById('btn-mise-versions-site').onclick = function() { openExternalWithFeedback('https://mise-versions.jdx.dev', this, '生态索引市场'); };

  // 开发者与开源致谢外部链接
  document.getElementById('link-author-badge')?.addEventListener('click', function(e) {
    e.preventDefault();
    openExternalWithFeedback('https://github.com/kikock', this, 'kikock GitHub 主页');
  });
  document.getElementById('btn-author-kikock')?.addEventListener('click', function(e) {
    e.preventDefault();
    openExternalWithFeedback('https://github.com/kikock', this, 'kikock GitHub 主页');
  });
  document.getElementById('btn-github-kikock')?.addEventListener('click', function(e) {
    e.preventDefault();
    openExternalWithFeedback('https://github.com/kikock', this, 'kikock GitHub 主页');
  });
  document.getElementById('btn-project-repo')?.addEventListener('click', function(e) {
    e.preventDefault();
    openExternalWithFeedback('https://github.com/kikock/mise-manager', this, 'Mise Manager 源码仓库');
  });
  document.getElementById('btn-thanks-mise-versions')?.addEventListener('click', function(e) {
    e.preventDefault();
    openExternalWithFeedback('https://github.com/jdx/mise-versions', this, 'jdx/mise-versions 生态源码');
  });

  // 快捷键与网络
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeReleasesModal();
    }
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

  // 回填代理配置
  try {
    const savedProxy = localStorage.getItem('mise-proxy') || '';
    const proxyInput = document.getElementById('input-proxy');
    if (proxyInput && savedProxy) {
      proxyInput.value = savedProxy;
    }
  } catch (e) {}

  // 1. 优先以微秒级恢复上次本地状态与已安装快照，实现秒开与零等待
  restoreCachedState();

  // 2. 异步检测 mise 运行状态与配置，后台静默刷新
  checkMiseStatus().catch(err => console.error('checkMiseStatus 启动异常:', err));

  // 3. 在用户空闲时静默预读取市场缓存，绝不与首屏竞争资源
  const scheduleIdle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1800));
  scheduleIdle(async () => {
    try {
      const info = await window.miseAPI.market.getCacheInfo();
      if (info && info.exists && !AppState.marketLoaded) {
        loadMarket(false);
      }
    } catch (e) {}
  });

  console.log('✅ Mise Manager 极速就绪');
}

document.addEventListener('DOMContentLoaded', init);
