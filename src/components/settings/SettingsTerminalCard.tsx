import React from "react";
import { SystemEnvStatus } from "../../types/index.ts";

interface SettingsTerminalCardProps {
  envStatus: SystemEnvStatus | null;
  onRefreshActivation: () => void;
  onSyncShims: () => void;
  onApplyPwsh: () => void;
  onRemovePwsh: () => void;
}

export const SettingsTerminalCard: React.FC<SettingsTerminalCardProps> = ({
  envStatus,
  onRefreshActivation,
  onSyncShims,
  onApplyPwsh,
  onRemovePwsh,
}) => {
  const isShimsActive = envStatus?.path_has_shims;
  const isPwshActive = envStatus?.pwsh_profile_active;

  return (
    <div className="fluent-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <span>🪶</span>
          <span>终端与 Shims 激活管理 (CMD / PowerShell)</span>
        </h3>
        <button className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={onRefreshActivation}>
          🔄 刷新激活状态
        </button>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 16 }}>
        控制不同终端的激活模式：CMD 采用 Shims 垫片机制，PowerShell 采用动态 Hook 机制
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
        {/* 左子卡片：CMD / 通用终端 */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                <span>💻</span>
                <span>CMD / 通用终端 (Shims 垫片)</span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 4,
                  backgroundColor: isShimsActive ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 88, 12, 0.15)",
                  color: isShimsActive ? "var(--success-color)" : "var(--warning-color)",
                }}
              >
                {isShimsActive ? "✓ 已激活" : "⚠️ 未激活 (未加入 Path)"}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
              通过在 Windows 用户 Path 中注册 <code>data\shims</code> 垫片目录，使 CMD、Git Bash 及各类 IDE 终端能直接调用已激活的全局工具版本。
            </p>
          </div>
          <button className="btn btn-primary" style={{ fontSize: 12.5, alignSelf: "flex-start" }} onClick={onSyncShims}>
            ⚡ 同步 Shims 环境变量
          </button>
        </div>

        {/* 右子卡片：PowerShell 动态 Hook */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                <span>⚡</span>
                <span>PowerShell 动态 Hook</span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 4,
                  backgroundColor: isPwshActive ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 88, 12, 0.15)",
                  color: isPwshActive ? "var(--success-color)" : "var(--warning-color)",
                }}
              >
                {isPwshActive ? "✓ 已激活 (Hook 已注入)" : "⚠️ 未激活"}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>
              写入 PowerShell 配置文件 (<code>$PROFILE</code>)，支持跨项目目录自动切换版本环境。
            </p>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 8 }}>
              • Windows PowerShell 5.1: <span style={{ color: isPwshActive ? "var(--success-color)" : "inherit" }}>{isPwshActive ? "✓ 已激活" : "未注入"}</span><br />
              • PowerShell 7+: <span style={{ color: isPwshActive ? "var(--success-color)" : "inherit" }}>{isPwshActive ? "✓ 已激活" : "未注入"}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>
              💡 内置自动抑制 5.1 兼容告警 (<code>$env:MISE_PWSH_CHPWD_WARNING=0</code>)
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" style={{ fontSize: 12.5 }} onClick={onApplyPwsh}>
              ⚡ 一键激活 PowerShell
            </button>
            <button className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={onRemovePwsh}>
              🗑️ 清除激活
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
