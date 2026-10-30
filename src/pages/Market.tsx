import React, { useState } from "react";
import { InstalledTool, PluginMarketItem } from "../types/index.ts";
import { ToolVersionModal, getToolIcon } from "../components/ToolVersionModal.tsx";

interface MarketProps {
  plugins: PluginMarketItem[];
  installedTools: InstalledTool[];
  onRefreshMarket: () => void;
  onInstall: (tool: string, version?: string) => void;
  onUninstall: (tool: string, version: string) => void;
  onUseTool: (tool: string, version: string, isGlobal: boolean) => void;
  showToast?: (content: string, type?: "success" | "info" | "warning" | "error") => void;
}

export const Market: React.FC<MarketProps> = ({
  plugins,
  installedTools,
  onRefreshMarket,
  onInstall,
  onUninstall,
  onUseTool,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("全部");
  const [selectedTool, setSelectedTool] = useState<PluginMarketItem | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncClick = async () => {
    setIsSyncing(true);
    try {
      await onRefreshMarket();
      showToast?.("市场注册表与工具数据已同步最新", "success");
    } finally {
      setIsSyncing(false);
    }
  };

  const categories = ["全部", "编程语言", "包管理器", "构建工具", "CLI工具"];

  const filtered = plugins.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.repository.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === "全部" || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 头部标题与控制按钮 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px 0", color: "var(--text-primary)" }}>
            应用市场
          </h2>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            浏览 mise 支持的所有开源工具，查看版本并一键安装 · 数据源: mise-versions.jdx.dev
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 6,
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              color: "var(--text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            💾 缓存可用
          </span>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: "4px 12px" }}
            onClick={handleSyncClick}
            disabled={isSyncing}
          >
            {isSyncing ? "⏳ 正在同步注册表..." : "🔄 强制拉取/更新"}
          </button>
        </div>
      </div>

      {/* 实时拉取进度条 */}
      {isSyncing && (
        <div
          style={{
            backgroundColor: "rgba(37, 99, 235, 0.12)",
            border: "1px solid rgba(37, 99, 235, 0.3)",
            borderRadius: 6,
            padding: "8px 14px",
            fontSize: 12.5,
            color: "#60a5fa",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>⏳</span>
            <span>正在从官方 Registry 源拉取全量 JSON 架构数据，详细推流请查看下方实时终端...</span>
          </div>
          <span style={{ fontSize: 11, fontFamily: "monospace" }}>[流式拉取中]</span>
        </div>
      )}

      {/* 搜索栏与保留类别筛选 (图4) */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="🔍 搜索开发工具 (例如: node, python, go, rust, java, docker, bun...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: 320,
            padding: "9px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            backgroundColor: "var(--bg-input)",
            color: "var(--text-primary)",
            outline: "none",
            fontSize: 13,
          }}
        />

        {/* 类型筛选 */}
        <div style={{ display: "flex", gap: 6 }}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`btn ${selectedCategory === cat ? "btn-primary" : "btn-secondary"}`}
              style={{
                fontSize: 12.5,
                padding: "6px 14px",
                borderRadius: 6,
                backgroundColor: selectedCategory === cat ? "#6366f1" : undefined,
                borderColor: selectedCategory === cat ? "#6366f1" : undefined,
              }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 统计提示与热门 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, color: "var(--text-muted)" }}>
        <div>
          当前展示 <strong style={{ color: "var(--text-primary)" }}>{filtered.length}</strong> 个工具 (总计 1069)
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>🔥 热门推荐</span>
        </div>
      </div>

      {/* 工具列表网格 (图3) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {filtered.map((item) => {
          return (
            <div
              key={item.name}
              className="fluent-card"
              style={{
                padding: 16,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                backgroundColor: "rgba(255, 255, 255, 0.025)",
              }}
              onClick={() => setSelectedTool(item)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.5)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.transform = "none";
              }}
            >
              <div>
                {/* 头部：图标、名称与仓库 */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 24 }}>{getToolIcon(item.name)}</span>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                        {item.name}
                      </span>
                      {item.is_installed && (
                        <span
                          style={{
                            fontSize: 10.5,
                            padding: "1px 6px",
                            borderRadius: 4,
                            backgroundColor: "rgba(16, 185, 129, 0.15)",
                            color: "#34d399",
                          }}
                        >
                          已安装
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {item.repository}
                    </div>
                  </div>
                </div>

                {/* 描述 */}
                <p
                  style={{
                    fontSize: 12.5,
                    color: "var(--text-secondary)",
                    lineHeight: 1.45,
                    minHeight: 36,
                    margin: "6px 0 16px 0",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {item.description}
                </p>
              </div>

              {/* 底部信息栏 (图3) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  paddingTop: 10,
                  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                  marginTop: "auto",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8", fontFamily: "monospace" }}>
                    {item.latest_version || "latest"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    最新稳定版
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 1 }}>
                    同步更新: {item.updated_at || "近期"}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "monospace" }}>
                    {item.versions_count ? item.versions_count.toLocaleString() : "100+"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    可用版本数
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 弹窗：版本扫描与安装 (图2) */}
      <ToolVersionModal
        isOpen={selectedTool !== null}
        toolName={selectedTool?.name || ""}
        pluginInfo={selectedTool}
        installedTools={installedTools}
        onClose={() => setSelectedTool(null)}
        onInstall={(tool, ver) => {
          onInstall(tool, ver);
          setSelectedTool(null);
        }}
        onUninstall={(tool, ver) => {
          onUninstall(tool, ver);
        }}
        onSetDefault={(tool, ver) => {
          onUseTool(tool, ver, true);
        }}
      />
    </div>
  );
};
