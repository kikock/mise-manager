import React from "react";

export type NavTab = "home" | "installed" | "market" | "settings";

interface NavigationProps {
  currentTab: NavTab;
  installedCount: number;
  theme: string;
  onTabChange: (tab: NavTab) => void;
  onToggleTheme: () => void;
  onOpenExternal: (url: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  installedCount,
  theme,
  onTabChange,
  onToggleTheme,
  onOpenExternal,
}) => {
  const items: { id: NavTab; label: string; icon: string; badge?: number }[] = [
    { id: "home", label: "概览看板", icon: "📊" },
    { id: "installed", label: "已装工具", icon: "📦", badge: installedCount },
    { id: "market", label: "工具市场", icon: "🌐" },
    { id: "settings", label: "系统设置", icon: "⚙️" },
  ];

  return (
    <aside className="sidebar">
      <div className="brand-section">
        <div className="brand-icon">M</div>
        <div className="brand-text">
          <h1>mise-manager</h1>
          <span>Windows 11 原生版</span>
        </div>
      </div>

      <nav className="nav-list">
        {items.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${currentTab === item.id ? "active" : ""}`}
            onClick={() => onTabChange(item.id)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="nav-badge">{item.badge}</span>
            )}
          </div>
        ))}
      </nav>

      {/* 左下角底部区域：主题切换 + 版本号/作者/Git 徽标 */}
      <div
        style={{
          marginTop: "auto",
          padding: "16px 12px",
          borderTop: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* 浅色/深色主题切换 */}
        <button
          className="btn btn-secondary"
          onClick={onToggleTheme}
          title="切换应用程序颜色主题"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 12.5,
            padding: "6px 12px",
            borderRadius: 6,
          }}
        >
          <span>{theme === "dark" ? "☀️" : "🌙"}</span>
          <span>{theme === "dark" ? "浅色外观" : "深色外观"}</span>
        </button>

        {/* 徽章徽标栏（严格还原图4徽章样式） */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 4,
            flexWrap: "nowrap",
            width: "100%",
          }}
        >
          {/* 版本徽标 */}
          <div
            style={{
              display: "inline-flex",
              borderRadius: 3,
              overflow: "hidden",
              fontSize: 10.5,
              fontWeight: 600,
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
              lineHeight: "16px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <span style={{ backgroundColor: "#3f3f46", color: "#f4f4f5", padding: "1px 4px" }}>
              v
            </span>
            <span style={{ backgroundColor: "#2563eb", color: "#ffffff", padding: "1px 5px" }}>
              2.0.1
            </span>
          </div>

          {/* 作者徽标 (点击跳转 home.34462958.xyz) */}
          <div
            onClick={() => onOpenExternal("https://home.34462958.xyz")}
            title="访问作者主页: https://home.34462958.xyz"
            style={{
              display: "inline-flex",
              borderRadius: 3,
              overflow: "hidden",
              fontSize: 10.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
              lineHeight: "16px",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "transform 0.1s ease",
            }}
          >
            <span style={{ backgroundColor: "#3f3f46", color: "#f4f4f5", padding: "1px 4px" }}>
              by
            </span>
            <span style={{ backgroundColor: "#16a34a", color: "#ffffff", padding: "1px 5px" }}>
              kikock
            </span>
          </div>

          {/* Git 仓库徽标 */}
          <div
            onClick={() => onOpenExternal("https://github.com/kikock/mise-manager")}
            title="访问项目开源 GitHub 仓库"
            style={{
              display: "inline-flex",
              borderRadius: 3,
              overflow: "hidden",
              fontSize: 10.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
              lineHeight: "16px",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "transform 0.1s ease",
            }}
          >
            <span
              style={{
                backgroundColor: "#3f3f46",
                color: "#f4f4f5",
                padding: "1px 4px",
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <span style={{ color: "#f97316", fontSize: 9 }}>◆</span>
              <span>Git</span>
            </span>
            <span style={{ backgroundColor: "#0284c7", color: "#ffffff", padding: "1px 5px" }}>
              仓库 ↗
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
