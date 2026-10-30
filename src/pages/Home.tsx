import React from "react";
import { InstalledTool, MisePaths, SystemEnvStatus } from "../types/index.ts";

interface HomeProps {
  paths: MisePaths | null;
  envStatus: SystemEnvStatus | null;
  tools: InstalledTool[];
  onOpenDirectory: (path: string) => void;
  onRefresh: () => void;
  onUpgradeMise: () => void;
  onUninstallMise: () => void;
  onDownloadMise: () => void;
  onScanLocalMise: () => void;
  onNavigateSettings: () => void;
  onNavigateInstalled: () => void;
  onNavigateMarket: () => void;
  showToast?: (content: string, type?: "success" | "info" | "warning" | "error") => void;
}

export const Home: React.FC<HomeProps> = ({
  paths,
  tools,
  onOpenDirectory,
  onRefresh,
  onUpgradeMise,
  onUninstallMise,
  onDownloadMise,
  onScanLocalMise,
  onNavigateSettings,
  onNavigateInstalled,
  onNavigateMarket,
  showToast,
}) => {
  const isReady = paths?.is_found;
  const versionDisplay = paths?.version || "2026.9.16 windows-x64 (2026-09-28)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 顶部标语区 (图4) */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px 0", color: "var(--text-primary)" }}>
          欢迎使用 Mise Manager
        </h2>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          开发工具版本管理器 —— 一站式安装、更新、切换工具版本
        </div>
      </div>

      {/* 第一卡片：mise 运行时状态 (图4) */}
      <div className="fluent-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px 0" }}>mise 运行时状态</h3>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>检测本机 mise 安装情况</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}
              onClick={onScanLocalMise}
              title="扫描并切换使用本机已安装的任意 mise 实例"
            >
              <span>🔍</span>
              <span>扫描本机 mise</span>
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: "5px 12px" }}
              onClick={async () => {
                await onRefresh();
                showToast?.("运行环境与 mise 状态已刷新", "success");
              }}
            >
              🔄 刷新状态
            </button>
          </div>
        </div>

        {/* 状态大卡片主体 */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.025)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* 左侧状态方块图标 */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                backgroundColor: isReady ? "#16a34a" : "#ea580c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: 18,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {isReady ? "✓" : "!"}
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>
                {isReady ? "mise 运行时已就绪" : "未检测到 mise 运行时"}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace", color: "var(--text-primary)" }}>
                {isReady ? `版本: ${versionDisplay}` : "尚未下载安装 mise 核心组件"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, fontFamily: "monospace" }}>
                mise 应用: {paths?.exe_path || "-"}
              </div>
            </div>
          </div>

          <div>
            {isReady ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--success-color)" }}>
                  ● 运行正常
                </span>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: "5px 12px" }}
                  onClick={onDownloadMise}
                  title="下载并部署便携版至当前应用目录下的 mise/bin/mise.exe"
                >
                  ⚡ 重新下载便携版
                </button>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={onDownloadMise}>
                ⚡ 一键下载并就绪
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 第二行双卡片并排 (图4) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
        {/* 左卡片：升级与维护 mise 核心 */}
        <div className="fluent-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: 14.5, fontWeight: 600, margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: 6 }}>
              <span>⬆</span>
              <span>升级与维护 mise 核心</span>
            </h3>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 14 }}>
              升级到官方最新版本或在需要时安全彻底卸载 mise 核心与本地数据
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              style={{ fontSize: 12.5 }}
              onClick={onDownloadMise}
              title="下载至本地应用根目录创建 mise 自包含环境"
            >
              ⬇️ 下载 mise
            </button>
            <button className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={onUpgradeMise}>
              ⬆ 升级到最新版本
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12.5, color: "var(--error-color)", borderColor: "rgba(239, 68, 68, 0.3)" }}
              onClick={onUninstallMise}
            >
              🗑️ 卸载 mise
            </button>
          </div>
        </div>

        {/* 右卡片：mise 数据目录 */}
        <div className="fluent-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: 14.5, fontWeight: 600, margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: 6 }}>
              <span>📁</span>
              <span>mise 数据与工作目录</span>
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 14 }}>
              <div>
                <span style={{ color: "var(--text-muted)", marginRight: 6 }}>工作目录:</span>
                <span style={{ fontFamily: "monospace", color: "var(--text-primary)", wordBreak: "break-all" }}>
                  {paths?.root_dir || "-"}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", marginRight: 6 }}>数据目录:</span>
                <span style={{ fontFamily: "monospace", color: "var(--text-primary)", wordBreak: "break-all" }}>
                  {paths?.data_dir || "-"}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12.5 }}
              onClick={() => paths?.data_dir && onOpenDirectory(paths.data_dir)}
            >
              📂 打开目录
            </button>
            <button className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={onNavigateSettings}>
              ⚙️ 调整路径与环境变量
            </button>
          </div>
        </div>
      </div>

      {/* 第三卡片：已安装工具概览 (图4) */}
      <div className="fluent-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 14.5, fontWeight: 600, margin: "0 0 4px 0" }}>已安装工具概览</h3>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              已扫描到 {tools.length} 个开发工具，共 {tools.length} 个本地版本
            </div>
          </div>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: "4px 10px" }}
            onClick={onNavigateInstalled}
          >
            查看全部 →
          </button>
        </div>

        {/* 工具列表或空状态 */}
        {tools.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              backgroundColor: "rgba(255, 255, 255, 0.015)",
              borderRadius: "var(--radius-md)",
              border: "1px dashed var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: 42, opacity: 0.6 }}>🛠️</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
              暂未安装任何开发工具
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 6 }}>
              前往应用市场即可一键安装 Node.js, Python, Go, Rust 等
            </div>
            <button className="btn btn-primary" style={{ fontSize: 12.5 }} onClick={onNavigateMarket}>
              🌐 浏览应用市场
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {tools.slice(0, 6).map((tool) => (
              <div
                key={`${tool.name}-${tool.version}`}
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{tool.name}</div>
                  <div style={{ fontSize: 12, color: "var(--accent-color)", fontFamily: "monospace" }}>
                    {tool.version}
                  </div>
                </div>
                {tool.is_active && (
                  <span style={{ fontSize: 11, color: "var(--success-color)", fontWeight: 500 }}>
                    ● 当前激活
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
