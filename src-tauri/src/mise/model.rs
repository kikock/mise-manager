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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemEnvStatus {
    pub path_has_shims: bool,
    pub shims_dir: String,
    pub mise_data_dir: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecOutput {
    pub success: bool,
    pub output: String,
    pub code: Option<i32>,
}
