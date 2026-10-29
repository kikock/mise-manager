/**
 * Mise Manager — 核心前端应用调度总线 (app.js)
 * 职责：全局状态中心、路由调度、主题调色盘系统、事件总线绑定与首屏生命周期
 */

'use strict';

// ═══════════════════════════════════════════════
// 全局应用状态中心
// ═══════════════════════════════════════════════
const AppState = {
  currentPage: 'home',
  miseInstalled: false,
  miseVersion: null,
  miseDataDir: '',
  miseBinDir: '',
  miseBinPath: '',
  installedTools: [],
  marketTools: [],
  marketFiltered: [],
  marketLoaded: false,
  marketLoading: false,
  marketFilterType: 'all',
  installedLoaded: false,
};
window.AppState = AppState;

// ═══════════════════════════════════════════════
// 路由机制
// ═══════════════════════════════════════════════
function navigateTo(page) {
  if (AppState.currentPage === page) return;
  AppState.currentPage = page;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  document.querySelectorAll('.page').forEach(el => {
    el.classList.toggle('active', el.id === `page-${page}`);
  });

  if (page === 'market' && !AppState.marketLoaded) loadMarket();
  if (page === 'installed') loadInstalledTools();
  if (page === 'settings') loadSettings();
}
window.navigateTo = navigateTo;

// ═══════════════════════════════════════════════
// Fluent Design 现代全景主题调色盘
// ═══════════════════════════════════════════════
function renderThemePaletteUI() {
  if (!window.MiseTheme) return;
  const cfg = window.MiseTheme.getThemeConfig();
  const effectiveMode = cfg.mode === 'system'
    ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : cfg.mode;

  ['light', 'auto', 'dark'].forEach(m => {
    const btn = document.getElementById(`btn-theme-${m}-seg`);
    if (btn) {
      btn.classList.toggle('active', (m === 'auto' && cfg.mode === 'system') || (m === cfg.mode));
    }
  });

  const grid = document.getElementById('theme-palette-grid');
  const titleLabel = document.getElementById('palette-title-label');
  if (grid) {
    const presets = effectiveMode === 'light' ? window.MiseTheme.LIGHT_PRESETS : window.MiseTheme.DARK_PRESETS;
    if (titleLabel) {
      titleLabel.textContent = effectiveMode === 'light' ? '浅色精选色盘 (28 款典雅色系)' : '深色精选色盘 (8 款精雕细琢)';
    }

    grid.innerHTML = presets.map(p => {
      const isSelected = effectiveMode === 'light'
        ? p.id === cfg.selectedLightPreset
        : p.id === cfg.selectedDarkPreset;
      return `
        <div class="color-swatch-circle ${isSelected ? 'selected' : ''}"
             data-preset-id="${p.id}"
             data-mode="${p.mode}"
             style="background-color:${p.bgApp};border:1.5px solid ${p.border};"
             title="${p.name} (${p.bgApp})">
          ${isSelected ? `<span class="check-mark" style="color:${p.mode === 'light' ? '#1a1a1a' : '#ffffff'}">✓</span>` : ''}
        </div>`;
    }).join('');

    grid.querySelectorAll('.color-swatch-circle').forEach(el => {
      el.onclick = () => {
        const pId = el.getAttribute('data-preset-id');
        const mode = el.getAttribute('data-mode');
        const nextCfg = window.MiseTheme.getThemeConfig();
        if (mode === 'light') nextCfg.selectedLightPreset = pId;
        else nextCfg.selectedDarkPreset = pId;
        window.MiseTheme.saveThemeConfig(nextCfg);
        renderThemePaletteUI();
      };
    });
  }

  const switchAccent = document.getElementById('switch-custom-accent');
  const accentBox = document.getElementById('custom-accent-palette-box');
  const accentRow = document.getElementById('accent-colors-row');

  if (switchAccent) {
    switchAccent.checked = !!cfg.useCustomAccent;
    if (accentBox) accentBox.style.display = cfg.useCustomAccent ? 'block' : 'none';
  }

  if (accentRow) {
    accentRow.innerHTML = window.MiseTheme.ACCENT_PRESETS.map(item => {
      const isAct = cfg.useCustomAccent && cfg.customAccent.toLowerCase() === item.color.toLowerCase();
      return `
        <button class="btn btn-secondary btn-sm"
                data-accent-color="${item.color}"
                style="display:inline-flex;align-items:center;gap:6px;border-radius:16px;${isAct ? `border:2px solid ${item.color};background:rgba(255,255,255,0.08);font-weight:600;` : 'border:1px solid var(--border);'}">
          <span style="width:12px;height:12px;border-radius:50%;background-color:${item.color};display:inline-block"></span>
          <span>${item.name}</span>
        </button>`;
    }).join('');

    accentRow.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => {
        const col = btn.getAttribute('data-accent-color');
        const nextCfg = window.MiseTheme.getThemeConfig();
        nextCfg.customAccent = col;
        nextCfg.useCustomAccent = true;
        window.MiseTheme.saveThemeConfig(nextCfg);
        renderThemePaletteUI();
      };
    });
  }

  const iconEl = document.getElementById('theme-toggle-icon');
  if (iconEl) iconEl.textContent = effectiveMode === 'light' ? '☀️' : '🌙';
}
window.renderThemePaletteUI = renderThemePaletteUI;

