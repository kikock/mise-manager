import React, { useEffect, useState } from "react";
import { InstalledTool, PluginMarketItem } from "../types/index.ts";
import { TauriService } from "../services/tauri.ts";

export const getToolIcon = (name: string): string => {
  const map: Record<string, string> = {
    gradle: "🐘",
    java: "☕",
    node: "🟩",
    python: "🐍",
    go: "🐹",
    rust: "🦀",
    pnpm: "📦",
    yarn: "🧶",
    maven: "🪶",
    bun: "🥟",
    deno: "🦕",
    zig: "⚡",
    ruby: "💎",
    php: "🐘",
    neovim: "🟢",
    ripgrep: "🔍",
    fd: "⚡",
    bat: "🦇",
    docker: "🐳",
    "docker-cli": "🐳",
    claude: "🟠",
    codex: "🤖",
    opencode: "💻",
    terraform: "🏗️",
    jq: "🔧",
    shellcheck: "🐚",
    gh: "🐙",
    uv: "⚡",
  };
  return map[name.toLowerCase()] || "📦";
};

interface ToolVersionModalProps {
  isOpen: boolean;
  toolName: string;
  pluginInfo?: PluginMarketItem | null;
  installedTools: InstalledTool[];
  onClose: () => void;
  onInstall: (tool: string, version: string) => void;
  onUninstall: (tool: string, version: string) => void;
  onSetDefault: (tool: string, version: string) => void;
}

