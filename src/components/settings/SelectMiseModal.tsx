import React, { useState } from "react";
import { MiseCandidate } from "../../types/index.ts";
import { TauriService } from "../../services/tauri.ts";

interface SelectMiseModalProps {
  isOpen: boolean;
  candidates: MiseCandidate[];
  isLoading: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  onRefreshScan: () => void;
}

export const SelectMiseModal: React.FC<SelectMiseModalProps> = ({
  isOpen,
  candidates,
  isLoading,
  onClose,
  onSelect,
  onRefreshScan,
}) => {
  const [customPath, setCustomPath] = useState("");

  if (!isOpen) return null;

  const handleBrowseCustomFile = async () => {
    const file = await TauriService.selectFile("请选择本地 mise.exe 可执行文件");
    if (file) {
      setCustomPath(file);
      onSelect(file);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        className="fluent-card"
        style={{
          width: 620,
          maxWidth: "92vw",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--bg-card, #202024)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 20px 48px rgba(0, 0, 0, 0.6)",
          borderRadius: 12,
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🔍</span>
              <span>扫描本地 mise 核心实例</span>
            </h3>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              在下方列表中选择要绑定的 mise 引擎，或手动指定其他位置的 mise.exe
            </div>
          </div>
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={onRefreshScan}>
            {isLoading ? "正在扫描..." : "🔄 重新扫描"}
          </button>
        </div>

        {/* 候选列表区域 */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingRight: 4,
            marginBottom: 16,
          }}
        >
          {candidates.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)", fontSize: 13 }}>
              {isLoading ? "正在检索本机可能存在的 mise.exe..." : "未在已知目录中探测到本地 mise，可点击下方按钮手动选择。"}
            </div>
          ) : (
            candidates.map((cand) => (
              <div
                key={cand.path}
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm)",
                  border: cand.is_current ? "1px solid var(--accent-color)" : "1px solid var(--border-subtle)",
                  backgroundColor: cand.is_current ? "rgba(37, 99, 235, 0.08)" : "rgba(255, 255, 255, 0.02)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "1px 6px",
                        borderRadius: 3,
                        backgroundColor: "rgba(255, 255, 255, 0.06)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {cand.location_type}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--accent-color)", fontFamily: "monospace", fontWeight: 600 }}>
                      {cand.version}
                    </span>
                    {cand.is_current && (
                      <span style={{ fontSize: 11, color: "var(--success-color)", fontWeight: 600 }}>
                        ● 当前使用中
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: "monospace",
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={cand.path}
                  >
                    {cand.path}
                  </div>
                </div>

                <div>
                  <button
                    className={cand.is_current ? "btn btn-secondary" : "btn btn-primary"}
                    disabled={cand.is_current}
                    style={{ fontSize: 12, padding: "5px 12px", whiteSpace: "nowrap" }}
                    onClick={() => onSelect(cand.path)}
                  >
                    {cand.is_current ? "使用中" : "选择使用"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部手动浏览与其他选项 */}
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <button className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={handleBrowseCustomFile}>
            📁 手动浏览选择本地 mise.exe
          </button>
          <button className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
