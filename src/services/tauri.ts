import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  AppConfig,
  ExecOutput,
  InstalledTool,
  MisePaths,
  PluginMarketItem,
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

  async getMarketPlugins(): Promise<PluginMarketItem[]> {
    return invoke<PluginMarketItem[]>("mise_get_market_plugins");
  },

  // 系统集成
  async openDirectory(path: string): Promise<void> {
    return invoke<void>("open_directory", { path });
  },

  async checkSystemEnv(): Promise<SystemEnvStatus> {
    return invoke<SystemEnvStatus>("check_system_env");
  },

  async addShimsToUserPath(): Promise<boolean> {
    return invoke<boolean>("add_shims_to_user_path");
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

  // 监听窗口关闭按钮请求
  onCloseRequested(callback: () => void): Promise<UnlistenFn> {
    return listen("window-close-requested", () => {
      callback();
    });
  },

  // 获取关闭窗口行为配置
  getCloseAction(): "ask" | "tray" | "quit" {
    const val = localStorage.getItem("misemanager_close_action");
    if (val === "tray" || val === "quit") return val;
    return "ask";
  },

  // 保存关闭窗口行为配置
  setCloseAction(action: "ask" | "tray" | "quit"): void {
    localStorage.setItem("misemanager_close_action", action);
  },
};
