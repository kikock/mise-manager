/**
 * Mise Manager — 前端通用工具模块 (utils.js)
 * 职责：通知、安全字符串处理、Markdown 渲染、日志与终端辅助
 */

'use strict';

/** 显示 Toast 浮层通知 */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.2s cubic-bezier(0.1, 0.9, 0.2, 1.0), transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1.0)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}
window.showToast = showToast;

/** 带有即时视觉反馈与防抖的外部链接打开函数 */
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
window.appendTerminal = appendTerminal;

/** 清空终端输出并展示 */
function clearTerminal(el, wrap) {
  if (el) el.innerHTML = '<span class="terminal-cursor"></span>';
  if (wrap) wrap.style.display = 'block';
}
window.clearTerminal = clearTerminal;

/** 格式化时间戳为标准本地日期 */
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
window.formatDateTime = formatDateTime;

/** 计算相对时间友善文本 */
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
window.relativeTime = relativeTime;

/** 截断过长字符串 */
function truncate(str, len = 80) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}
window.truncate = truncate;

/** HTML 实体安全转义 */
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
window.escapeHtml = escapeHtml;

/** HTML 属性值安全转义 */
function escapeAttr(str) {
  return String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
window.escapeAttr = escapeAttr;

/** 智能推导开发工具专属 Emoji 图标 */
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
window.getToolEmoji = getToolEmoji;

/** 格式化行内 Markdown 元素 */
function formatInlineMd(str) {
  if (!str) return '';
  let s = escapeHtml(str);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
  s = s.replace(/_([^_]+?)_/g, '<em>$1</em>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match, txt, url) => {
    return `<a href="#" onclick="openExternalWithFeedback('${escapeAttr(url)}', this, '${escapeAttr(txt)}'); return false;">${txt}</a>`;
  });
  return s;
}
window.formatInlineMd = formatInlineMd;

/** 高性能轻量安全 Markdown 渲染器 */
function renderMarkdown(md) {
  if (!md || typeof md !== 'string') return '';

  const codeBlocks = [];
  let text = md.replace(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g, (match, lang, code) => {
    const id = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`);
    return id;
  });

  const inlineCodes = [];
  text = text.replace(/`([^`\n]+)`/g, (match, code) => {
    const id = `__INLINE_CODE_${inlineCodes.length}__`;
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return id;
  });

  const lines = text.split(/\r?\n/);
  const out = [];
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*(?:---|___|\*\*\*)\s*$/.test(line)) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
      out.push('<hr />');
      continue;
    }

    const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (hMatch) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
      out.push(`<h${hMatch[1].length}>${formatInlineMd(hMatch[2])}</h${hMatch[1].length}>`);
      continue;
    }

    const bMatch = line.match(/^>\s*(.+)$/);
    if (bMatch) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
      out.push(`<blockquote>${formatInlineMd(bMatch[1])}</blockquote>`);
      continue;
    }

    const ulMatch = line.match(/^\s*[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inUl) { out.push('<ul>'); inUl = true; }
      out.push(`<li>${formatInlineMd(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (!inOl) { out.push('<ol>'); inOl = true; }
      out.push(`<li>${formatInlineMd(olMatch[1])}</li>`);
      continue;
    }

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
  inlineCodes.forEach((code, idx) => {
    result = result.replace(`__INLINE_CODE_${idx}__`, code);
  });
  codeBlocks.forEach((code, idx) => {
    result = result.replace(`__CODE_BLOCK_${idx}__`, code);
  });

  return result;
}
window.renderMarkdown = renderMarkdown;

/** 复制控制台终端文本到剪贴板 */
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
window.copyTerminalLog = copyTerminalLog;
