import React from "react";

export type NavTab = "home" | "installed" | "market" | "settings";

interface NavigationProps {
  currentTab: NavTab;
  installedCount: number;
  onTabChange: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  installedCount,
  onTabChange,
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

      <div style={{ marginTop: "auto", padding: "12px", borderTop: "1px solid var(--border-subtle)", fontSize: 11, color: "var(--text-muted)" }}>
        Tauri 2.x + Rust 异步驱动
      </div>
    </aside>
  );
};
