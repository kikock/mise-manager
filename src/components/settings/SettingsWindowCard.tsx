import React from "react";

interface SettingsWindowCardProps {
  closeAction: "ask" | "tray" | "quit";
  onChangeCloseAction: (action: "ask" | "tray" | "quit") => void;
}

export const SettingsWindowCard: React.FC<SettingsWindowCardProps> = ({
  closeAction,
  onChangeCloseAction,
}) => {
  return (
    <div className="fluent-card" style={{ padding: "18px 20px" }}>
      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          color: "var(--text-primary, #ffffff)",
        }}
      >
        <span style={{ fontSize: 15 }}>🗔</span>
        <span>窗口控制与系统托盘行为</span>
      </h3>
      <p style={{ fontSize: 12.5, color: "var(--text-secondary, #d4d4d8)", marginBottom: 12 }}>
        点击主窗口右上角关闭按钮（X）时的默认响应动作：
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, marginBottom: 12 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 6,
            backgroundColor: closeAction === "ask" ? "rgba(0, 120, 212, 0.12)" : "transparent",
            border: closeAction === "ask" ? "1px solid rgba(0, 120, 212, 0.35)" : "1px solid transparent",
            transition: "all 0.15s cubic-bezier(0.1, 0.9, 0.2, 1.0)",
          }}
        >
          <input
            type="radio"
            name="miseCloseAction"
            value="ask"
            checked={closeAction === "ask"}
            onChange={() => onChangeCloseAction("ask")}
            style={{ accentColor: "var(--primary-color, #0078d4)", cursor: "pointer" }}
          />
          <span>每次询问（弹窗提示）</span>
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 6,
            backgroundColor: closeAction === "tray" ? "rgba(0, 120, 212, 0.12)" : "transparent",
            border: closeAction === "tray" ? "1px solid rgba(0, 120, 212, 0.35)" : "1px solid transparent",
            transition: "all 0.15s cubic-bezier(0.1, 0.9, 0.2, 1.0)",
          }}
        >
          <input
            type="radio"
            name="miseCloseAction"
            value="tray"
            checked={closeAction === "tray"}
            onChange={() => onChangeCloseAction("tray")}
            style={{ accentColor: "var(--primary-color, #0078d4)", cursor: "pointer" }}
          />
          <span>最小化到托盘（不在任务栏显示）</span>
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 6,
            backgroundColor: closeAction === "quit" ? "rgba(216, 59, 1, 0.12)" : "transparent",
            border: closeAction === "quit" ? "1px solid rgba(216, 59, 1, 0.35)" : "1px solid transparent",
            transition: "all 0.15s cubic-bezier(0.1, 0.9, 0.2, 1.0)",
          }}
        >
          <input
            type="radio"
            name="miseCloseAction"
            value="quit"
            checked={closeAction === "quit"}
            onChange={() => onChangeCloseAction("quit")}
            style={{ accentColor: "#d83b01", cursor: "pointer" }}
          />
          <span>直接退出程序</span>
        </label>
      </div>

      <div style={{ fontSize: 11.5, color: "var(--text-muted, #a1a1aa)" }}>
        * 点击窗口最小化按钮（_）时，窗口将直接缩小至系统托盘，不再占用任务栏空间。
      </div>
    </div>
  );
};
