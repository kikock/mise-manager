import React from "react";
import { AppConfig } from "../../types/index.ts";

interface SettingsThemeProxyCardProps {
  form: AppConfig;
  theme: string;
  onChangeForm: (newForm: AppConfig) => void;
  onSetTheme: (theme: string) => void;
  onSaveProxy: () => void;
}

export const SettingsThemeProxyCard: React.FC<SettingsThemeProxyCardProps> = ({
  form,
  theme,
  onChangeForm,
  onSetTheme,
  onSaveProxy,
}) => {
  const colorPalette = [
    "#2563eb", // 默认蓝
    "#3b82f6",
    "#06b6d4",
    "#10b981",
    "#8b5cf6",
    "#ec4899",
    "#f97316",
    "#64748b",
  ];

  const [selectedColor, setSelectedColor] = React.useState<string>(() => {
    return localStorage.getItem("misemanager_accent_color") || "#2563eb";
  });
  const [useCustomAccent, setUseCustomAccent] = React.useState<boolean>(() => {
    return localStorage.getItem("misemanager_custom_accent_enabled") === "true";
  });

  const applyColor = (color: string) => {
    setSelectedColor(color);
    setUseCustomAccent(true);
    localStorage.setItem("misemanager_accent_color", color);
    localStorage.setItem("misemanager_custom_accent_enabled", "true");
    document.documentElement.style.setProperty("--accent-color", color);
    document.documentElement.style.setProperty("--accent-hover", color);
    document.documentElement.style.setProperty("--accent-active", color);
  };

  const handleToggleCustom = (enabled: boolean) => {
    setUseCustomAccent(enabled);
    localStorage.setItem("misemanager_custom_accent_enabled", enabled ? "true" : "false");
    if (enabled) {
      applyColor(selectedColor);
    } else {
      document.documentElement.style.removeProperty("--accent-color");
      document.documentElement.style.removeProperty("--accent-hover");
      document.documentElement.style.removeProperty("--accent-active");
    }
  };

  return (
    <>
      {/* 外观主题与现代调色盘 (图3) */}
      <div className="fluent-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span>🎨</span>
            <span>外观主题与现代调色盘</span>
          </h3>
          {/* 浅色 / 系统 / 深色 三态切换器 */}
          <div
            style={{
              display: "flex",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              borderRadius: 6,
              padding: 2,
              border: "1px solid var(--border-subtle)",
              fontSize: 12,
            }}
          >
            <button
              onClick={() => onSetTheme("light")}
              style={{
                padding: "3px 10px",
                borderRadius: 4,
                border: "none",
                backgroundColor: theme === "light" ? "var(--bg-card)" : "transparent",
                color: theme === "light" ? "var(--text-primary)" : "var(--text-muted)",
                cursor: "pointer",
                fontWeight: theme === "light" ? 600 : 400,
              }}
            >
              ☀️ 浅色
            </button>
            <button
              onClick={() => onSetTheme("dark")}
              style={{
                padding: "3px 10px",
                borderRadius: 4,
                border: "none",
                backgroundColor: theme === "dark" ? "var(--bg-card)" : "transparent",
                color: theme === "dark" ? "var(--text-primary)" : "var(--text-muted)",
                cursor: "pointer",
                fontWeight: theme === "dark" ? 600 : 400,
              }}
            >
              🌙 深色
            </button>
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          自定义 Windows 11 Fluent 视觉光暗模式，精雕色盘与品牌强调色，即选即生效
        </div>

        <div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
            精选强调色盘 (8 款精雕细琢)
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
            {colorPalette.map((color) => {
              const isSelected = useCustomAccent && selectedColor.toLowerCase() === color.toLowerCase();
              return (
                <div
                  key={color}
                  onClick={() => applyColor(color)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    backgroundColor: color,
                    cursor: "pointer",
                    border: isSelected ? "2px solid #ffffff" : "2px solid transparent",
                    outline: isSelected ? `2px solid ${color}` : "none",
                    outlineOffset: 2,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                    transition: "transform 0.15s ease",
                    transform: isSelected ? "scale(1.15)" : "scale(1)",
                  }}
                  title={color}
                />
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>使用自定义强调色</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>覆盖主题自带的品牌强调主色</div>
            </div>
            <input
              type="checkbox"
              checked={useCustomAccent}
              onChange={(e) => handleToggleCustom(e.target.checked)}
              style={{ cursor: "pointer", width: 16, height: 16 }}
            />
          </div>
        </div>
      </div>

      {/* 网络与代理 (图3) */}
      <div className="fluent-card">
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: 8 }}>
          <span>🌐</span>
          <span>网络与代理</span>
        </h3>
        <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 14 }}>
          如遇 GitHub 下载过慢或网络超时，可在此设置 HTTP/SOCKS 代理：
        </div>
        <div style={{ display: "flex", gap: 10, maxWidth: 500 }}>
          <input
            type="text"
            value={form.proxy || ""}
            onChange={(e) => onChangeForm({ ...form, proxy: e.target.value })}
            placeholder="如: http://127.0.0.1:7890"
            style={{
              flex: 1,
              padding: "7px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-primary)",
              fontSize: 12.5,
            }}
          />
          <button className="btn btn-primary" style={{ fontSize: 12.5 }} onClick={onSaveProxy}>
            保存代理设置
          </button>
        </div>
      </div>
    </>
  );
};