export const ToolVersionModal: React.FC<ToolVersionModalProps> = ({
  isOpen,
  toolName,
  pluginInfo,
  installedTools,
  onClose,
  onInstall,
  onUninstall,
  onSetDefault,
}) => {
  const [remoteVersions, setRemoteVersions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isOpen || !toolName) return;
    let isMounted = true;
    setLoading(true);
    setErrorMsg("");

    TauriService.listToolRemoteVersions(toolName)
      .then((versions) => {
        if (!isMounted) return;
        setRemoteVersions(versions);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("获取远程版本异常:", err);
        setErrorMsg("扫描可用版本超时或失败，请检查网络或 mise 运行时");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, toolName]);

  if (!isOpen || !toolName) return null;

  const currentToolInstalls = installedTools.filter(
    (t) => t.name.toLowerCase() === toolName.toLowerCase()
  );
  const activeVersion = currentToolInstalls.find((t) => t.is_active)?.version;
  const installedMap = new Set(currentToolInstalls.map((t) => t.version));

  // 合并已安装但可能在 remote 中没有完全列出的旧版本
  const allVersions = Array.from(new Set([...currentToolInstalls.map((t) => t.version), ...remoteVersions]));

  // 推导最新稳定版与最新预览版
  const latestVer = pluginInfo?.latest_version || allVersions[0] || "-";
  const stableVer = pluginInfo?.latest_version || allVersions.find((v) => !v.includes("-") && !v.includes("alpha") && !v.includes("rc")) || allVersions[0] || "-";
  const totalCount = allVersions.length || pluginInfo?.versions_count || 0;

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
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="fluent-card"
        style={{
          width: 520,
          maxWidth: "92vw",
          maxHeight: "88vh",
          backgroundColor: "#161b26",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 14,
          padding: 22,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部标题与关闭 */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>{getToolIcon(toolName)}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{toolName}</span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                fontSize: 18,
                cursor: "pointer",
                padding: "4px 8px",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 12 }}>
            {pluginInfo?.description || `${toolName} 现代化开发工具与跨平台版本管理器运行时`}
          </div>

          {/* 胶囊标签栏 */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span
              style={{
                fontSize: 11.5,
                padding: "3px 10px",
                borderRadius: 12,
                backgroundColor: "rgba(37, 99, 235, 0.2)",
                color: "#60a5fa",
                fontWeight: 600,
              }}
            >
              最新: {latestVer}
            </span>
            <span
              style={{
                fontSize: 11.5,
                padding: "3px 10px",
                borderRadius: 12,
                backgroundColor: "rgba(16, 185, 129, 0.2)",
                color: "#34d399",
                fontWeight: 600,
              }}
            >
              稳定: {stableVer}
            </span>
            <span
              style={{
                fontSize: 11.5,
                padding: "3px 10px",
                borderRadius: 12,
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              版本数: {totalCount}
            </span>
            {pluginInfo?.repository && (
              <a
                href={pluginInfo.repository.startsWith("http") ? pluginInfo.repository : `https://github.com/${pluginInfo.repository}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 11.5,
                  padding: "3px 10px",
                  borderRadius: 12,
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  color: "#f87171",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontWeight: 500,
                }}
              >
                <span>🐙</span>
                <span>GitHub 仓库</span>
              </a>
            )}
          </div>
        </div>

        {/* 可用版本列表标题 */}
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          可用版本列表
        </div>

        {/* 滚动列表 */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            maxHeight: 380,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            paddingRight: 4,
          }}
        >
          {loading && (
            <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-secondary)", fontSize: 13 }}>
              ⏳ 正在通过 mise 扫描可用版本列表，请稍候...
            </div>
          )}

          {!loading && errorMsg && (
            <div style={{ textAlign: "center", padding: "20px 10px", color: "var(--error-color)", fontSize: 12.5 }}>
              {errorMsg}
            </div>
          )}

          {!loading && allVersions.length === 0 && !errorMsg && (
            <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)", fontSize: 13 }}>
              暂无版本数据
            </div>
          )}

          {!loading &&
            allVersions.map((ver) => {
              const isInstalled = installedMap.has(ver);
              const isDefault = activeVersion === ver;
              const isStable = ver === stableVer;

              return (
                <div
                  key={ver}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 14px",
                    borderRadius: 8,
                    backgroundColor: isInstalled ? "rgba(37, 99, 235, 0.12)" : "rgba(255, 255, 255, 0.03)",
                    border: isInstalled ? "1px solid rgba(37, 99, 235, 0.3)" : "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                      {ver}
                    </span>
                    {isStable && (
                      <span
                        style={{
                          fontSize: 10.5,
                          padding: "1px 6px",
                          borderRadius: 4,
                          backgroundColor: "rgba(16, 185, 129, 0.2)",
                          color: "#34d399",
                          fontWeight: 600,
                        }}
                      >
                        稳定
                      </span>
                    )}
                    {isInstalled && (
                      <span
                        style={{
                          fontSize: 10.5,
                          padding: "1px 6px",
                          borderRadius: 4,
                          backgroundColor: "rgba(16, 185, 129, 0.15)",
                          color: "#34d399",
                          fontWeight: 500,
                        }}
                      >
                        已安装
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {isInstalled ? (
                      <>
                        <button
                          className="btn btn-secondary"
                          style={{
                            fontSize: 11.5,
                            padding: "3px 10px",
                            color: "#f87171",
                            borderColor: "rgba(239, 68, 68, 0.3)",
                            backgroundColor: "rgba(239, 68, 68, 0.08)",
                          }}
                          onClick={() => onUninstall(toolName, ver)}
                        >
                          卸载
                        </button>
                        <button
                          className={`btn ${isDefault ? "btn-secondary" : "btn-primary"}`}
                          style={{
                            fontSize: 11.5,
                            padding: "3px 10px",
                            backgroundColor: isDefault ? "rgba(255, 255, 255, 0.08)" : undefined,
                            color: isDefault ? "var(--text-muted)" : undefined,
                            cursor: isDefault ? "default" : "pointer",
                          }}
                          disabled={isDefault}
                          onClick={() => !isDefault && onSetDefault(toolName, ver)}
                        >
                          {isDefault ? "当前默认" : "设为默认"}
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: 11.5, padding: "3px 14px", backgroundColor: "#2563eb" }}
                        onClick={() => onInstall(toolName, ver)}
                      >
                        安装
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* 底部关闭按钮 */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <button className="btn btn-secondary" style={{ padding: "6px 18px", fontSize: 12.5 }} onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
