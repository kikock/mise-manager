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

#[command]
pub async fn restore_default_paths() -> AppResult<MisePaths> {
    use std::fs;

    let app_dir = ConfigManager::get_app_dir();
    let default_root = app_dir.join("mise");
    let default_bin = default_root.join("bin");
    let default_data = default_root.join("data");
    let default_shims = default_data.join("shims");

    // 1. 物理创建当前应用文件夹下的完整 mise 目录树
    let _ = fs::create_dir_all(&default_root);
    let _ = fs::create_dir_all(&default_bin);
    let _ = fs::create_dir_all(&default_data);
    let _ = fs::create_dir_all(&default_shims);
    let _ = fs::create_dir_all(default_root.join("cache"));
    let _ = fs::create_dir_all(default_root.join("config"));
    let _ = fs::create_dir_all(default_root.join("state"));

    // 2. 写入配置为默认便携路径
    let mut config = ConfigManager::load_config();
    config.custom_root_dir = Some(default_root.to_string_lossy().to_string());
    
    // 如果默认 bin 下有 mise.exe，则自动关联
    let default_exe = default_bin.join("mise.exe");
    if default_exe.exists() {
        config.custom_mise_path = Some(default_exe.to_string_lossy().to_string());
    } else {
        config.custom_mise_path = None;
    }
    ConfigManager::save_config(&config)?;

    get_mise_paths().await
}

