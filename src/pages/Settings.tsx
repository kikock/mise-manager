import React, { useState } from "react";
import { AppConfig, MisePaths, SystemEnvStatus } from "../types/index.ts";
import { TauriService } from "../services/tauri.ts";

interface SettingsProps {
  config: AppConfig | null;
  paths: MisePaths | null;
  envStatus: SystemEnvStatus | null;
  onSaveConfig: (cfg: AppConfig) => void;
  onFixEnvPath: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  config,
  paths,
  envStatus,
  onSaveConfig,
  onFixEnvPath,
}) => {
  const [form, setForm] = useState<AppConfig>(
    config || {
      portable_mode: true,
      custom_mise_path: "",
      custom_root_dir: "",
      mirror_url: "",
      theme: "dark",
      close_to_tray: true,
      auto_start: false,
    }
  );

  const [closeAction, setCloseAction] = useState<"ask" | "tray" | "quit">(
    TauriService.getCloseAction()
  );
  const [savedTips, setSavedTips] = useState(false);

  const handleSave = () => {
    onSaveConfig(form);
    setSavedTips(true);
    setTimeout(() => setSavedTips(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 环境变量一键修复 */}
      <div className="fluent-card">
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
          Windows 用户环境变量配置
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 14 }}>
          当前 Shims 路径: <code>{envStatus?.shims_dir || paths?.shims_dir}</code>
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              color: envStatus?.path_has_shims ? "var(--success-color)" : "var(--warning-color)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {envStatus?.path_has_shims ? "● 已注入系统用户 PATH 环境变量" : "○ 未注入 PATH 环境变量"}
          </span>
          <button className="btn btn-primary" onClick={onFixEnvPath}>
            {envStatus?.path_has_shims ? "重新校验并刷新环境变量" : "一键添加至用户 PATH 并生效"}
          </button>
        </div>
      </div>

      {/* 运行参数与路径定制 */}
      <div className="fluent-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>运行参数与路径定制</h3>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            自定义 mise.exe 可执行文件绝对路径 (留空则智能探测)：
          </label>
          <input
            type="text"
            value={form.custom_mise_path || ""}
            onChange={(e) => setForm({ ...form, custom_mise_path: e.target.value })}
            placeholder="例如: D:\tools\mise\bin\mise.exe"
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            国内镜像源加速 (针对 Node / Python 运行时下载)：
          </label>
          <input
            type="text"
            value={form.mirror_url || ""}
            onChange={(e) => setForm({ ...form, mirror_url: e.target.value })}
            placeholder="例如: https://npmmirror.com/mirrors"
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
        </div>

        {/* 窗口与托盘行为 */}
        <div style={{ marginTop: 8, padding: "14px", backgroundColor: "var(--bg-card)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 6 }}>
            🗔 窗口控制与系统托盘行为
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
            点击主窗口右上角关闭按钮（X）时的默认行为：
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, marginBottom: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                name="closeAction"
                value="ask"
                checked={closeAction === "ask"}
                onChange={() => {
                  setCloseAction("ask");
                  TauriService.setCloseAction("ask");
                }}
              />
              <span>每次询问（弹窗提示）</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                name="closeAction"
                value="tray"
                checked={closeAction === "tray"}
                onChange={() => {
                  setCloseAction("tray");
                  TauriService.setCloseAction("tray");
                }}
              />
              <span>最小化到托盘（不在任务栏显示）</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                name="closeAction"
                value="quit"
                checked={closeAction === "quit"}
                onChange={() => {
                  setCloseAction("quit");
                  TauriService.setCloseAction("quit");
                }}
              />
              <span>直接退出程序</span>
            </label>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            * 点击窗口最小化按钮（_）时，窗口将直接缩小至系统托盘，不再占用任务栏空间。
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={form.portable_mode}
              onChange={(e) => setForm({ ...form, portable_mode: e.target.checked })}
            />
            便携绿色隔离模式 (数据随软件目录移动)
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={handleSave}>
            💾 保存配置
          </button>
          {savedTips && (
            <span style={{ color: "var(--success-color)", fontSize: 13 }}>
              ✓ 配置已成功持久化保存！
            </span>
          )}
        </div>
      </div>

      {/* 关于信息卡片 */}
      <div className="fluent-card">
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>关于 mise-manager</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.8 }}>
          架构版本: 2.0.0 (Tauri 2.x + Rust 原生底层 + Fluent Design)<br />
          运行环境: Windows 11 / 10 x64<br />
          开源协议: MIT License<br />
          支持双轨打包：轻量便携版 + 内嵌 WebView2 离线安装完整版。
        </p>
      </div>
    </div>
  );
};
