import React, { useState } from "react";
import { InstalledTool } from "../types/index.ts";
import { ConfirmModal } from "../components/ConfirmModal.tsx";

interface InstalledProps {
  tools: InstalledTool[];
  onUseTool: (tool: string, version: string, isGlobal: boolean) => void;
  onUninstallTool: (tool: string, version: string) => void;
  onOpenDirectory: (path: string) => void;
}

export const Installed: React.FC<InstalledProps> = ({
  tools,
  onUseTool,
  onUninstallTool,
  onOpenDirectory,
}) => {
  const [uninstallTarget, setUninstallTarget] = useState<InstalledTool | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>
          已安装运行环境 ({tools.length})
        </h3>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          可一键将任一版本设为系统全局默认或当前目录版本
        </span>
      </div>

      {tools.length === 0 ? (
        <div className="fluent-card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>尚未安装任何运行时</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
            前往「工具市场」即可一键安装 Node.js、Python、Go、Rust 等多版本环境。
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tools.map((t, idx) => (
            <div
              key={`${t.name}-${t.version}-${idx}`}
              className="fluent-card"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(99, 102, 241, 0.15)",
                    color: "var(--accent-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  {t.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{t.name}</span>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>@{t.version}</span>
                    {t.is_active && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: "var(--radius-pill)",
                          backgroundColor: "rgba(16, 185, 129, 0.2)",
                          color: "var(--success-color)",
                          fontWeight: 500,
                        }}
                      >
                        ● 全局当前激活
                      </span>
                    )}
                  </div>
                  {t.path && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                      安装路径: {t.path}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {!t.is_active && (
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: 12 }}
                    onClick={() => onUseTool(t.name, t.version, true)}
                  >
                    设为全局默认
                  </button>
                )}
                {t.path && (
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 12 }}
                    onClick={() => onOpenDirectory(t.path!)}
                  >
                    定位目录
                  </button>
                )}
                <button
                  className="btn btn-danger"
                  style={{ fontSize: 12 }}
                  onClick={() => setUninstallTarget(t)}
                >
                  卸载
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 确认卸载弹窗 */}
      <ConfirmModal
        isOpen={uninstallTarget !== null}
        title="确认卸载运行时"
        message={`确定要卸载 ${uninstallTarget?.name}@${uninstallTarget?.version} 吗？此操作将清除对应版本的本地二进制文件。`}
        confirmText="确认卸载"
        isDanger={true}
        onConfirm={() => {
          if (uninstallTarget) {
            onUninstallTool(uninstallTarget.name, uninstallTarget.version);
            setUninstallTarget(null);
          }
        }}
        onCancel={() => setUninstallTarget(null)}
      />
    </div>
  );
};
