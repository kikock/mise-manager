import React, { useEffect, useState, useCallback } from "react";
import { Navigation, NavTab } from "./components/Navigation.tsx";
import { Header } from "./components/Header.tsx";
import { TerminalDrawer } from "./components/TerminalDrawer.tsx";
import { Home } from "./pages/Home.tsx";
import { Installed } from "./pages/Installed.tsx";
import { Market } from "./pages/Market.tsx";
import { Settings } from "./pages/Settings.tsx";
import { CloseActionModal } from "./components/CloseActionModal.tsx";
import { UninstallModal } from "./components/UninstallModal.tsx";
import { SelectMiseModal } from "./components/settings/SelectMiseModal.tsx";
import { ToastContainer, ToastMessage, ToastType } from "./components/Toast.tsx";
import { TauriService } from "./services/tauri.ts";
import {
  AppConfig,
  InstalledTool,
  MiseCandidate,
  MisePaths,
  PluginMarketItem,
  SystemEnvStatus,
} from "./types/index.ts";

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>("home");
  const [theme, setTheme] = useState<string>("dark");
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isUninstallModalOpen, setIsUninstallModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanCandidates, setScanCandidates] = useState<MiseCandidate[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((content: string, type: ToastType = "info") => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, type, content }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [paths, setPaths] = useState<MisePaths | null>(null);
  const [envStatus, setEnvStatus] = useState<SystemEnvStatus | null>(null);
  const [installedTools, setInstalledTools] = useState<InstalledTool[]>([]);
  const [marketPlugins, setMarketPlugins] = useState<PluginMarketItem[]>([]);

  // 刷新所有核心数据
  const refreshAllData = async () => {
    try {
      const [cfg, p, env, tools, plugins] = await Promise.all([
        TauriService.getConfig(),
        TauriService.getPaths(),
        TauriService.checkSystemEnv(),
        TauriService.listInstalled(),
        TauriService.getMarketPlugins(),
      ]);
      setConfig(cfg);
      setTheme(cfg.theme || "dark");
      document.documentElement.setAttribute("data-theme", cfg.theme || "dark");

      // 同步关闭策略配置
      if (!localStorage.getItem("misemanager_close_action") && cfg.close_action) {
        localStorage.setItem("misemanager_close_action", cfg.close_action);
      }

      // 恢复持久化自定义强调色
      const customAccentEnabled = localStorage.getItem("misemanager_custom_accent_enabled") === "true";
      const customAccentColor = localStorage.getItem("misemanager_accent_color");
      if (customAccentEnabled && customAccentColor) {
        document.documentElement.style.setProperty("--accent-color", customAccentColor);
        document.documentElement.style.setProperty("--accent-hover", customAccentColor);
        document.documentElement.style.setProperty("--accent-active", customAccentColor);
      }

      setPaths(p);
      setEnvStatus(env);
      setInstalledTools(tools);
      setMarketPlugins(plugins);
    } catch (e) {
      console.error("加载数据失败:", e);
    }
  };

  useEffect(() => {
    refreshAllData();

    // 注册流式日志监听
    let unlistenStream: (() => void) | null = null;
    TauriService.onStreamOutput((line) => {
      setTerminalLogs((prev) => [...prev, line]);
    }).then((fn) => {
      unlistenStream = fn;
    });

    // 注册窗口关闭按钮拦截监听
    let unlistenClose: (() => void) | null = null;
    TauriService.onCloseRequested(() => {
      const action = TauriService.getCloseAction();
      if (action === "tray") {
        TauriService.hideToTray();
      } else if (action === "quit") {
        TauriService.exitApp();
      } else {
        setIsCloseModalOpen(true);
      }
    }).then((fn) => {
      unlistenClose = fn;
    });

    return () => {
      if (unlistenStream) unlistenStream();
      if (unlistenClose) unlistenClose();
    };
  }, []);

  const toggleTheme = async () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    if (config) {
      const updated = { ...config, theme: nextTheme };
      setConfig(updated);
      await TauriService.saveConfig(updated);
    }
  };

  const executeMiseTask = async (taskName: string, action: () => Promise<any>) => {
    setIsRunning(true);
    setIsTerminalOpen(true);
    setTerminalLogs((prev) => [...prev, `\n🚀 [开始执行] ${taskName}...`]);
    try {
      const res = await action();
      if (res && res.success === false) {
        setTerminalLogs((prev) => [
          ...prev,
          `❌ [执行失败] 退出码: ${res.code ?? 1}`,
          ...(res.output ? [res.output] : []),
        ]);
      } else {
        setTerminalLogs((prev) => [...prev, `✅ [执行成功] 操作已顺利完成。`]);
      }
    } catch (err: any) {
      setTerminalLogs((prev) => [...prev, `💥 [异常中断] ${err?.message || err}`]);
    } finally {
      setIsRunning(false);
      refreshAllData();
    }
  };

  const handleOpenScanMise = async () => {
    setIsScanModalOpen(true);
    setIsScanning(true);
    try {
      const list = await TauriService.scanLocalMise();
      setScanCandidates(list);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectMise = async (selectedPath: string) => {
    setIsScanModalOpen(false);
    await executeMiseTask(`切换并同步 mise 核心环境至 ${selectedPath}`, async () => {
      await TauriService.switchMisePath(selectedPath);
      return { success: true, output: `已成功同步至 ${selectedPath}`, code: 0 };
    });
  };

  return (
    <div className="app-container">
      <Navigation
        currentTab={currentTab}
        installedCount={installedTools.length}
        theme={theme}
        onTabChange={setCurrentTab}
        onToggleTheme={toggleTheme}
        onOpenExternal={(url) => TauriService.openExternalUrl(url)}
      />

      <div className="main-wrapper">
        <Header
          currentTab={currentTab}
          isTerminalOpen={isTerminalOpen}
          onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
        />

        <main className="content-body">
          {currentTab === "home" && (
            <Home
              paths={paths}
              envStatus={envStatus}
              tools={installedTools}
              onOpenDirectory={(p) => TauriService.openDirectory(p)}
              onRefresh={refreshAllData}
              onUpgradeMise={() =>
                executeMiseTask("升级 mise 核心程序至最新稳定版", () =>
                  TauriService.upgradeMise()
                )
              }
              onUninstallMise={() => setIsUninstallModalOpen(true)}
              onDownloadMise={() =>
                executeMiseTask("下载并部署便携式 Mise 核心引擎", () =>
                  TauriService.downloadMiseEngine()
                )
              }
              onScanLocalMise={handleOpenScanMise}
              onNavigateSettings={() => setCurrentTab("settings")}
              onNavigateInstalled={() => setCurrentTab("installed")}
              onNavigateMarket={() => setCurrentTab("market")}
              showToast={showToast}
            />
          )}

          {currentTab === "installed" && (
            <Installed
              tools={installedTools}
              paths={paths}
              marketPlugins={marketPlugins}
              onRefreshTools={refreshAllData}
              onScanDownloadedTools={() =>
                executeMiseTask("重新扫描本地已下载工具与版本", async () => {
                  setTerminalLogs((prev) => [
                    ...prev,
                    `[INFO] 开始扫描本地物理存储目录: ${paths?.data_dir || "默认自包含 data 目录"}`,
                    `[EXEC] 执行底层命令: mise ls --json`,
                  ]);
                  const list = await TauriService.listInstalled();
                  setInstalledTools(list);
                  const map = new Map<string, string[]>();
                  list.forEach((t) => {
                    const arr = map.get(t.name) || [];
                    arr.push(t.version + (t.is_active ? " (当前激活)" : ""));
                    map.set(t.name, arr);
                  });
                  map.forEach((versions, name) => {
                    setTerminalLogs((prev) => [
                      ...prev,
                      `[SCAN] 扫描发现工具: ${name} -> [${versions.join(", ")}]`,
                    ]);
                  });
                  return {
                    success: true,
                    output: `本地已下载工具扫描完成！共检测到 ${list.length} 个版本实例。`,
                  };
                })
              }
              onUseTool={(tool, ver, isGlobal) =>
                executeMiseTask(`切换全局激活版本 ${tool}@${ver}`, () =>
                  TauriService.useTool(tool, ver, isGlobal)
                )
              }
              onUninstallTool={(tool, ver) =>
                executeMiseTask(`卸载运行时 ${tool}@${ver}`, () =>
                  TauriService.uninstallTool(tool, ver)
                )
              }
              onInstallTool={(tool, ver) =>
                executeMiseTask(`流式安装运行时 ${tool}${ver ? `@${ver}` : ""}`, () =>
                  TauriService.installTool(tool, ver)
                )
              }
              onOpenDirectory={(p) => TauriService.openDirectory(p)}
              showToast={showToast}
            />
          )}

          {currentTab === "market" && (
            <Market
              plugins={marketPlugins}
              installedTools={installedTools}
              onRefreshMarket={() =>
                executeMiseTask("强制拉取与同步官方工具市场注册表", async () => {
                  const list = await TauriService.syncMarketRegistry();
                  setMarketPlugins(list);
                  return { success: true, output: `已成功同步全量 ${list.length} 个工具` };
                })
              }
              onInstall={(tool, ver) =>
                executeMiseTask(`流式安装运行时 ${tool}${ver ? `@${ver}` : ""}`, () =>
                  TauriService.installTool(tool, ver)
                )
              }
              onUninstall={(tool, ver) =>
                executeMiseTask(`卸载运行时 ${tool}@${ver}`, () =>
                  TauriService.uninstallTool(tool, ver)
                )
              }
              onUseTool={(tool, ver, isGlobal) =>
                executeMiseTask(`切换全局激活版本 ${tool}@${ver}`, () =>
                  TauriService.useTool(tool, ver, isGlobal)
                )
              }
              showToast={showToast}
            />
          )}

          {currentTab === "settings" && (
            <Settings
              config={config}
              paths={paths}
              envStatus={envStatus}
              theme={theme}
              onSaveConfig={async (cfg) => {
                await TauriService.saveConfig(cfg);
                setConfig(cfg);
                refreshAllData();
              }}
              onRefreshAll={refreshAllData}
              onOpenDirectory={(p) => TauriService.openDirectory(p)}
              onOpenExternal={(url) => TauriService.openExternalUrl(url)}
              onSetTheme={(t) => {
                setTheme(t);
                document.documentElement.setAttribute("data-theme", t);
                if (config) {
                  const updated = { ...config, theme: t };
                  setConfig(updated);
                  TauriService.saveConfig(updated);
                }
              }}
              onRunMiseCommand={(title, cmd) => executeMiseTask(title, cmd)}
              showToast={showToast}
            />
          )}
        </main>

        <TerminalDrawer
          isOpen={isTerminalOpen}
          logs={terminalLogs}
          isRunning={isRunning}
          onClose={() => setIsTerminalOpen(false)}
          onClear={() => setTerminalLogs([])}
          onAbort={() => TauriService.abortExec()}
        />
      </div>

      <CloseActionModal
        isOpen={isCloseModalOpen}
        onCancel={() => setIsCloseModalOpen(false)}
        onHideToTray={(remember) => {
          setIsCloseModalOpen(false);
          if (remember) TauriService.setCloseAction("tray");
          TauriService.hideToTray();
        }}
        onExitApp={(remember) => {
          setIsCloseModalOpen(false);
          if (remember) TauriService.setCloseAction("quit");
          TauriService.exitApp();
        }}
      />

      <UninstallModal
        isOpen={isUninstallModalOpen}
        onCancel={() => setIsUninstallModalOpen(false)}
        onConfirm={(deleteData) => {
          setIsUninstallModalOpen(false);
          executeMiseTask(
            deleteData
              ? "彻底卸载本地 mise 核心程序与 data 数据"
              : "安全卸载本地 mise 核心程序 (保留已下载数据)",
            () => TauriService.uninstallMise(deleteData)
          );
        }}
      />

      <SelectMiseModal
        isOpen={isScanModalOpen}
        candidates={scanCandidates}
        isLoading={isScanning}
        onClose={() => setIsScanModalOpen(false)}
        onSelect={handleSelectMise}
        onRefreshScan={handleOpenScanMise}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
};
