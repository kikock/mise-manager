/**
 * Mise Manager — 版本与在线更新模块 (pages/updates.js)
 * 职责：应用自身版本检测、GitHub Releases 历史发版流模态框呈现
 */

'use strict';

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
window.loadAppVersionInfo = loadAppVersionInfo;

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
        resultNotes.textContent = `网络请求失败: ${res.error || '无法连接 GitHub API'}`;
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
window.checkAppUpdate = checkAppUpdate;

/** 关闭历史发行记录模态框 */
function closeReleasesModal() {
  const modal = document.getElementById('releases-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}
window.closeReleasesModal = closeReleasesModal;

/** 展示历史发行版本模态框 */
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
              <span style="font-weight:600;font-size:14px">当前安装版本</span>
            </div>
            <span style="font-size:11.5px;color:var(--text-tertiary)">本地已知</span>
          </div>
          <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
            未能从 GitHub Releases 抓取历史发布流，您可直接在外部浏览器中访问 GitHub 专页查看或下载。
          </div>
          <div class="flex gap-8">
            <button class="btn btn-primary btn-sm" onclick="openExternalWithFeedback('https://github.com/kikock/mise-manager/releases', this, 'Releases')">
              🚀 浏览器打开 Releases
            </button>
          </div>
        </div>
      `;
      return;
    }

    let html = '';
    releases.forEach((r) => {
      const isCurrent = (r.tag === currentVer || r.tagName === `v${currentVer}`);
      const pubDate = r.publishedAt 
        ? new Date(r.publishedAt).toLocaleDateString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit' }) 
        : '官方发布';

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
            </div>
            <span style="font-size:11.5px;color:var(--text-tertiary)">${pubDate}</span>
          </div>
          <div class="markdown-body" style="max-height:180px;overflow-y:auto;background:var(--bg-card);padding:10px 14px;border-radius:var(--radius-sm);border:1px solid rgba(255,255,255,0.03)">${renderMarkdown(r.body || '包含多项体验优化与稳定性修复。')}</div>
          ${assetListHtml}
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
    bodyEl.innerHTML = `<div class="empty-state" style="padding:30px 0"><div class="empty-title">获取版本列表失败</div></div>`;
  }
}
window.showReleasesModal = showReleasesModal;
