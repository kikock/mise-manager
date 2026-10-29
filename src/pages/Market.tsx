import React, { useState } from "react";
import { PluginMarketItem } from "../types/index.ts";

interface MarketProps {
  plugins: PluginMarketItem[];
  onInstall: (tool: string, version?: string) => void;
}

export const Market: React.FC<MarketProps> = ({ plugins, onInstall }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("全部");
  const [installModalTool, setInstallModalTool] = useState<PluginMarketItem | null>(null);
  const [customVersion, setCustomVersion] = useState("");

  const categories = ["全部", "编程语言", "包管理器", "构建工具", "CLI工具"];

  const filtered = plugins.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === "全部" || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 搜索与分类栏 */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="搜索运行时环境或工具 (例如: node, python, go, rust)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: 260,
            padding: "9px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            backgroundColor: "var(--bg-input)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        />

        <div style={{ display: "flex", gap: 6 }}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`btn ${selectedCategory === cat ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 工具列表网格 */}
      <div className="fluent-grid">
        {filtered.map((item) => (
          <div key={item.name} className="fluent-card" style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{item.name}</span>
                <span style={{ fontSize: 11, marginLeft: 8, color: "var(--text-muted)" }}>
                  [{item.category}]
                </span>
              </div>
              {item.is_installed && (
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 6px",
                    borderRadius: "var(--radius-pill)",
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    color: "var(--success-color)",
                  }}
                >
                  已安装 {item.installed_version}
                </span>
              )}
            </div>

            <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 16, flex: 1 }}>
              {item.description}
            </p>

            <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, fontSize: 12 }}
                onClick={() => {
                  setInstallModalTool(item);
                  setCustomVersion("latest");
                }}
              >
                📥 安装版本
              </button>
              <a
                href={item.repository}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: 12, textDecoration: "none" }}
              >
                源码
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* 安装版本指定模态弹窗 */}
      {installModalTool && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
          onClick={() => setInstallModalTool(null)}
        >
          <div
            className="fluent-card"
            style={{ width: 420, backgroundColor: "var(--bg-card)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
              安装 {installModalTool.name}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 12.5, marginBottom: 16 }}>
              请输入要安装的具体版本号（如 20.12.0, 3.11.8，或留空/填 latest 安装最新稳定版）：
            </p>
            <input
              type="text"
              placeholder="例如: latest 或 20.10.0"
              value={customVersion}
              onChange={(e) => setCustomVersion(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-input)",
                color: "var(--text-primary)",
                marginBottom: 20,
                outline: "none",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setInstallModalTool(null)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onInstall(installModalTool.name, customVersion.trim());
                  setInstallModalTool(null);
                }}
              >
                开始流式安装
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
