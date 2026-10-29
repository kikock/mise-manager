import React from "react";
import { InstalledTool, MisePaths, SystemEnvStatus } from "../types/index.ts";

interface HomeProps {
  paths: MisePaths | null;
  envStatus: SystemEnvStatus | null;
  tools: InstalledTool[];
  onOpenDirectory: (path: string) => void;
  onFixEnvPath: () => void;
}

export const Home: React.FC<HomeProps> = ({
  paths,
  envStatus,
  tools,
  onOpenDirectory,
  onFixEnvPath,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 核心指标卡片网格 */}
      <div className="fluent-grid">
        <div className="fluent-card">
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Mise 引擎状态</div>
          <div style={{ fontSize: 22, fontWeight: 700, margin: "8px 0", color: paths?.is_found ? "var(--success-color)" : "var(--error-color)" }}>
            {paths?.is_found ? "● 运行正常" : "○ 未检测到"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            版本: {paths?.version || "未知 / 尚未探测"}
          </div>
        </div>

        <div className="fluent-card">
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>已安装多版本运行时</div>
          <div style={{ fontSize: 22, fontWeight: 700, margin: "8px 0", color: "var(--accent-color)" }}>
            {tools.length} 个版本
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            当前活跃环境: {tools.filter((t) => t.is_active).length} 个
          </div>
        </div>

        <div className="fluent-card">
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Shims PATH 状态</div>
          <div style={{ fontSize: 22, fontWeight: 700, margin: "8px 0", color: envStatus?.path_has_shims ? "var(--success-color)" : "var(--warning-color)" }}>
            {envStatus?.path_has_shims ? "✓ 已生效" : "⚠️ 未配置"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {envStatus?.path_has_shims ? "可在终端直接调用" : "需将 shims 加入系统 PATH"}
          </div>
        </div>
      </div>

      {/* 环境变量提示卡片 */}
      {!envStatus?.path_has_shims && (
        <div className="fluent-card" style={{ borderLeft: "4px solid var(--warning-color)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>发现未配置系统 Shims 环境变量</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              将 Mise 的 shims 目录追加到 Windows 用户环境变量 PATH，即可在 CMD、PowerShell 中直接使用已安装工具。
            </div>
          </div>
          <button className="btn btn-primary" onClick={onFixEnvPath}>
            ⚡ 一键添加并生效
          </button>
        </div>
      )}

      {/* 核心目录路径与快速访问 */}
      <div className="fluent-card">
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>核心存储目录与路径映射</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span><strong>Mise 主程序:</strong> {paths?.exe_path || "-"}</span>
            {paths?.exe_path && (
              <button className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => onOpenDirectory(paths.root_dir)}>
                📂 打开目录
              </button>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span><strong>数据持久化目录:</strong> {paths?.data_dir || "-"}</span>
            {paths?.data_dir && (
              <button className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => onOpenDirectory(paths.data_dir)}>
                📂 打开目录
              </button>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span><strong>Shims 代理入口:</strong> {paths?.shims_dir || "-"}</span>
            {paths?.shims_dir && (
              <button className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => onOpenDirectory(paths.shims_dir)}>
                📂 打开目录
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
