import React, { useState, useEffect } from "react";
import { AppConfig, MarketCacheInfo, MisePaths, SystemEnvStatus } from "../types/index.ts";
import { TauriService } from "../services/tauri.ts";
import { SettingsPathCard } from "../components/settings/SettingsPathCard.tsx";
import { SettingsEnvCard } from "../components/settings/SettingsEnvCard.tsx";
import { SettingsTerminalCard } from "../components/settings/SettingsTerminalCard.tsx";
import { SettingsRuntimeCard } from "../components/settings/SettingsRuntimeCard.tsx";
import { SettingsWindowCard } from "../components/settings/SettingsWindowCard.tsx";
import { SettingsThemeProxyCard } from "../components/settings/SettingsThemeProxyCard.tsx";
import { SettingsAboutCard } from "../components/settings/SettingsAboutCard.tsx";

interface SettingsProps {
  config: AppConfig | null;
  paths: MisePaths | null;
  envStatus: SystemEnvStatus | null;
  theme: string;
  onSaveConfig: (cfg: AppConfig) => void;
  onRefreshAll: () => void;
  onOpenDirectory: (path: string) => void;
  onOpenExternal: (url: string) => void;
  onSetTheme: (theme: string) => void;
  onRunMiseCommand: (title: string, cmd: () => Promise<any>) => void;
  showToast?: (content: string, type?: "success" | "info" | "warning" | "error") => void;
}

