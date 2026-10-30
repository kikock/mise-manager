export interface AppConfig {
  portable_mode: boolean;
  custom_mise_path?: string | null;
  custom_root_dir?: string | null;
  mise_root_dir?: string | null;
  mise_data_dir?: string | null;
  mise_bin_dir?: string | null;
  proxy?: string | null;
  mirror_url?: string | null;
  theme: string;
  close_to_tray: boolean;
  auto_start: boolean;
  not_found_auto_install?: boolean;
  auto_install?: boolean;
  close_action?: "ask" | "tray" | "quit";
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
  latest_version?: string | null;
  versions_count?: number | null;
  updated_at?: string | null;
}

export interface MarketCacheInfo {
  exists: boolean;
  count: number;
  updated_at?: string | null;
}


export interface SystemEnvStatus {
  path_has_shims: boolean;
  path_has_bin?: boolean;
  env_data_dir_ok?: boolean;
  env_bin_dir_ok?: boolean;
  pwsh_profile_active?: boolean;
  shims_dir: string;
  mise_data_dir: string;
  mise_bin_dir?: string;
  app_dir?: string;
}

export interface ExecOutput {
  success: boolean;
  output: string;
  code?: number | null;
}

export interface MiseCandidate {
  path: string;
  version: string;
  is_current: boolean;
  location_type: string;
}
