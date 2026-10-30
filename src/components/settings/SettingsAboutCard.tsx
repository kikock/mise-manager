import React from "react";
import { MisePaths } from "../../types/index.ts";

interface SettingsAboutCardProps {
  paths: MisePaths | null;
  onOpenExternal: (url: string) => void;
  onCheckUpdate: () => void;
}

export const SettingsAboutCard: React.FC<SettingsAboutCardProps> = ({
  paths,
  onOpenExternal,
  onCheckUpdate,
}) => {
  return (
    <div className="fluent-card">
      {/* 头部品牌与版本信息 (图3) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              backgroundColor: "var(--primary-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            m
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Mise Manager</h3>
              <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, backgroundColor: "rgba(255,255,255,0.08)", color: "var(--text-muted)" }}>
                v2.0.1
              </span>
              <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, backgroundColor: "rgba(34, 197, 94, 0.15)", color: "var(--success-color)", fontWeight: 600 }}>
                已是最新版
              </span>
              <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, backgroundColor: "rgba(37, 99, 235, 0.15)", color: "var(--accent-color)" }}>
                kikock
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4 }}>
              专为 Windows 打造的开发环境与工具多版本管理桌面应用 · 开发者: kikock · Fluent Design
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={onCheckUpdate}>
            ⚡ 检查应用更新
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12 }}
            onClick={() => onOpenExternal("https://github.com/kikock/mise-manager/releases")}
          >
            📦 历史发行版
          </button>
        </div>
      </div>

      {/* 宿主内核与生态链接 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, fontSize: 12, padding: "10px 0", borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ color: "var(--text-muted)" }}>
          宿主环境: <span style={{ color: "var(--text-secondary)" }}>Tauri 2.0 / WebView2</span> · 平台内核: <span style={{ color: "var(--accent-color)", fontWeight: 600 }}>{paths?.version || "mise windows-x64"}</span>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onOpenExternal("https://mise.jdx.dev"); }}
            style={{ color: "var(--accent-color)", textDecoration: "none" }}
          >
            📄 官方文档
          </a>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onOpenExternal("https://github.com/jdx/mise"); }}
            style={{ color: "var(--accent-color)", textDecoration: "none" }}
          >
            🌐 生态索引市场
          </a>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onOpenExternal("https://github.com/kikock/mise-manager"); }}
            style={{ color: "var(--accent-color)", textDecoration: "none" }}
          >
            ⭐ 本项目源码仓库
          </a>
        </div>
      </div>

      {/* 开发者与开源致敬区 (图3) */}
      <div
        style={{
          marginTop: 10,
          padding: "10px 14px",
          borderRadius: "var(--radius-sm)",
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          fontSize: 11.5,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ color: "var(--text-secondary)" }}>
            👨‍💻 开发者: <strong style={{ color: "var(--text-primary)" }}>kikock</strong>
          </span>
          <span style={{ color: "var(--border-subtle)" }}>|</span>
          <span style={{ color: "var(--text-secondary)" }}>
            🙏 特别致敬: <strong style={{ color: "var(--text-primary)" }}>jdx</strong>（打造了卓越的 <code style={{ color: "var(--accent-color)" }}>mise</code> 内核与 <code style={{ color: "var(--accent-color)" }}>mise-versions</code> 生态）
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 11, padding: "2px 8px" }}
            onClick={() => onOpenExternal("https://home.34462958.xyz")}
          >
            🐙 开发者主页
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 11, padding: "2px 8px" }}
            onClick={() => onOpenExternal("https://github.com/jdx/mise")}
          >
            ⭐ jdx/mise
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 11, padding: "2px 8px" }}
            onClick={() => onOpenExternal("https://github.com/jdx/mise-versions")}
          >
            📦 jdx/mise-versions
          </button>
        </div>
      </div>
    </div>
  );
};