export const Settings: React.FC<SettingsProps> = ({
  config,
  paths,
  envStatus,
  theme,
  onSaveConfig,
  onRefreshAll,
  onOpenDirectory,
  onOpenExternal,
  onSetTheme,
  onRunMiseCommand,
  showToast,
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
      not_found_auto_install: true,
      auto_install: true,
      proxy: "",
    }
  );

  const [closeAction, setCloseAction] = useState<"ask" | "tray" | "quit">(
    TauriService.getCloseAction()
  );

  const [marketCacheInfo, setMarketCacheInfo] = useState<MarketCacheInfo | null>(null);

  const fetchCacheInfo = async () => {
    try {
      const info = await TauriService.getMarketCacheInfo();
      setMarketCacheInfo(info);
    } catch (e) {
      console.warn("读取市场缓存信息失败:", e);
    }
  };

  useEffect(() => {
    fetchCacheInfo();
  }, []);

  const handleSavePaths = () => {
    onSaveConfig(form);
    showToast?.("路径与配置已保存", "success");
  };

  const handleResetDefaults = async () => {
    try {
      const newPaths = await TauriService.restoreDefaultPaths();
      const updated: AppConfig = {
        ...form,
        custom_root_dir: newPaths.root_dir,
        custom_mise_path: newPaths.exe_path,
        mise_root_dir: newPaths.root_dir,
        mise_data_dir: newPaths.data_dir,
        mise_bin_dir: newPaths.shims_dir,
      };
      setForm(updated);
      await onSaveConfig(updated);
      onRefreshAll();
      showToast?.(`已恢复并自动创建当前应用默认目录: ${newPaths.root_dir}`, "success");
    } catch (e: any) {
      showToast?.(`恢复默认目录失败: ${e?.message || String(e)}`, "error");
    }
  };


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 顶部标题区 */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px 0", color: "var(--text-primary)" }}>
          设置
        </h2>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          应用配置、mise 安装路径与环境变量管理
        </div>
      </div>

      {/* 1. 统一主目录与路径配置卡片 */}
      <SettingsPathCard
        form={form}
        paths={paths}
        onChangeForm={setForm}
        onSavePaths={handleSavePaths}
        onRefreshTools={() => {
          onRefreshAll();
          showToast?.("已刷新已下载应用列表", "success");
        }}
        onResetDefaults={handleResetDefaults}
        onOpenDirectory={onOpenDirectory}
        onUninstallMise={() =>
          onRunMiseCommand("卸载本地 mise 核心程序与数据", () =>
            TauriService.exec(["implode", "-y"])
          )
        }
      />

      {/* 2. Windows 用户环境变量查看与配置表格 */}
      <SettingsEnvCard
        paths={paths}
        envStatus={envStatus}
        onRefreshEnv={() => {
          onRefreshAll();
          showToast?.("环境变量与系统 PATH 检测已刷新", "success");
        }}
        onApplyAllEnv={() =>
          onRunMiseCommand("写入并同步 Windows 用户环境变量", async () => {
            const res = await TauriService.applyAllUserEnv();
            showToast?.("Windows 环境变量已成功写入并刷新系统", "success");
            return res;
          })
        }
        onRemoveAllEnv={() =>
          onRunMiseCommand("清除 Windows 用户环境变量中的 mise 配置", async () => {
            const res = await TauriService.removeAllUserEnv();
            showToast?.("Windows 用户环境变量中的 mise 相关配置已清除", "info");
            return res;
          })
        }
      />

      {/* 3. 终端与 Shims 激活管理 */}
      <SettingsTerminalCard
        envStatus={envStatus}
        onRefreshActivation={() => {
          onRefreshAll();
          showToast?.("PowerShell 激活状态已重新检测", "success");
        }}
        onSyncShims={() =>
          onRunMiseCommand("同步 Shims 垫片到系统 PATH", async () => {
            const res = await TauriService.addShimsToUserPath();
            showToast?.("Shims 垫片已成功加入用户 PATH", "success");
            return res;
          })
        }
        onApplyPwsh={() =>
          onRunMiseCommand("向 PowerShell Profile 写入动态 Hook 脚本", async () => {
            const res = await TauriService.applyPwshProfile();
            showToast?.("PowerShell Profile 激活脚本已成功写入", "success");
            return res;
          })
        }
        onRemovePwsh={() =>
          onRunMiseCommand("从 PowerShell Profile 中移除 Hook 激活脚本", async () => {
            const res = await TauriService.removePwshProfile();
            showToast?.("PowerShell Profile 激活脚本已移除", "info");
            return res;
          })
        }
      />

      {/* 4. 运行时行为与自动安装配置 + 缓存管理双卡片 */}
      <SettingsRuntimeCard
        form={form}
        marketCacheInfo={marketCacheInfo}
        onChangeForm={(newForm) => {
          setForm(newForm);
          onSaveConfig(newForm);
        }}
        onRefreshConfig={() => {
          onRefreshAll();
          showToast?.("运行时设定已重新加载", "success");
        }}
        onInstallMissingTools={() =>
          onRunMiseCommand("扫描并安装所有声明工具 (mise install)", async () => {
            const res = await TauriService.exec(["install"]);
            showToast?.("已完成缺失依赖扫描与安装", "success");
            return res;
          })
        }
        onRefreshMarketCache={() =>
          onRunMiseCommand("全量拉取并同步官方工具市场注册表", async () => {
            const list = await TauriService.syncMarketRegistry();
            await fetchCacheInfo();
            showToast?.(`市场工具已全量更新 (共 ${list.length} 款)`, "success");
            return { success: true, output: `已成功同步全量 ${list.length} 个工具` };
          })
        }
        onClearMarketCache={() =>
          onRunMiseCommand("清除本地工具市场缓存", async () => {
            const res = await TauriService.clearMarketCache();
            await fetchCacheInfo();
            showToast?.("本地工具市场缓存已清除", "success");
            return res;
          })
        }
        onCleanMiseCache={() =>
          onRunMiseCommand("清理 mise 下载缓存 (mise cache clear)", async () => {
            const res = await TauriService.cleanMiseCache();
            showToast?.("mise 临时下载缓存已清空，释放磁盘空间", "success");
            return res;
          })
        }
      />

      {/* 5. 窗口控制与系统托盘行为独立卡片 */}
      <SettingsWindowCard
        closeAction={closeAction}
        onChangeCloseAction={(action) => {
          setCloseAction(action);
          TauriService.setCloseAction(action);
          const labels = {
            ask: "每次关闭时弹出确认提示",
            tray: "关闭时自动缩小至系统托盘",
            quit: "关闭时直接彻底退出程序",
          };
          showToast?.(`已将关闭窗口策略设为: ${labels[action]}`, "info");
        }}
      />

      {/* 6. 外观主题与现代调色盘 + 网络与代理 */}
      <SettingsThemeProxyCard
        form={form}
        theme={theme}
        onChangeForm={setForm}
        onSetTheme={(t) => {
          onSetTheme(t);
          showToast?.(`已切换主题为: ${t === "dark" ? "深色模式" : "浅色模式"}`, "info");
        }}
        onSaveProxy={() => {
          onSaveConfig(form);
          showToast?.("代理与镜像源配置已保存", "success");
        }}
      />

      {/* 7. 关于应用与开源致敬 */}
      <SettingsAboutCard
        paths={paths}
        onOpenExternal={onOpenExternal}
        onCheckUpdate={() =>
          onRunMiseCommand("检查 mise-manager 最新发行版", () =>
            TauriService.openExternalUrl("https://github.com/kikock/mise-manager/releases")
          )
        }
      />
    </div>
  );
};
