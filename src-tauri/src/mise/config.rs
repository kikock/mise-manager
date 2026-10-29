use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use crate::common::error::{AppError, AppResult};
use super::model::{AppConfig, MisePaths};

pub struct ConfigManager;

impl ConfigManager {
    /// 获取当前应用所在运行根目录
    pub fn get_app_dir() -> PathBuf {
        if let Ok(exe) = std::env::current_exe() {
            if let Some(parent) = exe.parent() {
                // 如果在 target/debug 或 target/release 下，向上找根目录
                let p_str = parent.to_string_lossy();
                if p_str.ends_with("target\\debug") || p_str.ends_with("target\\release") {
                    if let Some(root) = parent.parent().and_then(|p| p.parent()) {
                        return root.to_path_buf();
                    }
                }
                return parent.to_path_buf();
            }
        }
        std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
    }

    /// 获取配置保存路径
    pub fn get_config_file_path() -> PathBuf {
        let app_dir = Self::get_app_dir();
        let local_config = app_dir.join("config.json");
        // 如果本地已存在或具备写入权限，则优先便携存储
        if local_config.exists() {
            return local_config;
        }

        if let Some(data_dir) = dirs::config_dir() {
            let mise_dir = data_dir.join("mise-manager");
            let _ = fs::create_dir_all(&mise_dir);
            return mise_dir.join("config.json");
        }

        local_config
    }

    /// 读取配置
    pub fn load_config() -> AppConfig {
        let path = Self::get_config_file_path();
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(cfg) = serde_json::from_str::<AppConfig>(&content) {
                    return cfg;
                }
            }
        }
        AppConfig::default()
    }

    /// 保存配置
    pub fn save_config(config: &AppConfig) -> AppResult<()> {
        let path = Self::get_config_file_path();
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let content = serde_json::to_string_pretty(config)
            .map_err(|e| AppError::config(format!("序列化配置失败: {}", e)))?;
        fs::write(&path, content)
            .map_err(|e| AppError::config(format!("写入配置文件失败: {}", e)))?;
        Ok(())
    }

    /// 探测系统上可用的 mise.exe 路径
    pub fn detect_mise_exe(custom_path: Option<&str>) -> Option<PathBuf> {
        // 1. 如果用户显式配置了自定义路径且存在
        if let Some(cp) = custom_path {
            let p = PathBuf::from(cp);
            if p.is_file() && p.exists() {
                return Some(p);
            }
        }

        let app_dir = Self::get_app_dir();

        // 2. 检查便携目录: [app_dir]/mise/bin/mise.exe
        let portable_exe = app_dir.join("mise").join("bin").join("mise.exe");
        if portable_exe.exists() {
            return Some(portable_exe);
        }

        // 3. 检查系统 PATH 中的 mise
        if let Ok(p) = which::which("mise") {
            return Some(p);
        }
        if let Ok(p) = which::which("mise.exe") {
            return Some(p);
        }

        // 4. 检查常见 Windows 安装位置
        if let Some(user_profile) = dirs::home_dir() {
            let p1 = user_profile.join(".local").join("bin").join("mise.exe");
            if p1.exists() {
                return Some(p1);
            }
        }

        if let Some(local_app_data) = dirs::data_local_dir() {
            let p2 = local_app_data.join("mise").join("bin").join("mise.exe");
            if p2.exists() {
                return Some(p2);
            }
        }

        None
    }

    /// 解析完整 Mise 路径结构
    pub fn resolve_paths() -> MisePaths {
        let config = Self::load_config();
        let app_dir = Self::get_app_dir();

        let root_dir = if let Some(r) = config.custom_root_dir {
            PathBuf::from(r)
        } else {
            app_dir.join("mise")
        };

        let data_dir = root_dir.join("data");
        let shims_dir = data_dir.join("shims");

        let detected_exe = Self::detect_mise_exe(config.custom_mise_path.as_deref());
        let is_found = detected_exe.is_some();
        let exe_path = detected_exe
            .unwrap_or_else(|| root_dir.join("bin").join("mise.exe"))
            .to_string_lossy()
            .to_string();

        MisePaths {
            app_dir: app_dir.to_string_lossy().to_string(),
            root_dir: root_dir.to_string_lossy().to_string(),
            data_dir: data_dir.to_string_lossy().to_string(),
            shims_dir: shims_dir.to_string_lossy().to_string(),
            exe_path,
            is_found,
            version: None,
        }
    }

    /// 构建调用 mise 命令时专用的环境变量
    pub fn build_mise_env() -> HashMap<String, String> {
        let paths = Self::resolve_paths();
        let config = Self::load_config();
        let mut envs = HashMap::new();

        envs.insert("MISE_DATA_DIR".to_string(), paths.data_dir.clone());
        envs.insert("MISE_CONFIG_DIR".to_string(), Path::new(&paths.root_dir).join("config").to_string_lossy().to_string());
        envs.insert("MISE_CACHE_DIR".to_string(), Path::new(&paths.root_dir).join("cache").to_string_lossy().to_string());
        envs.insert("MISE_STATE_DIR".to_string(), Path::new(&paths.root_dir).join("state").to_string_lossy().to_string());
        envs.insert("MISE_SHIMS_DIR".to_string(), paths.shims_dir.clone());
        envs.insert("MISE_YES".to_string(), "1".to_string());
        envs.insert("MISE_EXPERIMENTAL".to_string(), "1".to_string());

        if let Some(mirror) = config.mirror_url {
            if !mirror.trim().is_empty() {
                envs.insert("MISE_NODE_MIRROR_URL".to_string(), mirror.clone());
                envs.insert("MISE_PYTHON_MIRROR_URL".to_string(), mirror);
            }
        }

        // 拼接当前进程 PATH 与 shims_dir
        if let Ok(sys_path) = std::env::var("PATH") {
            let combined = format!("{};{}", paths.shims_dir, sys_path);
            envs.insert("PATH".to_string(), combined);
        }

        envs
    }
}
