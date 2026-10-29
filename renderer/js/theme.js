// ============================================================
// Mise Manager 现代全景主题系统与高颜值模态弹窗组件 (对标 v1.5.0 与 v1.7.0)
// ============================================================

const THEME_STORAGE_KEY = 'misemanager_theme_config_v2';

// 浅色主题预设色盘 (30+ 种精致色卡)
const LIGHT_PRESETS = [
  { id: 'l-snow', name: '雪白', mode: 'light', bgApp: '#f8f9fa', bgSidebar: '#ffffff', bgCard: '#ffffff', bgLayer: '#f1f3f5', border: 'rgba(0,0,0,0.08)', textPrimary: '#1a1a1a', textSecondary: '#666666', accent: '#0078d4' },
  { id: 'l-cool-gray', name: '冷灰', mode: 'light', bgApp: '#f1f3f5', bgSidebar: '#e9ecef', bgCard: '#ffffff', bgLayer: '#e2e6ea', border: 'rgba(0,0,0,0.08)', textPrimary: '#212529', textSecondary: '#495057', accent: '#0078d4' },
  { id: 'l-warm-ivory', name: '暖象牙', mode: 'light', bgApp: '#fbfaf8', bgSidebar: '#f4f1ea', bgCard: '#ffffff', bgLayer: '#eae5db', border: 'rgba(0,0,0,0.07)', textPrimary: '#2b2927', textSecondary: '#605c56', accent: '#b36b00' },
  { id: 'l-cream', name: '奶油杏', mode: 'light', bgApp: '#fcf8f2', bgSidebar: '#f7efe3', bgCard: '#ffffff', bgLayer: '#ede1cf', border: 'rgba(0,0,0,0.07)', textPrimary: '#2e2820', textSecondary: '#665a48', accent: '#c26b2b' },
  { id: 'l-sand', name: '柔沙', mode: 'light', bgApp: '#f7f5f0', bgSidebar: '#ede8df', bgCard: '#ffffff', bgLayer: '#e2dcce', border: 'rgba(0,0,0,0.08)', textPrimary: '#2b2723', textSecondary: '#635c54', accent: '#996b3d' },
  { id: 'l-pure-white', name: '亮白', mode: 'light', bgApp: '#ffffff', bgSidebar: '#f5f6f8', bgCard: '#ffffff', bgLayer: '#eef1f5', border: 'rgba(0,0,0,0.09)', textPrimary: '#111827', textSecondary: '#4b5563', accent: '#2563eb' },
  { id: 'l-slate', name: '板岩', mode: 'light', bgApp: '#f1f5f9', bgSidebar: '#e2e8f0', bgCard: '#ffffff', bgLayer: '#cbd5e1', border: 'rgba(0,0,0,0.08)', textPrimary: '#0f172a', textSecondary: '#475569', accent: '#0ea5e9' },
  { id: 'l-zinc', name: '锌白', mode: 'light', bgApp: '#f4f4f5', bgSidebar: '#e4e4e7', bgCard: '#ffffff', bgLayer: '#d4d4d8', border: 'rgba(0,0,0,0.08)', textPrimary: '#18181b', textSecondary: '#52525b', accent: '#6366f1' },
  { id: 'l-neutral', name: '中性', mode: 'light', bgApp: '#f5f5f5', bgSidebar: '#e5e5e5', bgCard: '#ffffff', bgLayer: '#d4d4d4', border: 'rgba(0,0,0,0.08)', textPrimary: '#171717', textSecondary: '#525252', accent: '#10b981' },
  { id: 'l-stone', name: '暖石', mode: 'light', bgApp: '#f5f5f4', bgSidebar: '#e7e5e4', bgCard: '#ffffff', bgLayer: '#d6d3d1', border: 'rgba(0,0,0,0.08)', textPrimary: '#1c1917', textSecondary: '#57534e', accent: '#f59e0b' },
  { id: 'l-ice-blue', name: '冰蓝', mode: 'light', bgApp: '#f0f7ff', bgSidebar: '#e0effe', bgCard: '#ffffff', bgLayer: '#bae0fd', border: 'rgba(0,120,212,0.12)', textPrimary: '#0c2340', textSecondary: '#305680', accent: '#0078d4' },
  { id: 'l-mint', name: '薄荷', mode: 'light', bgApp: '#f0fdf4', bgSidebar: '#dcfce7', bgCard: '#ffffff', bgLayer: '#bbf7d0', border: 'rgba(16,124,65,0.12)', textPrimary: '#064e3b', textSecondary: '#047857', accent: '#107c41' },
  { id: 'l-lavender', name: '薰衣草', mode: 'light', bgApp: '#faf5ff', bgSidebar: '#f3e8ff', bgCard: '#ffffff', bgLayer: '#e9d5ff', border: 'rgba(147,51,234,0.12)', textPrimary: '#3b0764', textSecondary: '#6b21a8', accent: '#8b5cf6' },
  { id: 'l-sakura', name: '樱粉', mode: 'light', bgApp: '#fff1f2', bgSidebar: '#ffe4e6', bgCard: '#ffffff', bgLayer: '#fecdd3', border: 'rgba(225,29,72,0.12)', textPrimary: '#4c0519', textSecondary: '#881337', accent: '#e11d48' },
  { id: 'l-peach', name: '蜜桃', mode: 'light', bgApp: '#fff7ed', bgSidebar: '#ffedd5', bgCard: '#ffffff', bgLayer: '#fed7aa', border: 'rgba(234,88,12,0.12)', textPrimary: '#431407', textSecondary: '#7c2d12', accent: '#ea580c' },
  { id: 'l-amber', name: '琥珀', mode: 'light', bgApp: '#fffbeb', bgSidebar: '#fef3c7', bgCard: '#ffffff', bgLayer: '#fde68a', border: 'rgba(217,119,6,0.12)', textPrimary: '#451a03', textSecondary: '#78350f', accent: '#d97706' },
  { id: 'l-cyan', name: '水清', mode: 'light', bgApp: '#ecfeff', bgSidebar: '#cffafe', bgCard: '#ffffff', bgLayer: '#a5f3fc', border: 'rgba(8,145,178,0.12)', textPrimary: '#083344', textSecondary: '#0e7490', accent: '#0891b2' },
  { id: 'l-teal', name: '碧绿', mode: 'light', bgApp: '#f0fdfa', bgSidebar: '#ccfbf1', bgCard: '#ffffff', bgLayer: '#99f6e4', border: 'rgba(13,148,136,0.12)', textPrimary: '#042f2e', textSecondary: '#0f766e', accent: '#0d9488' },
  { id: 'l-rose', name: '玫瑰', mode: 'light', bgApp: '#fff1f2', bgSidebar: '#ffe4e6', bgCard: '#ffffff', bgLayer: '#fecdd3', border: 'rgba(244,63,94,0.12)', textPrimary: '#4c0519', textSecondary: '#9f1239', accent: '#f43f5e' },
  { id: 'l-lime', name: '青柠', mode: 'light', bgApp: '#f7fee7', bgSidebar: '#ecfccb', bgCard: '#ffffff', bgLayer: '#d9f99d', border: 'rgba(101,163,13,0.12)', textPrimary: '#1a2e05', textSecondary: '#365314', accent: '#65a30d' },
  { id: 'l-morandi-blue', name: '莫兰迪蓝', mode: 'light', bgApp: '#eef2f6', bgSidebar: '#dfe6ee', bgCard: '#ffffff', bgLayer: '#c8d5e3', border: 'rgba(71,85,105,0.12)', textPrimary: '#1e293b', textSecondary: '#475569', accent: '#475569' },
  { id: 'l-morandi-green', name: '莫兰迪绿', mode: 'light', bgApp: '#eef4f1', bgSidebar: '#dde7e1', bgCard: '#ffffff', bgLayer: '#c5d8ce', border: 'rgba(47,79,79,0.12)', textPrimary: '#1c2b24', textSecondary: '#3d574c', accent: '#3d574c' },
  { id: 'l-morandi-clay', name: '陶土', mode: 'light', bgApp: '#f4ede8', bgSidebar: '#e8ded6', bgCard: '#ffffff', bgLayer: '#d8c7bc', border: 'rgba(120,80,60,0.12)', textPrimary: '#2e211b', textSecondary: '#5a443b', accent: '#7c5545' },
  { id: 'l-morandi-purple', name: '暮紫', mode: 'light', bgApp: '#f2edf5', bgSidebar: '#e5dceb', bgCard: '#ffffff', bgLayer: '#d3c2dd', border: 'rgba(90,60,110,0.12)', textPrimary: '#281b30', textSecondary: '#4e395c', accent: '#634b75' },
  { id: 'l-mist', name: '薄雾', mode: 'light', bgApp: '#f3f4f6', bgSidebar: '#e5e7eb', bgCard: '#ffffff', bgLayer: '#d1d5db', border: 'rgba(0,0,0,0.08)', textPrimary: '#111827', textSecondary: '#4b5563', accent: '#4b5563' },
  { id: 'l-pearl', name: '珍珠', mode: 'light', bgApp: '#fafaf9', bgSidebar: '#f0efe9', bgCard: '#ffffff', bgLayer: '#e4e2d8', border: 'rgba(0,0,0,0.07)', textPrimary: '#292524', textSecondary: '#57534e', accent: '#78716c' },
  { id: 'l-linen', name: '亚麻', mode: 'light', bgApp: '#f7f6f2', bgSidebar: '#ebe9e1', bgCard: '#ffffff', bgLayer: '#dedbd0', border: 'rgba(0,0,0,0.07)', textPrimary: '#262420', textSecondary: '#59544c', accent: '#827768' },
  { id: 'l-ceramic', name: '青瓷', mode: 'light', bgApp: '#f2f7f6', bgSidebar: '#e1edea', bgCard: '#ffffff', bgLayer: '#cbe0dc', border: 'rgba(0,100,90,0.1)', textPrimary: '#162826', textSecondary: '#345550', accent: '#2d6a62' },
];

