import React, { useEffect, useState } from "react";
import { Navigation, NavTab } from "./components/Navigation.tsx";
import { Header } from "./components/Header.tsx";
import { TerminalDrawer } from "./components/TerminalDrawer.tsx";
import { Home } from "./pages/Home.tsx";
import { Installed } from "./pages/Installed.tsx";
import { Market } from "./pages/Market.tsx";
import { Settings } from "./pages/Settings.tsx";
import { CloseActionModal } from "./components/CloseActionModal.tsx";
import { TauriService } from "./services/tauri.ts";
import {
  AppConfig,
  InstalledTool,
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
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

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
        setTerminalLogs((prev) => [...prev, `❌ [执行失败] 退出码: ${res.code}`]);
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

  return (
    <div className="app-container">
      <Navigation
        currentTab={currentTab}
        installedCount={installedTools.length}
        onTabChange={setCurrentTab}
      />

      <div className="main-wrapper">
        <Header
          currentTab={currentTab}
          theme={theme}
          isTerminalOpen={isTerminalOpen}
          onToggleTheme={toggleTheme}
          onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
          onHideToTray={() => TauriService.hideToTray()}
          onRefresh={refreshAllData}
        />

        <main className="content-body">
          {currentTab === "home" && (
            <Home
              paths={paths}
              envStatus={envStatus}
              tools={installedTools}
              onOpenDirectory={(p) => TauriService.openDirectory(p)}
              onFixEnvPath={() =>
                executeMiseTask("注入 Windows 用户环境变量 PATH", () =>
                  TauriService.addShimsToUserPath()
                )
              }
            />
          )}

          {currentTab === "installed" && (
            <Installed
              tools={installedTools}
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
              onOpenDirectory={(p) => TauriService.openDirectory(p)}
            />
          )}

          {currentTab === "market" && (
            <Market
              plugins={marketPlugins}
              onInstall={(tool, ver) =>
                executeMiseTask(`流式安装运行时 ${tool}${ver ? `@${ver}` : ""}`, () =>
                  TauriService.installTool(tool, ver)
                )
              }
            />
          )}

          {currentTab === "settings" && (
            <Settings
              config={config}
              paths={paths}
              envStatus={envStatus}
              onSaveConfig={async (cfg) => {
                await TauriService.saveConfig(cfg);
                setConfig(cfg);
                refreshAllData();
              }}
              onFixEnvPath={() =>
                executeMiseTask("注入 Windows 用户环境变量 PATH", () =>
                  TauriService.addShimsToUserPath()
                )
              }
            />
          )}
        </main>
      </div>

      <TerminalDrawer
        isOpen={isTerminalOpen}
        logs={terminalLogs}
        isRunning={isRunning}
        onClose={() => setIsTerminalOpen(false)}
        onClear={() => setTerminalLogs([])}
        onAbort={() => TauriService.abortExec()}
      />

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
    </div>
  );
};
