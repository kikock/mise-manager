import React, { useState } from "react";
import { AppConfig, MarketCacheInfo } from "../../types/index.ts";

interface SettingsRuntimeCardProps {
  form: AppConfig;
  marketCacheInfo?: MarketCacheInfo | null;
  onChangeForm: (newForm: AppConfig) => void;
  onRefreshConfig?: () => void;
  onInstallMissingTools: () => Promise<void> | void;
  onRefreshMarketCache: () => Promise<void> | void;
  onClearMarketCache: () => Promise<void> | void;
  onCleanMiseCache: () => Promise<void> | void;
}

export const SettingsRuntimeCard: React.FC<SettingsRuntimeCardProps> = ({
  form,
  marketCacheInfo,
  onChangeForm,
  onRefreshConfig,
  onInstallMissingTools,
  onRefreshMarketCache,
  onClearMarketCache,
  onCleanMiseCache,
}) => {
  const [isUpdatingMarket, setIsUpdatingMarket] = useState(false);
  const [isClearingMarket, setIsClearingMarket] = useState(false);
  const [isClearingDownload, setIsClearingDownload] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleRefreshMarket = async () => {
    setIsUpdatingMarket(true);
    try {
      await onRefreshMarketCache();
    } finally {
      setIsUpdatingMarket(false);
    }
  };

  const handleClearMarket = async () => {
    setIsClearingMarket(true);
    try {
      await onClearMarketCache();
    } finally {
      setIsClearingMarket(false);
    }
  };

  const handleCleanDownload = async () => {
    setIsClearingDownload(true);
    try {
      await onCleanMiseCache();
    } finally {
      setIsClearingDownload(false);
    }
  };

  const handleInstallMissing = async () => {
    setIsInstalling(true);
    try {
      await onInstallMissingTools();
    } finally {
      setIsInstalling(false);
    }
  };

  const isReady = marketCacheInfo?.exists ?? false;
  const count = marketCacheInfo?.count ?? 0;
  const syncTime = marketCacheInfo?.updated_at || "未同步";

  return (
    <>
      {/* 运行时行为与自动安装配置 */}
      <div className="fluent-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span>🛠️</span>
            <span>运行时行为与自动安装配置</span>
          </h3>
          {onRefreshConfig && (
            <span
              style={{ fontSize: 12, color: "var(--accent-color)", cursor: "pointer", userSelect: "none" }}
              onClick={onRefreshConfig}
              title="重新读取本地配置文件"
            >
              🔄 刷新设定
            </span>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          控制终端在敲击工具命令时，若发现未下载或版本缺失，是否先自动拉取安装
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
          {/* 复选框 1 */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.not_found_auto_install ?? true}
              onChange={(e) => onChangeForm({ ...form, not_found_auto_install: e.target.checked })}
              style={{ marginTop: 3 }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                执行未安装工具时自动下载安装 (<code>not_found_auto_install</code>)
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.5 }}>
                在 CMD 或 PowerShell 终端中执行 java, node 等命令时，如果本地尚不存在该版本，mise 将拦截并在终端先自动静默/进度条下载安装，安装完毕后直接继续执行该命令。
              </div>
            </div>
          </label>

          {/* 复选框 2 */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.auto_install ?? true}
              onChange={(e) => onChangeForm({ ...form, auto_install: e.target.checked })}
              style={{ marginTop: 3 }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                环境变更时自动补齐缺失依赖 (<code>auto_install</code>)
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.5 }}>
                进入包含 <code>.mise.toml</code> 的项目目录或执行任务时，若发现配置的工具缺失，自动拉取补齐。
              </div>
            </div>
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: 12.5 }}
            onClick={handleInstallMissing}
            disabled={isInstalling}
          >
            {isInstalling ? "⏳ 正在扫描并补齐中..." : "⚡ 一键扫描并补齐所有已声明工具 (mise install)"}
          </button>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            💡 更改开关后立即自动同步到 ~/.config/mise/config.toml
          </div>
        </div>
      </div>

      {/* 缓存与临时文件管理双卡片 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
        {/* 市场工具缓存 */}
        <div className="fluent-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: 14.5, fontWeight: 600, margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: 6 }}>
              <span>📦</span>
              <span>市场工具缓存</span>
            </h3>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 14 }}>
              缓存状态：
              {isReady ? (
                <span style={{ color: "var(--success-color)", fontWeight: 600 }}>已就绪</span>
              ) : (
                <span style={{ color: "var(--warning-color, #eab308)", fontWeight: 600 }}>未缓存 / 未同步</span>
              )}
              <br />
              工具总数：<b style={{ color: "var(--accent-color)" }}>{count}</b> 款<br />
              同步时间：{syncTime}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12.5 }}
              onClick={handleRefreshMarket}
              disabled={isUpdatingMarket || isClearingMarket}
            >
              {isUpdatingMarket ? "⏳ 正在全量更新..." : "🔄 强制全量更新"}
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12.5 }}
              onClick={handleClearMarket}
              disabled={isUpdatingMarket || isClearingMarket}
            >
              {isClearingMarket ? "⏳ 正在清除..." : "🗑️ 清除本地缓存"}
            </button>
          </div>
        </div>

        {/* 清理 mise 下载缓存 */}
        <div className="fluent-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: 14.5, fontWeight: 600, margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: 6 }}>
              <span>🧹</span>
              <span>清理 mise 下载缓存</span>
            </h3>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
              执行 <code>mise cache clear</code> 清理临时下载的压缩包，释放磁盘空间。
            </div>
          </div>
          <div>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12.5 }}
              onClick={handleCleanDownload}
              disabled={isClearingDownload}
            >
              {isClearingDownload ? "⏳ 正在清理缓存..." : "🗑️ 清理下载缓存"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
