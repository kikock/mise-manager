use tauri::command;
use crate::common::error::AppResult;
use crate::mise::config::ConfigManager;
use crate::mise::model::{AppConfig, MisePaths};

#[command]
pub async fn get_app_config() -> AppResult<AppConfig> {
    Ok(ConfigManager::load_config())
}

#[command]
pub async fn save_app_config(config: AppConfig) -> AppResult<()> {
    ConfigManager::save_config(&config)
}

#[command]
pub async fn get_mise_paths() -> AppResult<MisePaths> {
    let mut paths = ConfigManager::resolve_paths();
    if paths.is_found {
        let runner = crate::mise::MiseRunner::new();
        paths.version = runner.get_version().await;
    }
    Ok(paths)
}
