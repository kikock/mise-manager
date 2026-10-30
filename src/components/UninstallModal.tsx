import React, { useState } from "react";

interface UninstallModalProps {
  isOpen: boolean;
  onConfirm: (deleteData: boolean) => void;
  onCancel: () => void;
}

export const UninstallModal: React.FC<UninstallModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  const [deleteData, setDeleteData] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "var(--modal-overlay-bg)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onCancel}
    >
      <div
        className="fluent-card"
        style={{
          width: 500,
          backgroundColor: "var(--modal-card-bg)",
          border: "1px solid var(--modal-card-border)",
          boxShadow: "var(--modal-card-shadow)",
          borderRadius: 14,
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题区 */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 22,
              color: "#f87171",
            }}
          >
            🗑️
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary, #ffffff)" }}>
              安全卸载 mise 核心
            </h3>
            <div style={{ fontSize: 12, color: "var(--text-muted, #a1a1aa)", marginTop: 2 }}>
              即将移除本地 mise 核心程序及相关配置
            </div>
          </div>
        </div>

        {/* 提示正文 */}
        <p style={{ color: "var(--text-secondary, #d4d4d8)", fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
          确定要从本地移除 mise 核心程序吗？该操作将安全停止所有运行中的 mise 进程，并自动清理 Windows 环境变量与终端激活配置。
        </p>

        {/* 是否删除 data 数据选框 */}
        <div
          style={{
            backgroundColor: deleteData ? "rgba(239, 68, 68, 0.08)" : "rgba(255, 255, 255, 0.03)",
            border: `1px solid ${deleteData ? "rgba(239, 68, 68, 0.35)" : "var(--border-subtle)"}`,
            borderRadius: 8,
            padding: "12px 14px",
            marginBottom: 20,
            transition: "all 0.2s ease",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={deleteData}
              onChange={(e) => setDeleteData(e.target.checked)}
              style={{ accentColor: "#ef4444", cursor: "pointer", marginTop: 2 }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: deleteData ? "#f87171" : "var(--text-primary)" }}>
                同时删除已下载的 data 数据目录
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.5 }}>
                包含已下载安装的所有 Node.js、Python、Go、Rust 等开发工具及版本文件。
                {deleteData && (
                  <span style={{ color: "#f87171", display: "block", marginTop: 4, fontWeight: 500 }}>
                    ⚠️ 勾选后，所有工具环境将被彻底清除且无法撤销！
                  </span>
                )}
              </div>
            </div>
          </label>
        </div>

        {/* 底部按钮栏 */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            style={{
              padding: "7px 18px",
              fontSize: 13,
              borderRadius: 6,
              border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
            }}
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(deleteData)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 20px",
              fontSize: 13,
              borderRadius: 6,
              backgroundColor: "#ef4444",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: 600,
              boxShadow: "0 2px 10px rgba(239, 68, 68, 0.35)",
              transition: "all 0.15s ease",
            }}
          >
            <span>🗑️</span>
            <span>{deleteData ? "彻底卸载 (含 data 数据)" : "仅卸载程序 (保留数据)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
