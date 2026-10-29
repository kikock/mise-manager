export interface AppConfig {
  portable_mode: boolean;
  custom_mise_path?: string | null;
  custom_root_dir?: string | null;
  mirror_url?: string | null;
  theme: string;
  close_to_tray: boolean;
  auto_start: boolean;
}

export interface MisePaths {
  app_dir: string;
  root_dir: string;
  data_dir: string;
  shims_dir: string;
  exe_path: string;
  is_found: boolean;
  version?: string | null;
}

export interface InstalledTool {
  name: string;
  version: string;
  is_active: boolean;
  is_global: boolean;
  path?: string | null;
}

export interface PluginMarketItem {
  name: string;
  category: string;
  description: string;
  repository: string;
  is_installed: boolean;
  installed_version?: string | null;
  popular: boolean;
}

export interface SystemEnvStatus {
  path_has_shims: boolean;
  shims_dir: string;
  mise_data_dir: string;
}

export interface ExecOutput {
  success: boolean;
  output: string;
  code?: number | null;
}
