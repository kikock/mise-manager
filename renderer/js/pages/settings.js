/**
 * Mise Manager — 系统设置与环境变量模块 (pages/settings.js)
 * 职责：Windows 用户环境变量管理、PowerShell Profile 注入、安装路径与缓存管理
 */

'use strict';

/** 加载设置页信息 */
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

  await checkEnvStatus();
  loadCacheInfo();
  if (window.loadAppVersionInfo) loadAppVersionInfo();
}
window.loadSettings = loadSettings;

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

    if (statusPathExe) {
      statusPathExe.innerHTML = env.pathHasExeDir
        ? '<span class="badge badge-success">✅ 已在 Path 中</span>'
        : '<span class="badge badge-warning">⚠️ 未在 Path 中</span>';
    }

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

    await checkActivationStatus();
    await loadMiseSettings();
  } catch (e) {
    console.error('获取环境变量失败:', e);
  }
}
window.checkEnvStatus = checkEnvStatus;

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

    if (badgeCmd) {
      badgeCmd.innerHTML = (env && env.pathHasBinDir)
        ? '<span class="badge badge-success">✅ 已激活 (Shims 已在 Path)</span>'
        : '<span class="badge badge-warning">⚠️ 未激活 (未加入 Path)</span>';
    }

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
        badgePwsh.innerHTML = (pwsh.ps51Activated || pwsh.ps7Activated)
          ? '<span class="badge badge-success">✅ 已激活 (Hook 已注入)</span>'
          : '<span class="badge badge-warning">⚠️ 未激活</span>';
      }
    } else if (badgePwsh) {
      badgePwsh.innerHTML = '<span class="badge badge-neutral">检测失败</span>';
    }
  } catch (err) {
    console.error('检测终端激活状态异常:', err);
  }
}
window.checkActivationStatus = checkActivationStatus;

/** 一键写入 Windows 用户环境变量 */
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
window.applyEnvSettings = applyEnvSettings;

/** 从 Windows 用户环境变量中清除 */
async function removeEnvSettings() {
  const confirmed = await window.MiseTheme.showConfirmModal({
    title: '清除用户环境变量',
    message: '确定要从 Windows 用户环境变量中清除 mise 相关配置吗？',
    subMessage: '将移除 MISE_DATA_DIR、MISE_BIN_DIR 变量，并从 Path 中剔除 mise\\bin 目录。',
    type: 'danger',
    confirmText: '确认清除',
    cancelText: '取消',
  });
  if (!confirmed) return;

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
window.removeEnvSettings = removeEnvSettings;

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
      showToast('⚡ PowerShell Profile 激活脚本已写入完成！', 'success', 4500);
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
window.applyPwshProfileSettings = applyPwshProfileSettings;

/** 从 PowerShell Profile 中移除激活脚本 */
async function removePwshProfileSettings() {
  const confirmed = await window.MiseTheme.showConfirmModal({
    title: '移除 PowerShell Profile',
    message: '确定要从 PowerShell Profile 中移除 mise 激活配置吗？',
    subMessage: '移除后新打开的 PowerShell 将不再自动挂载 mise shim 垫片与环境变动。',
    type: 'warning',
    confirmText: '确认移除',
    cancelText: '取消',
  });
  if (!confirmed) return;

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
window.removePwshProfileSettings = removePwshProfileSettings;

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
window.loadMiseSettings = loadMiseSettings;

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
      await window.loadInstalledTools();
      await window.checkMiseStatus();
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
window.installMissingTools = installMissingTools;

/** 卸载 mise 核心与数据目录 */
async function uninstallMise() {
  const cfg = await window.miseAPI.config.get();
  const rootDir = cfg.miseRootDir || '应用 mise 目录';
  
  const confirmed = await window.MiseTheme.showConfirmModal({
    title: '彻底卸载 mise 核心与数据',
    message: '⚠️ 高风险操作确认：您确定要彻底卸载 mise 吗？',
    subMessage: `该操作将直接删除统一主目录及其所有已下载安装的工具与数据：\n${rootDir}\n确认后不可撤销！`,
    type: 'danger',
    confirmText: '彻底销毁卸载',
    cancelText: '取消',
  });
  if (!confirmed) return;

  showToast('正在清理 mise 核心与数据目录...', 'info', 3000);
  try {
    const res = await window.miseAPI.mise.uninstall();
    if (res && res.success) {
      showToast('✅ mise 已彻底卸载完成！', 'success', 4000);
      await window.checkMiseStatus();
      await loadSettings();
    } else {
      showToast('卸载失败: ' + (res?.error || '未知错误'), 'error');
    }
  } catch (err) {
    showToast('卸载异常: ' + err.message, 'error');
  }
}
window.uninstallMise = uninstallMise;

/** 加载市场本地缓存信息 */
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
window.loadCacheInfo = loadCacheInfo;

/** 保存自定义路径配置 */
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
  await window.checkMiseStatus();
  await loadSettings();
}
window.saveMisePaths = saveMisePaths;

/** 恢复默认路径配置 */
async function resetMisePaths() {
  await window.miseAPI.config.reset();
  showToast('已恢复为默认同目录配置', 'info');
  await window.checkMiseStatus();
  await loadSettings();
}
window.resetMisePaths = resetMisePaths;
