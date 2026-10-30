use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub portable_mode: bool,
    pub custom_mise_path: Option<String>,
    pub custom_root_dir: Option<String>,
    pub mirror_url: Option<String>,
    pub theme: String,
    pub close_to_tray: bool,
    pub auto_start: bool,
    #[serde(default = "default_close_action")]
    pub close_action: String,
}

fn default_close_action() -> String {
    "ask".to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            portable_mode: true,
            custom_mise_path: None,
            custom_root_dir: None,
            mirror_url: None,
            theme: "dark".to_string(),
            close_to_tray: true,
            auto_start: false,
            close_action: "ask".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MisePaths {
    pub app_dir: String,
    pub root_dir: String,
    pub data_dir: String,
    pub shims_dir: String,
    pub exe_path: String,
    pub is_found: bool,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledTool {
    pub name: String,
    pub version: String,
    pub is_active: bool,
    pub is_global: bool,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginMarketItem {
    pub name: String,
    pub category: String,
    pub description: String,
    pub repository: String,
    pub is_installed: bool,
    pub installed_version: Option<String>,
    pub popular: bool,
    #[serde(default)]
    pub latest_version: Option<String>,
    #[serde(default)]
    pub versions_count: Option<u32>,
    #[serde(default)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemEnvStatus {
    pub path_has_shims: bool,
    pub path_has_bin: bool,
    pub env_data_dir_ok: bool,
    pub env_bin_dir_ok: bool,
    pub pwsh_profile_active: bool,
    pub shims_dir: String,
    pub mise_bin_dir: String,
    pub mise_data_dir: String,
    pub app_dir: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecOutput {
    pub success: bool,
    pub output: String,
    pub code: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MiseCandidate {
    pub path: String,
    pub version: String,
    pub is_current: bool,
    pub location_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketCacheInfo {
    pub exists: bool,
    pub count: usize,
    pub updated_at: Option<String>,
}