function initTheme() {
  if (!window.MiseTheme) return;
  const cfg = window.MiseTheme.getThemeConfig();
  window.MiseTheme.applyThemeConfig(cfg);
  renderThemePaletteUI();

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      const currentCfg = window.MiseTheme.getThemeConfig();
      if (currentCfg.mode === 'system') {
        window.MiseTheme.applyThemeConfig(currentCfg);
        renderThemePaletteUI();
      }
    });
  }
}

function applyTheme(theme) {
  if (!window.MiseTheme) return;
  const cfg = window.MiseTheme.getThemeConfig();
  cfg.mode = theme === 'auto' ? 'system' : theme;
  window.MiseTheme.saveThemeConfig(cfg);
  renderThemePaletteUI();
}
window.applyTheme = applyTheme;

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
  document.getElementById('btn-minimize').onclick = () => window.miseAPI.window.minimize();
  document.getElementById('btn-maximize').onclick = () => window.miseAPI.window.maximize();
  document.getElementById('btn-close').onclick    = () => window.miseAPI.window.close();

  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.page));
  });
  document.getElementById('btn-view-all')?.addEventListener('click', () => navigateTo('installed'));
  document.getElementById('btn-settings-shortcut')?.addEventListener('click', () => navigateTo('settings'));

  document.getElementById('btn-copy-home-log')?.addEventListener('click', () => copyTerminalLog('home-terminal-output'));
  document.getElementById('btn-copy-modal-log')?.addEventListener('click', () => copyTerminalLog('modal-terminal-output'));

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

  document.getElementById('btn-refresh-market').onclick = () => loadMarket(true);
  document.getElementById('market-search').addEventListener('input', (e) => {
    searchMarket(e.target.value);
  });
  document.getElementById('filter-all').onclick     = () => filterMarket('all');
  document.getElementById('filter-popular').onclick = () => filterMarket('popular');

  document.getElementById('btn-refresh-installed').onclick = loadInstalledTools;
  document.getElementById('installed-search')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = AppState.installedTools.filter(t => 
      t.name.toLowerCase().includes(q) ||
      (t.versions && t.versions.some(v => v.version.toLowerCase().includes(q)))
    );
    renderInstalledList(filtered);
  });

  document.getElementById('modal-close').onclick  = closeModal;
  document.getElementById('modal-cancel').onclick = closeModal;
  document.getElementById('tool-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('tool-modal')) closeModal();
  });

  document.getElementById('btn-browse-root-dir')?.addEventListener('click', async () => {
    const dir = await window.miseAPI.dialog.selectDir();
    if (dir) {
      document.getElementById('input-mise-root-dir').value = dir;
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

  document.getElementById('btn-uninstall-mise-home')?.addEventListener('click', uninstallMise);
  document.getElementById('btn-uninstall-mise-settings')?.addEventListener('click', uninstallMise);

  document.getElementById('btn-refresh-env')?.addEventListener('click', async () => {
    await checkEnvStatus();
    showToast('环境变量检测已刷新', 'info');
  });
  document.getElementById('btn-apply-env')?.addEventListener('click', applyEnvSettings);
  document.getElementById('btn-remove-env')?.addEventListener('click', removeEnvSettings);

  document.getElementById('btn-refresh-activation')?.addEventListener('click', async () => {
    await checkActivationStatus();
    showToast('终端激活状态已刷新', 'info');
  });
  document.getElementById('btn-activate-cmd')?.addEventListener('click', applyEnvSettings);
  document.getElementById('btn-apply-pwsh-profile')?.addEventListener('click', applyPwshProfileSettings);
  document.getElementById('btn-remove-pwsh-profile')?.addEventListener('click', removePwshProfileSettings);

  document.getElementById('chk-not-found-auto-install')?.addEventListener('change', async function() {
    await window.miseAPI.mise.setSetting('not_found_auto_install', this.checked);
    showToast(this.checked ? '⚡ 已开启：终端执行未安装命令将自动拉取' : '已关闭终端自动安装', 'info');
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

  document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'light' ? 'dark' : 'light');
    showToast(current === 'light' ? '已切换至深色模式 🌙' : '已切换至浅色模式 ☀️', 'info', 2000);
  });
  document.getElementById('btn-theme-dark-seg')?.addEventListener('click', () => {
    applyTheme('dark');
    showToast('已切换至深色模式 🌙', 'info', 2000);
  });
  document.getElementById('btn-theme-light-seg')?.addEventListener('click', () => {
    applyTheme('light');
    showToast('已切换至浅色模式 ☀️', 'info', 2000);
  });
  document.getElementById('btn-theme-auto-seg')?.addEventListener('click', () => {
    applyTheme('auto');
    showToast('已设置为跟随系统外观 💻', 'info', 2000);
  });
  document.getElementById('switch-custom-accent')?.addEventListener('change', function() {
    if (!window.MiseTheme) return;
    const cfg = window.MiseTheme.getThemeConfig();
    cfg.useCustomAccent = this.checked;
    window.MiseTheme.saveThemeConfig(cfg);
    renderThemePaletteUI();
    showToast(this.checked ? '已开启自定义强调色 ✨' : '已恢复默认主题色', 'info', 2000);
  });

  document.getElementById('btn-refresh-cache').onclick = async () => {
    const btn = document.getElementById('btn-refresh-cache');
    btn.classList.add('loading');
    btn.disabled = true;
    try {
      await loadMarket(true);
      await loadCacheInfo();
      showToast('官方工具生态已完成全量同步', 'success');
    } catch (e) {
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

  document.getElementById('btn-save-proxy').onclick = async () => {
    const v = document.getElementById('input-proxy').value.trim();
    localStorage.setItem('mise-proxy', v);
    try {
      await window.miseAPI.config.set({ proxy: v });
      showToast('代理设置已保存并同步给子进程', 'success');
    } catch (e) {
      showToast('代理已保存到本地: ' + e.message, 'warning');
    }
  };
  document.getElementById('btn-clean-cache').onclick = async () => {
    const r = await window.miseAPI.mise.exec(['cache', 'clear']);
    showToast(r.success ? '下载缓存已成功清理' : '清理失败: ' + (r.output || ''), r.success ? 'success' : 'error');
  };

  document.getElementById('btn-check-app-update')?.addEventListener('click', checkAppUpdate);
  document.getElementById('btn-view-releases')?.addEventListener('click', showReleasesModal);
  document.getElementById('releases-modal-close')?.addEventListener('click', closeReleasesModal);
  document.getElementById('releases-modal-cancel')?.addEventListener('click', closeReleasesModal);
  document.getElementById('releases-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('releases-modal')) closeReleasesModal();
  });
  document.getElementById('btn-releases-open-browser')?.addEventListener('click', function() {
    openExternalWithFeedback('https://github.com/kikock/mise-manager/releases', this, 'GitHub Releases 页面');
  });

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

  try {
    const savedProxy = localStorage.getItem('mise-proxy') || '';
    const proxyInput = document.getElementById('input-proxy');
    if (proxyInput && savedProxy) proxyInput.value = savedProxy;
  } catch (e) {}

  restoreCachedState();
  checkMiseStatus().catch(err => console.error('checkMiseStatus 启动异常:', err));

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
