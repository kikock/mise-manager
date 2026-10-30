use tauri::command;
use std::path::{Path, PathBuf};
use crate::common::error::{AppError, AppResult};
use crate::mise::config::ConfigManager;
use crate::mise::model::SystemEnvStatus;

#[command]
pub async fn open_directory(path: String) -> AppResult<()> {
    let p = Path::new(&path);
    if !p.exists() {
        let _ = std::fs::create_dir_all(p);
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("explorer")
            .arg(&path)
            .creation_flags(0x08000000)
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

/// 获取 PowerShell Profile 文件路径
fn get_pwsh_profile_paths() -> Vec<PathBuf> {
    let mut list = Vec::new();
    if let Some(doc) = dirs::document_dir() {
        list.push(doc.join("WindowsPowerShell").join("Microsoft.PowerShell_profile.ps1"));
        list.push(doc.join("PowerShell").join("Microsoft.PowerShell_profile.ps1"));
    }
    list
}

#[command]
pub async fn check_system_env() -> AppResult<SystemEnvStatus> {
    let paths = ConfigManager::resolve_paths();
    let shims = paths.shims_dir.to_lowercase();
    let bin = Path::new(&paths.root_dir).join("bin").to_string_lossy().to_lowercase();

    let mut has_shims = false;
    let mut has_bin = false;
    let mut env_data_ok = false;
    let mut env_bin_ok = false;

    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        if let Ok(env) = hkcu.open_subkey("Environment") {
            if let Ok(path_val) = env.get_value::<String, _>("Path") {
                let lower = path_val.to_lowercase();
                if lower.contains(&shims) { has_shims = true; }
                if lower.contains(&bin) { has_bin = true; }
            }
            if let Ok(d_val) = env.get_value::<String, _>("MISE_DATA_DIR") {
                if d_val.eq_ignore_ascii_case(&paths.data_dir) { env_data_ok = true; }
            }
            if let Ok(b_val) = env.get_value::<String, _>("MISE_BIN_DIR") {
                if b_val.eq_ignore_ascii_case(&paths.shims_dir) { env_bin_ok = true; }
            }
        }
    }

    // 检测 PowerShell Hook
    let mut pwsh_active = false;
    for p in get_pwsh_profile_paths() {
        if p.exists() {
            if let Ok(content) = std::fs::read_to_string(&p) {
                if content.contains("activate pwsh") {
                    pwsh_active = true;
                    break;
                }
            }
        }
    }

    Ok(SystemEnvStatus {
        path_has_shims: has_shims,
        path_has_bin: has_bin,
        env_data_dir_ok: env_data_ok,
        env_bin_dir_ok: env_bin_ok,
        pwsh_profile_active: pwsh_active,
        shims_dir: paths.shims_dir,
        mise_bin_dir: Path::new(&paths.root_dir).join("bin").to_string_lossy().to_string(),
        mise_data_dir: paths.data_dir,
        app_dir: paths.app_dir,
    })
}

/// 广播 Windows 环境变量刷新通知
fn broadcast_env_change() {
    #[cfg(target_os = "windows")]
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
            0xffff as *mut c_void,
            0x001A,
            0,
            env_str.as_ptr(),
            0x0002,
            3000,
            &mut result,
        );
    }
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
            .map_err(|e| AppError::config(format!("打开注册表失败: {}", e)))?;

        let old_path = env.get_value::<String, _>("Path").unwrap_or_default();
        if !old_path.to_lowercase().contains(&shims.to_lowercase()) {
            let new_path = if old_path.trim().is_empty() {
                shims
            } else {
                format!("{};{}", shims, old_path)
            };
            env.set_value("Path", &new_path)
                .map_err(|e| AppError::config(format!("更新 Path 失败: {}", e)))?;
        }

        broadcast_env_change();
        Ok(true)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(false)
    }
}

