import React from "react";
import { NavTab } from "./Navigation.tsx";

interface HeaderProps {
  currentTab: NavTab;
  isTerminalOpen: boolean;
  onToggleTerminal: () => void;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  isTerminalOpen,
  onToggleTerminal,
}) => {
  const titles: Record<NavTab, string> = {
    home: "运行环境概览与状态看板",
    installed: "已安装运行时与版本切换",
    market: "插件与多语言工具市场",
    settings: "系统运行配置与环境变量",
  };

  return (
    <header className="header-bar">
      <div className="header-title">{titles[currentTab]}</div>
      <div className="header-actions">
        <button
          className="btn btn-secondary"
          onClick={onToggleTerminal}
          title="显示/隐藏实时终端"
        >
          🖥️ 终端 {isTerminalOpen ? "▲" : "▼"}
        </button>
      </div>
    </header>
  );
};
