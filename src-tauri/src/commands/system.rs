use tauri::command;
use std::path::Path;
use crate::common::error::{AppError, AppResult};
use crate::mise::config::ConfigManager;
use crate::mise::model::SystemEnvStatus;

#[command]
pub async fn open_directory(path: String) -> AppResult<()> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(AppError::not_found(format!("路径不存在: {}", path)));
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(AppError::io)?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("open")
            .arg(path)
            .spawn()
            .map_err(AppError::io)?;
    }

    Ok(())
}

#[command]
pub async fn check_system_env() -> AppResult<SystemEnvStatus> {
    let paths = ConfigManager::resolve_paths();
    let shims = paths.shims_dir.to_lowercase();
    let mut has_shims = false;

    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        if let Ok(env) = hkcu.open_subkey("Environment") {
            if let Ok(path_val) = env.get_value::<String, _>("Path") {
                if path_val.to_lowercase().contains(&shims) {
                    has_shims = true;
                }
            }
        }
    }

    if !has_shims {
        if let Ok(path_var) = std::env::var("PATH") {
            if path_var.to_lowercase().contains(&shims) {
                has_shims = true;
            }
        }
    }

    Ok(SystemEnvStatus {
        path_has_shims: has_shims,
        shims_dir: paths.shims_dir,
        mise_data_dir: paths.data_dir,
    })
}

#[command]
pub async fn add_shims_to_user_path() -> AppResult<bool> {
    let paths = ConfigManager::resolve_paths();
    let shims = paths.shims_dir;

    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (env, _) = hkcu.create_subkey("Environment")
            .map_err(|e| AppError::config(format!("打开注册表环境变量失败: {}", e)))?;

        let old_path = env.get_value::<String, _>("Path").unwrap_or_default();
        if old_path.to_lowercase().contains(&shims.to_lowercase()) {
            return Ok(true);
        }

        let new_path = if old_path.trim().is_empty() {
            shims
        } else {
            format!("{};{}", shims, old_path)
        };

        env.set_value("Path", &new_path)
            .map_err(|e| AppError::config(format!("更新 Path 注册表失败: {}", e)))?;

        // 广播环境变量刷新通知
        unsafe {
            use std::ffi::c_void;
            extern "system" {
                fn SendMessageTimeoutW(
                    hWnd: *mut c_void,
                    Msg: u32,
                    wParam: usize,
                    lParam: *const u16,
                    fuFlags: u32,
                    uTimeout: u32,
                    lpdwResult: *mut usize,
                ) -> isize;
            }
            let env_str: Vec<u16> = "Environment\0".encode_utf16().collect();
            let mut result: usize = 0;
            SendMessageTimeoutW(
                0xffff as *mut c_void, // HWND_BROADCAST
                0x001A,                // WM_SETTINGCHANGE
                0,
                env_str.as_ptr(),
                0x0002,                // SMTO_ABORTIFHUNG
                5000,
                &mut result,
            );
        }

        Ok(true)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(false)
    }
}

#[command]
pub async fn hide_to_tray(window: tauri::WebviewWindow) -> AppResult<()> {
    let _ = window.hide();
    Ok(())
}

#[command]
pub async fn exit_app(app: tauri::AppHandle) -> AppResult<()> {
    app.exit(0);
    Ok(())
}