// 深色主题预设色盘
const DARK_PRESETS = [
  { id: 'd-default', name: '深邃黑', mode: 'dark', bgApp: '#1a1a2e', bgSidebar: 'rgba(255,255,255,0.05)', bgCard: 'rgba(255,255,255,0.06)', bgLayer: 'rgba(255,255,255,0.12)', border: 'rgba(255,255,255,0.08)', textPrimary: 'rgba(255,255,255,0.95)', textSecondary: 'rgba(255,255,255,0.60)', accent: '#0078d4' },
  { id: 'd-pure-black', name: '纯黑', mode: 'dark', bgApp: '#0a0a0c', bgSidebar: '#111114', bgCard: '#16161a', bgLayer: '#222228', border: 'rgba(255,255,255,0.1)', textPrimary: '#ffffff', textSecondary: '#a1a1aa', accent: '#3b82f6' },
  { id: 'd-night-blue', name: '星夜蓝', mode: 'dark', bgApp: '#0d1117', bgSidebar: '#161b22', bgCard: '#21262d', bgLayer: '#30363d', border: 'rgba(255,255,255,0.1)', textPrimary: '#c9d1d9', textSecondary: '#8b949e', accent: '#58a6ff' },
  { id: 'd-titanium', name: '钛金灰', mode: 'dark', bgApp: '#1e1e24', bgSidebar: '#25252d', bgCard: '#2b2b36', bgLayer: '#363644', border: 'rgba(255,255,255,0.09)', textPrimary: '#e2e2ea', textSecondary: '#9898a6', accent: '#8b5cf6' },
  { id: 'd-forest', name: '冷杉绿', mode: 'dark', bgApp: '#0e1713', bgSidebar: '#13211b', bgCard: '#1a2c24', bgLayer: '#233d32', border: 'rgba(16,185,129,0.15)', textPrimary: '#e6f4ea', textSecondary: '#a7d7b8', accent: '#10b981' },
  { id: 'd-violet', name: '极光紫', mode: 'dark', bgApp: '#15101e', bgSidebar: '#1d162b', bgCard: '#281e3b', bgLayer: '#392a54', border: 'rgba(168,85,247,0.15)', textPrimary: '#f3e8ff', textSecondary: '#c084fc', accent: '#a855f7' },
  { id: 'd-ruby', name: '暗榴红', mode: 'dark', bgApp: '#1a1012', bgSidebar: '#251619', bgCard: '#331f23', bgLayer: '#472b31', border: 'rgba(244,63,94,0.15)', textPrimary: '#ffe4e6', textSecondary: '#fda4af', accent: '#f43f5e' },
  { id: 'd-amber-dark', name: '曜金', mode: 'dark', bgApp: '#191408', bgSidebar: '#241c0b', bgCard: '#30260e', bgLayer: '#433413', border: 'rgba(245,158,11,0.15)', textPrimary: '#fef3c7', textSecondary: '#fcd34d', accent: '#f59e0b' },
];

