import React from "react";
import { MisePaths, SystemEnvStatus } from "../../types/index.ts";

interface SettingsEnvCardProps {
  paths: MisePaths | null;
  envStatus: SystemEnvStatus | null;
  onRefreshEnv: () => void;
  onApplyAllEnv: () => void;
  onRemoveAllEnv: () => void;
}

export const SettingsEnvCard: React.FC<SettingsEnvCardProps> = ({
  paths,
  envStatus,
  onRefreshEnv,
  onApplyAllEnv,
  onRemoveAllEnv,
}) => {
  const binDir = paths ? `${paths.root_dir}\\bin` : "-";
  const shimsDir = paths?.shims_dir || "-";
  const dataDir = paths?.data_dir || "-";
  const configDir = paths ? `${paths.root_dir}\\config` : "-";

  const pathHasShims = envStatus?.path_has_shims;
  const pathHasBin = envStatus?.path_has_bin;
  const envDataOk = envStatus?.env_data_dir_ok;
  const envBinOk = envStatus?.env_bin_dir_ok;
  const envConfigOk = envStatus?.env_config_dir_ok;

  return (
    <div className="fluent-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <span>🌐</span>
          <span>Windows 用户环境变量查看与配置</span>
        </h3>
        <button className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={onRefreshEnv}>
          🔄 刷新环境变量检测
        </button>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 14 }}>
        查看当前系统的 Path 及独立环境变量，支持一键将 4 个对应地址配置到系统
      </div>

      {/* 环境变量状态表格 (图1) */}
      <div style={{ overflowX: "auto", marginBottom: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
              <th style={{ padding: "8px 10px" }}>配置项 / 作用</th>
              <th style={{ padding: "8px 10px" }}>目标物理路径 (统一目录)</th>
              <th style={{ padding: "8px 10px" }}>独立变量状态</th>
              <th style={{ padding: "8px 10px" }}>用户 Path 状态</th>
            </tr>
          </thead>
          <tbody>
            {/* 行 1 */}
            <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
              <td style={{ padding: "10px" }}>
                <div style={{ fontWeight: 600 }}>1. mise 入口所在目录</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>包含 mise.exe 核心程序</div>
              </td>
              <td style={{ padding: "10px", fontFamily: "monospace", color: "#38bdf8" }}>{binDir}</td>
              <td style={{ padding: "10px", color: "var(--text-muted)" }}>- (通过 Path 调用)</td>
              <td style={{ padding: "10px" }}>
                <span
                  style={{
                    fontSize: 11.5,
                    padding: "2px 8px",
                    borderRadius: 4,
                    backgroundColor: pathHasBin ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 88, 12, 0.15)",
                    color: pathHasBin ? "var(--success-color)" : "var(--warning-color)",
                  }}
                >
                  {pathHasBin ? "✓ 已生效" : "⚠️ 未在 Path 中"}
                </span>
              </td>
            </tr>

            {/* 行 2 */}
            <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
              <td style={{ padding: "10px" }}>
                <div style={{ fontWeight: 600 }}>2. MISE_BIN_DIR</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>shims 垫片执行目录</div>
              </td>
              <td style={{ padding: "10px", fontFamily: "monospace", color: "#38bdf8" }}>{shimsDir}</td>
              <td style={{ padding: "10px" }}>
                <span
                  style={{
                    fontSize: 11.5,
                    padding: "2px 8px",
                    borderRadius: 4,
                    backgroundColor: envBinOk ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 88, 12, 0.15)",
                    color: envBinOk ? "var(--success-color)" : "var(--warning-color)",
                  }}
                >
                  {envBinOk ? "✓ 已设置" : "⚠️ 未设置或不符"}
                </span>
              </td>
              <td style={{ padding: "10px" }}>
                <span
                  style={{
                    fontSize: 11.5,
                    padding: "2px 8px",
                    borderRadius: 4,
                    backgroundColor: pathHasShims ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 88, 12, 0.15)",
                    color: pathHasShims ? "var(--success-color)" : "var(--warning-color)",
                  }}
                >
                  {pathHasShims ? "✓ 已生效" : "⚠️ 未在 Path 中"}
                </span>
              </td>
            </tr>

            {/* 行 3 */}
            <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
              <td style={{ padding: "10px" }}>
                <div style={{ fontWeight: 600 }}>3. MISE_DATA_DIR</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>工具安装与下载本地数据</div>
              </td>
              <td style={{ padding: "10px", fontFamily: "monospace", color: "#38bdf8" }}>{dataDir}</td>
              <td style={{ padding: "10px" }}>
                <span
                  style={{
                    fontSize: 11.5,
                    padding: "2px 8px",
                    borderRadius: 4,
                    backgroundColor: envDataOk ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 88, 12, 0.15)",
                    color: envDataOk ? "var(--success-color)" : "var(--warning-color)",
                  }}
                >
                  {envDataOk ? "✓ 已设置" : "⚠️ 未设置或不符"}
                </span>
              </td>
              <td style={{ padding: "10px" }}>
                <span
                  style={{
                    fontSize: 11.5,
                    padding: "2px 8px",
                    borderRadius: 4,
                    backgroundColor: pathHasShims ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 88, 12, 0.15)",
                    color: pathHasShims ? "var(--success-color)" : "var(--warning-color)",
                  }}
                >
                  {pathHasShims ? "✓ 已生效" : "⚠️ 未在 Path 中"}
                </span>
              </td>
            </tr>

            {/* 行 4 */}
            <tr>
              <td style={{ padding: "10px" }}>
                <div style={{ fontWeight: 600 }}>4. MISE_CONFIG_DIR</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>全局配置文件存放目录</div>
              </td>
              <td style={{ padding: "10px", fontFamily: "monospace", color: "#38bdf8" }}>{configDir}</td>
              <td style={{ padding: "10px" }}>
                <span
                  style={{
                    fontSize: 11.5,
                    padding: "2px 8px",
                    borderRadius: 4,
                    backgroundColor: envConfigOk ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 88, 12, 0.15)",
                    color: envConfigOk ? "var(--success-color)" : "var(--warning-color)",
                  }}
                >
                  {envConfigOk ? "✓ 已设置" : "⚠️ 未设置或不符"}
                </span>
              </td>
              <td style={{ padding: "10px", color: "var(--text-muted)" }}>- (仅独立变量)</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 底部操作与提示 (图1) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" style={{ fontSize: 12.5 }} onClick={onApplyAllEnv}>
            ⚡ 一键同步写入 Windows 环境变量
          </button>
          <button className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={onRemoveAllEnv}>
            🗑️ 从环境变量中一键清除
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
          💡 写入后将立即生效于新建的 CMD / PowerShell 终端窗口
        </div>
      </div>
    </div>
  );
};
