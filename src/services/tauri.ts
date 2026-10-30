import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  AppConfig,
  ExecOutput,
  InstalledTool,
  MiseCandidate,
  MisePaths,
  PluginMarketItem,
  MarketCacheInfo,
  SystemEnvStatus,
} from "../types/index.ts";

export const TauriService = {
  // 配置相关
  async getConfig(): Promise<AppConfig> {
    return invoke<AppConfig>("get_app_config");
  },

  async saveConfig(config: AppConfig): Promise<void> {
    return invoke<void>("save_app_config", { config });
  },

  async getPaths(): Promise<MisePaths> {
    return invoke<MisePaths>("get_mise_paths");
  },

  async restoreDefaultPaths(): Promise<MisePaths> {
    return invoke<MisePaths>("restore_default_paths");
  },


  // Mise 执行相关
  async exec(args: string[]): Promise<ExecOutput> {
    return invoke<ExecOutput>("mise_exec", { args });
  },

  async abortExec(): Promise<void> {
    return invoke<void>("mise_abort_exec");
  },

  async listInstalled(): Promise<InstalledTool[]> {
    return invoke<InstalledTool[]>("mise_list_installed");
  },

  async useTool(tool: string, version: string, isGlobal = true): Promise<ExecOutput> {
    return invoke<ExecOutput>("mise_use_tool", {
      tool,
      version,
      isGlobal,
    });
  },

  async uninstallTool(tool: string, version: string): Promise<ExecOutput> {
    return invoke<ExecOutput>("mise_uninstall_tool", {
      tool,
      version,
    });
  },

  async installTool(tool: string, version?: string): Promise<ExecOutput> {
    return invoke<ExecOutput>("mise_install_tool", {
      tool,
      version: version || null,
    });
  },

  async listToolRemoteVersions(tool: string): Promise<string[]> {
    return invoke<string[]>("mise_list_tool_remote_versions", { tool });
  },

  async useToolInDirectory(tool: string, version: string, dir: string): Promise<ExecOutput> {
    return invoke<ExecOutput>("mise_use_tool_in_dir", { tool, version, dir });
  },

  async getMarketPlugins(): Promise<PluginMarketItem[]> {
    return invoke<PluginMarketItem[]>("mise_get_market_plugins");
  },

  async syncMarketRegistry(): Promise<PluginMarketItem[]> {
    return invoke<PluginMarketItem[]>("mise_sync_market_registry");
  },

  async getMarketCacheInfo(): Promise<MarketCacheInfo> {
    return invoke<MarketCacheInfo>("mise_get_market_cache_info");
  },

  async clearMarketCache(): Promise<ExecOutput> {
    return invoke<ExecOutput>("mise_clear_market_cache");
  },

  async cleanMiseCache(): Promise<ExecOutput> {
    return invoke<ExecOutput>("mise_clean_cache");
  },


  // 系统集成
  async openDirectory(path: string): Promise<void> {
    return invoke<void>("open_directory", { path });
  },

  async selectDirectory(title?: string): Promise<string | null> {
    return invoke<string | null>("select_directory", { title });
  },

  async selectFile(title?: string): Promise<string | null> {
    return invoke<string | null>("select_file", { title });
  },

  async scanLocalMise(): Promise<MiseCandidate[]> {
    return invoke<MiseCandidate[]>("scan_local_mise");
  },

  async switchMisePath(path: string): Promise<void> {
    return invoke<void>("switch_mise_path", { path });
  },

  async checkSystemEnv(): Promise<SystemEnvStatus> {
    return invoke<SystemEnvStatus>("check_system_env");
  },

  async addShimsToUserPath(): Promise<boolean> {
    return invoke<boolean>("add_shims_to_user_path");
  },

  async applyAllUserEnv(): Promise<boolean> {
    return invoke<boolean>("apply_all_user_env");
  },

  async removeAllUserEnv(): Promise<boolean> {
    return invoke<boolean>("remove_all_user_env");
  },

  async applyPwshProfile(): Promise<boolean> {
    return invoke<boolean>("apply_pwsh_profile");
  },

  async removePwshProfile(): Promise<boolean> {
    return invoke<boolean>("remove_pwsh_profile");
  },

  async downloadMiseEngine(): Promise<ExecOutput> {
    return invoke<ExecOutput>("download_mise_engine");
  },

  async upgradeMise(): Promise<ExecOutput> {
    return invoke<ExecOutput>("mise_upgrade");
  },

  async uninstallMise(deleteData: boolean): Promise<ExecOutput> {
    return invoke<ExecOutput>("mise_uninstall", { deleteData });
  },

  async openExternalUrl(url: string): Promise<void> {
    return invoke<void>("open_external_url", { url });
  },

  // 流式事件监听
  onStreamOutput(callback: (line: string) => void): Promise<UnlistenFn> {
    return listen<string>("mise:stream", (event) => {
      callback(event.payload);
    });
  },

  // 隐藏窗口到托盘
  async hideToTray(): Promise<void> {
    return invoke<void>("hide_to_tray");
  },

  // 彻底退出应用
  async exitApp(): Promise<void> {
    return invoke<void>("exit_app");
  },

  // 监听窗口关闭按钮请求 (原生窗口监听 + 全局广播 + 原生事件兜底三重保障)
  async onCloseRequested(callback: () => void): Promise<UnlistenFn> {
    const unlisteners: (() => void)[] = [];
    let lastTriggerTime = 0;
    const safeCallback = () => {
      const now = Date.now();
      if (now - lastTriggerTime < 350) return;
      lastTriggerTime = now;
      callback();
    };

    // 1. 全局应用级事件监听
    try {
      const u1 = await listen("window-close-requested", () => {
        safeCallback();
      });
      unlisteners.push(u1);
    } catch (e) {
      console.warn("注册全局关闭事件异常:", e);
    }

    // 2. 窗口级事件监听 (接收 window.emit)
    try {
      const win = getCurrentWindow();
      const u2 = await win.listen("window-close-requested", () => {
        safeCallback();
      });
      unlisteners.push(u2);
    } catch (e) {
      console.warn("注册窗口级关闭监听异常:", e);
    }

    // 3. 原生窗体关闭拦截兜底
    try {
      const win = getCurrentWindow();
      const u3 = await win.onCloseRequested(async (event) => {
        event.preventDefault();
        safeCallback();
      });
      unlisteners.push(u3);
    } catch (e) {
      console.warn("注册原生窗口关闭拦截异常:", e);
    }

    return () => {
      unlisteners.forEach((fn) => fn());
    };
  },

  // 获取关闭窗口行为配置
  getCloseAction(): "ask" | "tray" | "quit" {
    const val = localStorage.getItem("misemanager_close_action");
    if (val === "tray" || val === "quit") return val;
    return "ask";
  },

  // 保存关闭窗口行为配置 (localStorage 与 config.json 双向持久化)
  setCloseAction(action: "ask" | "tray" | "quit"): void {
    localStorage.setItem("misemanager_close_action", action);
    this.getConfig().then((cfg) => {
      this.saveConfig({ ...cfg, close_action: action });
    }).catch((e) => console.warn("同步 close_action 到 config.json 失败:", e));
  },
};