const ACCENT_PRESETS = [
  { name: '微软蓝', color: '#0078d4' },
  { name: '星空蓝', color: '#2563eb' },
  { name: '极光青', color: '#00b7c3' },
  { name: '翡翠绿', color: '#107c41' },
  { name: '薄荷绿', color: '#10b981' },
  { name: '炽焰橙', color: '#d83b01' },
  { name: '阳光黄', color: '#ffb900' },
  { name: '紫罗兰', color: '#8764b8' },
  { name: '魅惑紫', color: '#a855f7' },
  { name: '玫瑰粉', color: '#e3008c' },
  { name: '板岩灰', color: '#64748b' },
];

function getThemeConfig() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    mode: 'dark',
    selectedLightPreset: 'l-snow',
    selectedDarkPreset: 'd-default',
    useCustomAccent: false,
    customAccent: '#0078d4',
  };
}

function saveThemeConfig(cfg) {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(cfg));
  applyThemeConfig(cfg);
}

function applyThemeConfig(cfg) {
  const root = document.documentElement;

  let effectiveMode = 'dark';
  if (cfg.mode === 'system') {
    effectiveMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    effectiveMode = cfg.mode;
  }

  root.setAttribute('data-theme', effectiveMode);

  const preset = effectiveMode === 'light'
    ? (LIGHT_PRESETS.find(p => p.id === cfg.selectedLightPreset) || LIGHT_PRESETS[0])
    : (DARK_PRESETS.find(p => p.id === cfg.selectedDarkPreset) || DARK_PRESETS[0]);

  root.style.setProperty('--bg-base', preset.bgApp);
  root.style.setProperty('--sidebar-bg', preset.bgSidebar);
  root.style.setProperty('--card-bg', preset.bgCard);
  root.style.setProperty('--bg-layer3', preset.bgLayer);
  root.style.setProperty('--border', preset.border);
  root.style.setProperty('--text-primary', preset.textPrimary);
  root.style.setProperty('--text-secondary', preset.textSecondary);

  const activeAccent = (cfg.useCustomAccent && cfg.customAccent) ? cfg.customAccent : preset.accent;
  root.style.setProperty('--accent', activeAccent);
  root.style.setProperty('--accent-hover', activeAccent);
  root.style.setProperty('--accent-light', activeAccent + '26');
}