#[command]
pub async fn apply_all_user_env() -> AppResult<bool> {
    let paths = ConfigManager::resolve_paths();
    let bin = Path::new(&paths.root_dir).join("bin").to_string_lossy().to_string();
    let shims = paths.shims_dir.clone();
    let data = paths.data_dir.clone();

    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (env, _) = hkcu.create_subkey("Environment")
            .map_err(|e| AppError::config(format!("打开注册表失败: {}", e)))?;

        // 写入独立环境变量
        let _ = env.set_value("MISE_DATA_DIR", &data);
        let _ = env.set_value("MISE_BIN_DIR", &shims);

        // 写入 Path (shims 与 bin)
        let old_path = env.get_value::<String, _>("Path").unwrap_or_default();
        let mut path_parts: Vec<String> = old_path.split(';').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect();
        
        if !path_parts.iter().any(|p| p.eq_ignore_ascii_case(&shims)) {
            path_parts.insert(0, shims);
        }
        if !path_parts.iter().any(|p| p.eq_ignore_ascii_case(&bin)) {
            path_parts.push(bin);
        }

        let new_path = path_parts.join(";");
        let _ = env.set_value("Path", &new_path);

        broadcast_env_change();
        Ok(true)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(false)
    }
}

#[command]
pub async fn remove_all_user_env() -> AppResult<bool> {
    let paths = ConfigManager::resolve_paths();
    let bin = Path::new(&paths.root_dir).join("bin").to_string_lossy().to_string();
    let shims = paths.shims_dir.clone();

    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        if let Ok(env) = hkcu.open_subkey_with_flags("Environment", KEY_ALL_ACCESS) {
            let _ = env.delete_value("MISE_DATA_DIR");
            let _ = env.delete_value("MISE_BIN_DIR");

            let old_path = env.get_value::<String, _>("Path").unwrap_or_default();
            let path_parts: Vec<String> = old_path
                .split(';')
                .map(|s| s.trim().to_string())
                .filter(|s| {
                    if s.is_empty() { return false; }
                    let lower = s.to_lowercase();
                    if lower.contains("mise") && (lower.ends_with(r"\bin") || lower.ends_with(r"\shims") || lower.contains(r"\mise\data")) {
                        return false;
                    }
                    if lower == shims.to_lowercase() || lower == bin.to_lowercase() {
                        return false;
                    }
                    true
                })
                .collect();

            let new_path = path_parts.join(";");
            let _ = env.set_value("Path", &new_path);
        }

        broadcast_env_change();
        Ok(true)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(false)
    }
}

#[command]
pub async fn apply_pwsh_profile() -> AppResult<bool> {
    let paths = ConfigManager::resolve_paths();
    let hook_line = format!(
        "\r\n$env:MISE_PWSH_CHPWD_WARNING = 0\r\n(& '{}' activate pwsh) | Out-String | Invoke-Expression\r\n",
        paths.exe_path
    );

    for p in get_pwsh_profile_paths() {
        if let Some(parent) = p.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let mut content = if p.exists() {
            std::fs::read_to_string(&p).unwrap_or_default()
        } else {
            String::new()
        };

        if !content.contains("activate pwsh") {
            content.push_str(&hook_line);
            let _ = std::fs::write(&p, content);
        }
    }
    Ok(true)
}

#[command]
pub async fn remove_pwsh_profile() -> AppResult<bool> {
    for p in get_pwsh_profile_paths() {
        if p.exists() {
            if let Ok(content) = std::fs::read_to_string(&p) {
                let lines: Vec<&str> = content
                    .lines()
                    .filter(|l| !l.contains("activate pwsh") && !l.contains("MISE_PWSH_CHPWD_WARNING"))
                    .collect();
                let _ = std::fs::write(&p, lines.join("\r\n"));
            }
        }
    }
    Ok(true)
}

#[command]
pub async fn hide_to_tray(app: tauri::AppHandle) -> AppResult<()> {
    use tauri::Manager;
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.hide();
    }
    Ok(())
}

#[command]
pub async fn exit_app(app: tauri::AppHandle) -> AppResult<()> {
    app.exit(0);
    Ok(())
}

#[command]
pub async fn open_external_url(url: String) -> AppResult<()> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("cmd")
            .args(["/c", "start", "", &url])
            .creation_flags(0x08000000)
            .spawn()
            .map_err(AppError::io)?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(AppError::io)?;
    }
    Ok(())
}
