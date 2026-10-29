/**
 * Mise Manager — 应用市场模块 (pages/market.js)
 * 职责：官方生态工具拉取、搜索筛选、详情模态框与版本安装/卸载
 */

'use strict';

/** 加载应用市场工具列表（支持离线缓存优先） */
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
    if (progressBarWrap) progressBarWrap.style.display = 'block';
    if (progressFill) progressFill.style.width = '0%';
    if (progressText) progressText.textContent = '开始同步...';
  }

  window.miseAPI.market.onProgress((data) => {
    if (progressBarWrap) progressBarWrap.style.display = 'block';
    const percent = data.total > 0 ? Math.round((data.current / data.total) * 100) : 0;
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `第 ${data.current} / ${data.total} 页 · 已拉取 ${data.count} 个工具`;

    const setFill = document.getElementById('settings-sync-progress-fill');
    const setPercent = document.getElementById('settings-sync-percent');
    const setStatus = document.getElementById('settings-sync-status-text');
    if (setFill) setFill.style.width = `${percent}%`;
    if (setPercent) setPercent.textContent = `${percent}%`;
    if (setStatus) setStatus.textContent = `🔄 正在全量同步生态数据 (${percent}%)...`;
  });

  if (countEl) countEl.textContent = '正在获取官方工具列表...';

  const result = await window.miseAPI.market.fetchTools({ useCache: !forceRefresh });
  window.miseAPI.market.removeProgressListener();

  if (progressBarWrap) progressBarWrap.style.display = 'none';
  AppState.marketLoading = false;

  if (!result.success || !result.tools || result.tools.length === 0) {
    if (grid) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:40px">
        <div class="empty-icon">🌐</div>
        <div class="empty-title">无法拉取市场数据</div>
        <div class="empty-desc">${escapeHtml(result.error || '网络超时或连接失败，可配置代理后重试')}</div>
        <button class="btn btn-primary mt-8" onclick="loadMarket(true)">重试同步</button>
      </div>`;
    }
    if (countEl) countEl.textContent = '同步失败';
    return;
  }

  AppState.marketTools = result.tools.filter(t => t.name);
  AppState.marketLoaded = true;

  if (cacheBadge) {
    cacheBadge.style.display = result.fromCache ? 'inline-flex' : 'none';
    if (result.fromCache) cacheBadge.title = `缓存于: ${formatDateTime(result.cachedAt)}`;
  }

  const navBadge = document.getElementById('market-count');
  if (navBadge) navBadge.textContent = AppState.marketTools.length;

  filterMarket(AppState.marketFilterType || 'all');
  if (forceRefresh) {
    showToast(`市场同步完成！共载入 ${AppState.marketTools.length} 款工具`, 'success');
  }
}
window.loadMarket = loadMarket;

/** 过滤应用市场列表 */
function filterMarket(filter) {
  AppState.marketFilterType = filter;
  let list = AppState.marketTools;

  if (filter === 'popular') {
    list = [...list].sort((a, b) => (b.version_count || 0) - (a.version_count || 0)).slice(0, 36);
  }

  AppState.marketFiltered = list;
  renderMarketTools(list);

  const btnAll = document.getElementById('filter-all');
  const btnPop = document.getElementById('filter-popular');
  if (btnAll && btnPop) {
    btnAll.className = filter === 'all' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm';
    btnPop.className = filter === 'popular' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm';
  }
}
window.filterMarket = filterMarket;

/** 渲染市场工具卡片列表 */
function renderMarketTools(tools) {
  const grid = document.getElementById('market-tool-grid');
  const countEl = document.getElementById('market-tool-count');

  if (countEl) countEl.textContent = `当前展示 ${tools.length} 个工具 (总计 ${AppState.marketTools.length})`;
  if (!grid) return;

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
window.renderMarketTools = renderMarketTools;

/** 搜索市场工具 */
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
  const countEl = document.getElementById('market-tool-count');
  if (countEl) countEl.textContent = `匹配到 ${filtered.length} 个工具`;
}
window.searchMarket = searchMarket;

/** 打开工具详情及版本管理模态框 */
async function openToolModal(toolName) {
  const modal = document.getElementById('tool-modal');
  const tool = AppState.marketTools.find(t => t.name === toolName) || { name: toolName };

  document.getElementById('modal-tool-name').textContent = `${getToolEmoji(toolName)} ${toolName}`;
  document.getElementById('modal-tool-desc').textContent = tool.description || 'mise 官方工具库支持的软件包';
  document.getElementById('modal-latest-badge').textContent = `最新: ${tool.latest_version || '-'}`;
  document.getElementById('modal-stable-badge').textContent = `稳定: ${tool.latest_stable_version || '-'}`;
  document.getElementById('modal-count-badge').textContent = `版本数: ${tool.version_count || '-'}`;

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
window.openToolModal = openToolModal;

/** 获取远程工具版本列表 */
async function loadToolVersions(toolName, tool) {
  const versionList = document.getElementById('modal-version-list');
  const progressBar = document.getElementById('modal-progress-bar');

  const result = await window.miseAPI.market.fetchVersions(toolName);
  progressBar.style.display = 'none';

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
}
window.loadToolVersions = loadToolVersions;

/** 安装指定版本工具 */
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

  const whereInfo = await window.miseAPI.mise.where(`${toolName}@${version}`);
  const isInstalled = result.success || (whereInfo && whereInfo.found);

  if (isInstalled) {
    if (whereInfo && whereInfo.path) {
      appendTerminal(termOut, `\n[校验成功] 工具已安装到本地: ${whereInfo.path}\n`);
    }
    showToast(`${toolName}@${version} 安装成功！`, 'success');
    btn.textContent = '已安装';
    btn.className = 'btn btn-secondary btn-sm';
    btn.disabled = true;
    AppState.installedLoaded = false;
    await window.loadHomeTools();
  } else {
    showToast(`安装失败: ${result.output || ''}`, 'error');
    btn.textContent = '安装';
  }
}
window.installTool = installTool;

/** 卸载指定版本工具 */
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
    await window.loadHomeTools();
  } else {
    showToast('卸载失败: ' + result.output, 'error');
    btn.textContent = '卸载';
  }
}
window.uninstallTool = uninstallTool;

/** 设为全局默认版本 */
async function setGlobal(toolName, version, btn) {
  btn.classList.add('loading');
  btn.textContent = '配置中';
  const result = await window.miseAPI.mise.exec(['use', '--global', `${toolName}@${version}`]);
  btn.classList.remove('loading');
  btn.textContent = '设为默认';

  if (result.success) {
    showToast(`已成功将 ${toolName}@${version} 设为全局激活版本`, 'success');
    await window.loadHomeTools();
  } else {
    showToast('设置失败: ' + result.output, 'error');
  }
}
window.setGlobal = setGlobal;

/** 关闭工具详情模态框 */
function closeModal() {
  const modal = document.getElementById('tool-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
  window.miseAPI.mise.removeStreamListener();
}
window.closeModal = closeModal;