/**
 * 🌟 Fluent Design 亚克力磨砂模态确认弹窗 (无缝替代原生 confirm)
 * @param {Object} options
 * @param {string} options.title 标题
 * @param {string} options.message 主提示信息
 * @param {string} [options.subMessage] 辅助补充说明 / 路径代码
 * @param {'danger'|'warning'|'info'} [options.type='danger'] 类型
 * @param {string} [options.confirmText='确定'] 确认按钮文字
 * @param {string} [options.cancelText='取消'] 取消按钮文字
 * @returns {Promise<boolean>} 用户是否确认
 */
function showConfirmModal(options) {
  return new Promise((resolve) => {
    const {
      title = '操作确认',
      message = '',
      subMessage = '',
      type = 'danger',
      confirmText = '确定',
      cancelText = '取消',
    } = options;

    const icon = type === 'danger' ? '🗑️' : type === 'warning' ? '⚠️' : 'ℹ️';
    const confirmBtnClass = type === 'danger' ? 'btn btn-danger-confirm' : 'btn btn-primary';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(12px);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.18s ease;';

    overlay.innerHTML = `
      <div class="modal" style="width:480px;max-width:92vw;padding:0;overflow:hidden;background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius-xl);box-shadow:var(--shadow-lg);animation:modalIn 0.22s cubic-bezier(0.16,1,0.3,1);">
        <div class="modal-header" style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;margin-bottom:0;">
          <div style="display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:var(--text-primary)">
            <span>${icon}</span>
            <span>${title}</span>
          </div>
          <button class="btn btn-ghost btn-sm" id="_btn_modal_x" style="padding:4px 8px;font-size:14px;border:none;">✕</button>
        </div>
        <div class="modal-body" style="padding:20px;font-size:13.5px;color:var(--text-primary);line-height:1.6;word-break:break-all;">
          <div>${message.replace(/\n/g, '<br/>')}</div>
          ${subMessage ? `<div style="margin-top:12px;font-size:11.5px;font-family:var(--font-mono);background:rgba(0,0,0,0.2);padding:8px 12px;border-radius:var(--radius-sm);color:var(--text-secondary);word-break:break-all;">${subMessage}</div>` : ''}
        </div>
        <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);background:rgba(0,0,0,0.1);display:flex;justify-content:flex-end;gap:10px;margin-top:0;">
          <button class="btn btn-secondary" id="_btn_modal_cancel">${cancelText}</button>
          <button class="${confirmBtnClass}" id="_btn_modal_confirm" autofocus>${confirmText}</button>
        </div>
      </div>
    `;

    function cleanup(result) {
      document.removeEventListener('keydown', handleKey);
      overlay.remove();
      resolve(result);
    }

    function handleKey(e) {
      if (e.key === 'Escape') cleanup(false);
      if (e.key === 'Enter') cleanup(true);
    }

    overlay.querySelector('#_btn_modal_confirm').onclick = () => cleanup(true);
    overlay.querySelector('#_btn_modal_cancel').onclick = () => cleanup(false);
    overlay.querySelector('#_btn_modal_x').onclick = () => cleanup(false);
    overlay.onclick = (e) => {
      if (e.target === overlay) cleanup(false);
    };

    document.addEventListener('keydown', handleKey);
    document.body.appendChild(overlay);
  });
}

// 暴露到全局供页面调用
window.MiseTheme = {
  getThemeConfig,
  saveThemeConfig,
  applyThemeConfig,
  showConfirmModal,
  LIGHT_PRESETS,
  DARK_PRESETS,
  ACCENT_PRESETS,
};
