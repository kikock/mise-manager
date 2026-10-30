import React, { useMemo, useState } from "react";
import { InstalledTool, MisePaths, PluginMarketItem } from "../types/index.ts";
import { ConfirmModal } from "../components/ConfirmModal.tsx";
import { ToolVersionModal, getToolIcon } from "../components/ToolVersionModal.tsx";
import { TauriService } from "../services/tauri.ts";

interface InstalledProps {
  tools: InstalledTool[];
  paths: MisePaths | null;
  marketPlugins: PluginMarketItem[];
  onRefreshTools: () => void;
  onScanDownloadedTools?: () => Promise<void> | void;
  onUseTool: (tool: string, version: string, isGlobal: boolean) => void;
  onUninstallTool: (tool: string, version: string) => void;
  onInstallTool: (tool: string, version?: string) => void;
  onOpenDirectory: (path: string) => void;
  showToast?: (content: string, type?: "success" | "info" | "warning" | "error") => void;
}

interface GroupedTool {
  name: string;
  activeVersion?: string;
  versions: InstalledTool[];
}

export const Installed: React.FC<InstalledProps> = ({
  tools,
  paths,
  marketPlugins,
  onRefreshTools,
  onScanDownloadedTools,
  onUseTool,
  onUninstallTool,
  onInstallTool,
  onOpenDirectory,
  showToast,
}) => {
  const [filterText, setFilterText] = useState("");
  const [uninstallTarget, setUninstallTarget] = useState<InstalledTool | null>(null);
  const [versionModalTool, setVersionModalTool] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScanClick = async () => {
    setIsScanning(true);
    try {
      if (onScanDownloadedTools) {
        await onScanDownloadedTools();
      } else {
        await onRefreshTools();
      }
      showToast?.("已重新扫描 downloads 目录中的工具与版本", "success");
    } finally {
      setIsScanning(false);
    }
  };

  // 按工具名称聚合并分组
  const groupedTools = useMemo(() => {
    const map = new Map<string, GroupedTool>();
    tools.forEach((t) => {
      const existing = map.get(t.name) || {
        name: t.name,
        versions: [],
      };
      existing.versions.push(t);
      if (t.is_active) {
        existing.activeVersion = t.version;
      }
      map.set(t.name, existing);
    });

    const groups = Array.from(map.values());
    if (!filterText.trim()) return groups;

    const query = filterText.toLowerCase();
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(query) ||
        g.versions.some((v) => v.version.toLowerCase().includes(query))
    );
  }, [tools, filterText]);

  // 本地项目使用：选择目录并应用 mise use
  const handleLocalProjectUse = async (tool: string, version: string) => {
    const selectedDir = await TauriService.selectDirectory(`选择要绑定 ${tool}@${version} 的项目目录`);
    if (selectedDir) {
      await TauriService.useToolInDirectory(tool, version, selectedDir);
      onRefreshTools();
    }
  };

  const currentPluginInfo = versionModalTool
    ? marketPlugins.find((p) => p.name.toLowerCase() === versionModalTool.toLowerCase())
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 顶部标题与副标题 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px 0", color: "var(--text-primary)" }}>
            已安装工具
          </h2>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            管理本地 mise 环境中的工具、版本切换与全局默认版本
          </div>
        </div>
      </div>

      {/* 蓝底卡片：当前生效目录与重新扫描 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "rgba(37, 99, 235, 0.08)",
          border: "1px solid rgba(37, 99, 235, 0.22)",
          borderRadius: "var(--radius-md)",
          padding: "12px 18px",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span>📁</span>
          <span style={{ color: "var(--text-secondary)" }}>当前下载与生效目录 (MISE_DATA_DIR):</span>
          <strong style={{ color: "var(--accent-color)", fontFamily: "monospace" }}>
            {paths?.data_dir || "默认自包含 data 目录"}
          </strong>
        </div>
        <button
          className="btn btn-primary"
          style={{ fontSize: 12, padding: "5px 14px" }}
          onClick={handleScanClick}
          disabled={isScanning}
        >
          {isScanning ? "⏳ 正在重新扫描..." : "🔄 重新扫描已下载应用"}
        </button>
      </div>

      {/* 重新扫描中提示条 */}
      {isScanning && (
        <div
          style={{
            backgroundColor: "rgba(37, 99, 235, 0.1)",
            border: "1px solid rgba(37, 99, 235, 0.25)",
            borderRadius: 6,
            padding: "8px 14px",
            fontSize: 12.5,
            color: "var(--accent-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>⏳</span>
            <span>正在深入扫描物理存储目录与已安装版本，实时流式进度已同步输出至终端...</span>
          </div>
          <span style={{ fontSize: 11, fontFamily: "monospace" }}>[扫描中]</span>
        </div>
      )}

      {/* 版本控制指南卡片 */}
      <div
        className="fluent-card"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "14px 18px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600 }}>
            <span>💡</span>
            <span>版本控制指南: 全局使用 vs 本地使用有何区别?</span>
          </div>
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 4,
              backgroundColor: "rgba(37, 99, 235, 0.15)",
              color: "var(--accent-color)",
            }}
          >
            mise 核心机制
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {/* 全局使用 */}
          <div style={{ borderLeft: "2px solid #eab308", paddingLeft: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              <span>☀️ 设为全局使用 (Global)</span>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontFamily: "monospace" }}>~/.config/mise/config.toml</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.45 }}>
              系统默认版本。在 Windows 任意新建终端或常规目录下，输入命令行时默认均直接调用此版本，适合日常主力环境。
            </div>
          </div>

          {/* 本地项目使用 */}
          <div style={{ borderLeft: "2px solid #ec4899", paddingLeft: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              <span>📍 本地项目使用 (Local)</span>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontFamily: "monospace" }}>.mise.toml</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.45 }}>
              项目级锁定版本。点击后可选择目标项目文件夹并生成配置，仅在该项目及其子目录下生效，离开后自动恢复全局默认，实现多项目版本隔离。
            </div>
          </div>
        </div>
      </div>

      {/* 搜索过滤框 */}
      <div>
        <input
          type="text"
          placeholder="🔍 过滤已安装工具..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            backgroundColor: "var(--bg-input)",
            color: "var(--text-primary)",
            outline: "none",
            fontSize: 13,
          }}
        />
      </div>

      {/* 工具列表 */}
      {groupedTools.length === 0 ? (
        <div className="fluent-card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>尚未安装任何工具或未匹配</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            前往「应用市场」即可一键扫描并安装多版本开发环境。
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {groupedTools.map((g) => (
            <div
              key={g.name}
              className="fluent-card"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.025)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "16px 20px",
              }}
            >
              {/* 工具头部信息与操作 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{getToolIcon(g.name)}</span>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{g.name}</span>
                  {g.activeVersion && (
                    <span
                      style={{
                        fontSize: 11.5,
                        padding: "2px 8px",
                        borderRadius: 4,
                        backgroundColor: "rgba(16, 185, 129, 0.15)",
                        color: "#34d399",
                        fontWeight: 600,
                      }}
                    >
                      ★ 当前激活 {g.activeVersion}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 11.5,
                      padding: "2px 8px",
                      borderRadius: 4,
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    共 {g.versions.length} 个已安装版本
                  </span>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: "4px 12px" }}
                  onClick={() => setVersionModalTool(g.name)}
                >
                  🗂️ 安装其他版本
                </button>
              </div>

              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
                当前激活版本已生效于全局环境变量，命令行可直接发起
              </div>

              {/* 版本列表表头 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11.5,
                  color: "var(--text-muted)",
                  padding: "4px 8px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                  marginBottom: 8,
                }}
              >
                <span>本地版本与物理存储路径</span>
                <span>版本切换控制 (mise use)</span>
              </div>

              {/* 具体版本列表 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {g.versions.map((ver) => {
                  const isActive = ver.is_active;
                  const displayPath = ver.path || `${paths?.data_dir || "data"}\\installs\\${g.name}\\${ver.version}`;

                  return (
                    <div
                      key={ver.version}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: 6,
                        backgroundColor: isActive ? "rgba(37, 99, 235, 0.1)" : "rgba(255, 255, 255, 0.02)",
                        border: isActive ? "1px solid rgba(37, 99, 235, 0.25)" : "1px solid rgba(255, 255, 255, 0.04)",
                      }}
                    >
                      {/* 左侧版本号与路径 */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "var(--text-primary)" }}>
                            {ver.version}
                          </span>
                          {isActive ? (
                            <span
                              style={{
                                fontSize: 10.5,
                                padding: "1px 6px",
                                borderRadius: 4,
                                backgroundColor: "rgba(16, 185, 129, 0.2)",
                                color: "#34d399",
                                fontWeight: 500,
                              }}
                            >
                              当前使用中 (Active) <span style={{ opacity: 0.8 }}>(config.toml)</span>
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>未激活</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4 }}>
                          <span>📁</span>
                          <span>{displayPath}</span>
                        </div>
                      </div>

                      {/* 右侧控制按钮 */}
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {isActive ? (
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: 11.5, padding: "4px 12px", opacity: 0.8, cursor: "default" }}
                            disabled
                          >
                            ★ 已是默认
                          </button>
                        ) : (
                          <>
                            <button
                              className="btn btn-primary"
                              style={{ fontSize: 11.5, padding: "4px 12px", backgroundColor: "#2563eb" }}
                              onClick={() => onUseTool(g.name, ver.version, true)}
                            >
                              ☀️ 设为全局使用
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize: 11.5, padding: "4px 12px" }}
                              onClick={() => handleLocalProjectUse(g.name, ver.version)}
                            >
                              📍 本地项目使用
                            </button>
                          </>
                        )}

                        {ver.path && (
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: 12, padding: "4px 8px" }}
                            title="打开本地存储目录"
                            onClick={() => onOpenDirectory(ver.path!)}
                          >
                            📁
                          </button>
                        )}

                        <button
                          className="btn btn-secondary"
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                            color: "#f87171",
                            borderColor: "rgba(239, 68, 68, 0.3)",
                          }}
                          title="卸载此版本"
                          onClick={() => setUninstallTarget(ver)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 确认卸载模态弹窗 */}
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

      {/* 版本管理与安装弹窗 (图2) */}
      <ToolVersionModal
        isOpen={versionModalTool !== null}
        toolName={versionModalTool || ""}
        pluginInfo={currentPluginInfo}
        installedTools={tools}
        onClose={() => setVersionModalTool(null)}
        onInstall={(tool, ver) => {
          onInstallTool(tool, ver);
          setVersionModalTool(null);
        }}
        onUninstall={(tool, ver) => {
          onUninstallTool(tool, ver);
        }}
        onSetDefault={(tool, ver) => {
          onUseTool(tool, ver, true);
        }}
      />
    </div>
  );
};
