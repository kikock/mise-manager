/**
 * Mise Manager — 已安装工具模块 (pages/installed.js)
 * 职责：已安装多版本矩阵渲染、版本切换 (全局/本地项目) 与文件系统定位
 */

'use strict';

/** 加载已安装工具列表 */
async function loadInstalledTools() {
  const container = document.getElementById('installed-list-container');
  if (!container) return;
  container.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-title">正在全面扫描本地已安装与启用工具...</div></div>`;

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
window.loadInstalledTools = loadInstalledTools;

/** 渲染已安装工具卡片列表与版本矩阵 */
function renderInstalledList(tools) {
  const container = document.getElementById('installed-list-container');
  if (!container) return;

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
                      : `<button class="btn btn-primary btn-sm" title="设为全局默认版本" onclick="event.stopPropagation();activateToolVersion('${escapeAttr(t.name)}', '${escapeAttr(v.version)}', true, this)">
                           🌟 设为全局使用
                         </button>
                         <button class="btn btn-ghost btn-sm" title="设为本地项目生效" onclick="event.stopPropagation();activateToolVersion('${escapeAttr(t.name)}', '${escapeAttr(v.version)}', false, this)">
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
window.renderInstalledList = renderInstalledList;

/** 切换激活特定工具版本 (mise use) */
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
        showToast(`已成功为项目 [${folderName}] 配置本地版本 ${toolName}@${version} ✨`, 'success', 4500);
        setTimeout(() => {
          window.miseAPI.shell.openPath(targetCwd);
        }, 300);
      }
      await loadInstalledTools();
      await window.loadHomeTools();
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
window.activateToolVersion = activateToolVersion;

/** 从元素原生属性安全读取路径并打开安装目录 */
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
