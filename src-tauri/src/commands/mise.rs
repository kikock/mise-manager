use tauri::{command, AppHandle, State};
use std::sync::Arc;
use crate::common::error::AppResult;
use crate::mise::model::{ExecOutput, InstalledTool};
use crate::mise::MiseRunner;

pub type SharedRunner = Arc<MiseRunner>;

#[command]
pub async fn mise_exec(
    app: AppHandle,
    runner: State<'_, SharedRunner>,
    args: Vec<String>,
) -> AppResult<ExecOutput> {
    runner.run_stream(Some(&app), &args).await
}

#[command]
pub async fn mise_abort_exec(runner: State<'_, SharedRunner>) -> AppResult<()> {
    runner.abort_current()
}

#[command]
pub async fn mise_list_installed(runner: State<'_, SharedRunner>) -> AppResult<Vec<InstalledTool>> {
    runner.list_installed().await
}

#[command]
pub async fn mise_use_tool(
    app: AppHandle,
    runner: State<'_, SharedRunner>,
    tool: String,
    version: String,
    is_global: bool,
) -> AppResult<ExecOutput> {
    let mut args = vec!["use".to_string()];
    if is_global {
        args.push("-g".to_string());
    }
    args.push(format!("{}@{}", tool, version));
    runner.run_stream(Some(&app), &args).await
}

#[command]
pub async fn mise_uninstall_tool(
    app: AppHandle,
    runner: State<'_, SharedRunner>,
    tool: String,
    version: String,
) -> AppResult<ExecOutput> {
    let args = vec![
        "uninstall".to_string(),
        format!("{}@{}", tool, version),
    ];
    runner.run_stream(Some(&app), &args).await
}

#[command]
pub async fn mise_install_tool(
    app: AppHandle,
    runner: State<'_, SharedRunner>,
    tool: String,
    version: Option<String>,
) -> AppResult<ExecOutput> {
    let target = match version {
        Some(v) if !v.trim().is_empty() => format!("{}@{}", tool, v),
        _ => tool,
    };
    let args = vec!["install".to_string(), target];
    runner.run_stream(Some(&app), &args).await
}

#[command]
pub async fn mise_use_tool_in_dir(
    app: AppHandle,
    runner: State<'_, SharedRunner>,
    tool: String,
    version: String,
    dir: String,
) -> AppResult<ExecOutput> {
    let args = vec!["use".to_string(), format!("{}@{}", tool, version)];
    runner.run_stream_in_dir(Some(&app), &args, Some(&dir)).await
}

#[command]
pub async fn mise_list_tool_remote_versions(
    runner: State<'_, SharedRunner>,
    tool: String,
) -> AppResult<Vec<String>> {
    runner.list_remote_versions(&tool).await
}



#[command]
pub async fn download_mise_engine(app: AppHandle) -> AppResult<ExecOutput> {
    crate::mise::MiseDownloader::download_and_install(Some(&app)).await
}

/// 探测单个可执行文件的实际版本
async fn probe_exe_version(exe_path: &str) -> Option<String> {
    let mut cmd = tokio::process::Command::new(exe_path);
    cmd.arg("--version");
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(0x08000000);
    }
    if let Ok(output) = cmd.output().await {
        if output.status.success() {
            let s = crate::common::process::decode_oem(&output.stdout);
            return Some(s.trim().to_string());
        }
    }
    None
}

/// 扫描本地所有可能存在的 mise 实例
#[command]
pub async fn scan_local_mise() -> AppResult<Vec<crate::mise::model::MiseCandidate>> {
    use std::path::PathBuf;
    use crate::mise::config::ConfigManager;
    use crate::mise::model::MiseCandidate;

    let current_paths = ConfigManager::resolve_paths();
    let current_exe = current_paths.exe_path.to_lowercase();
    let app_dir = ConfigManager::get_app_dir();

    let mut check_list: Vec<(PathBuf, &str)> = Vec::new();
    check_list.push((app_dir.join("mise").join("bin").join("mise.exe"), "便携自包含目录"));

    if let Ok(p) = which::which("mise.exe") { check_list.push((p, "系统环境变量 (PATH)")); }
    if let Ok(p) = which::which("mise") { check_list.push((p, "系统环境变量 (PATH)")); }
    if let Some(h) = dirs::home_dir() { check_list.push((h.join(".local").join("bin").join("mise.exe"), "用户主目录 (~/.local)")); }
    if let Some(l) = dirs::data_local_dir() { check_list.push((l.join("mise").join("bin").join("mise.exe"), "本地应用数据 (%LOCALAPPDATA%)")); }

    let dev_paths = [
        r"D:\developmentTool\mise\bin\mise.exe",
        r"D:\tools\mise\bin\mise.exe",
        r"D:\mise\bin\mise.exe",
        r"C:\tools\mise\bin\mise.exe",
        r"C:\Program Files\mise\bin\mise.exe",
        r"E:\developmentTool\mise\bin\mise.exe",
    ];
    for dp in dev_paths { check_list.push((PathBuf::from(dp), "本地开发工具目录")); }

    let cfg = ConfigManager::load_config();
    if let Some(ref cust) = cfg.custom_mise_path {
        if !cust.trim().is_empty() { check_list.push((PathBuf::from(cust), "当前自定义配置")); }
    }

    let mut seen = std::collections::HashSet::new();
    let mut candidates = Vec::new();

    for (p, loc_type) in check_list {
        if !p.exists() || !p.is_file() { continue; }
        let canon = p.to_string_lossy().to_string();
        let lower = canon.to_lowercase();
        if seen.contains(&lower) { continue; }
        seen.insert(lower.clone());

        let ver = probe_exe_version(&canon).await.unwrap_or_else(|| "可用 (未返回版本)".to_string());
        let is_cur = current_paths.is_found && lower == current_exe;

        candidates.push(MiseCandidate {
            path: canon,
            version: ver,
            is_current: is_cur,
            location_type: loc_type.to_string(),
        });
    }

    Ok(candidates)
}

/// 切换当前使用的 mise.exe 路径，并自动同步更新工作目录、data、shims 垫片与环境变量
#[command]
pub async fn switch_mise_path(path: String) -> AppResult<()> {
    use std::path::Path;
    use crate::mise::config::ConfigManager;
    let mut cfg = ConfigManager::load_config();
    let is_reset = path.trim().is_empty();
    if is_reset {
        cfg.custom_mise_path = None;
        cfg.custom_root_dir = None;
    } else {
        let p = Path::new(&path);
        let root_dir = if let Some(parent) = p.parent() {
            if parent.file_name().and_then(|s| s.to_str()).map(|s| s.eq_ignore_ascii_case("bin")).unwrap_or(false) {
                parent.parent().unwrap_or(parent).to_path_buf()
            } else {
                parent.to_path_buf()
            }
        } else {
            ConfigManager::get_app_dir().join("mise")
        };

        cfg.custom_mise_path = Some(path);
        cfg.custom_root_dir = Some(root_dir.to_string_lossy().to_string());
    }
    ConfigManager::save_config(&cfg)?;

    // 确保新的数据与垫片目录生成
    ConfigManager::ensure_directories();

    // 自动同步并应用新的环境变量与 PowerShell 激活脚本
    let _ = crate::commands::system::apply_all_user_env().await;
    let _ = crate::commands::system::apply_pwsh_profile().await;

    Ok(())
}

/// 升级本地 mise 核心至最新稳定版本
#[command]
pub async fn mise_upgrade(
    app: AppHandle,
    runner: State<'_, SharedRunner>,
) -> AppResult<ExecOutput> {
    use tauri::Emitter;
    let _ = app.emit("mise:stream", ">> 正在启动 mise 核心程序升级流程...\n");

    let paths = crate::mise::config::ConfigManager::resolve_paths();
    if paths.is_found {
        let _ = app.emit("mise:stream", ">> [1/2] 正在调用官方 self-update 进行原地无损升级...\n");
        let update_args = vec!["self-update".to_string(), "-y".to_string()];
        if let Ok(out) = runner.run_stream(Some(&app), &update_args).await {
            if out.success {
                let _ = app.emit("mise:stream", ">> ✅ mise 核心程序已顺利更新至最新版本！\n");
                return Ok(out);
            }
        }
        let _ = app.emit("mise:stream", ">> ⚠️ 原地自更新受阻，自动切换至多镜像源极速下载覆盖升级...\n");
    } else {
        let _ = app.emit("mise:stream", ">> 本机未检测到有效 mise 运行时，直接启动便携核心下载安装...\n");
    }

    crate::mise::MiseDownloader::download_and_install(Some(&app)).await
}

/// 安全卸载本地 mise 核心程序，支持按需保留或删除 data 数据
#[command]
pub async fn mise_uninstall(
    app: AppHandle,
    runner: State<'_, SharedRunner>,
    delete_data: bool,
) -> AppResult<ExecOutput> {
    use tauri::Emitter;
    let _ = app.emit("mise:stream", ">> 开始执行安全卸载流程...\n");

    // 1. 强杀当前由应用管理的子进程
    let _ = runner.abort_current();

    // 2. 强杀 Windows 系统中可能残余的 mise.exe
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/IM", "mise.exe"])
            .creation_flags(0x08000000)
            .output();
    }

    let app_dir = crate::mise::config::ConfigManager::get_app_dir();
    let portable_root = app_dir.join("mise");
    let bin_dir = portable_root.join("bin");

    // 3. 移除环境变量与激活项
    let _ = app.emit("mise:stream", ">> [1/3] 正在清理 Windows 用户环境变量 PATH 关联与激活配置...\n");
    let _ = crate::commands::system::remove_all_user_env().await;
    let _ = crate::commands::system::remove_pwsh_profile().await;

    // 4. 处理 data 与程序目录
    if delete_data {
        let _ = app.emit("mise:stream", ">> [2/3] 用户选择删除数据目录，正在彻底清除便携主目录及其全部已安装工具 (data)...\n");
        if portable_root.exists() {
            let _ = std::fs::remove_dir_all(&portable_root);
        }
    } else {
        let _ = app.emit("mise:stream", ">> [2/3] 用户选择保留 data 数据，正在移除 mise 可执行程序并保留已安装工具...\n");
        let exe = bin_dir.join("mise.exe");
        if exe.exists() {
            let _ = std::fs::remove_file(&exe);
        }
        let shim = bin_dir.join("mise-shim.exe");
        if shim.exists() {
            let _ = std::fs::remove_file(&shim);
        }
        let _ = std::fs::remove_dir_all(portable_root.join("cache"));
        let _ = std::fs::remove_dir_all(portable_root.join("state"));
    }

    // 5. 重置配置
    let _ = app.emit("mise:stream", ">> [3/3] 正在重置应用配置...\n");
    let mut cfg = crate::mise::config::ConfigManager::load_config();
    cfg.custom_mise_path = None;
    cfg.custom_root_dir = None;
    let _ = crate::mise::config::ConfigManager::save_config(&cfg);

    let _ = app.emit("mise:stream", ">> ✅ 本地 mise 核心已安全卸载完成！\n");

    Ok(ExecOutput {
        success: true,
        output: "卸载成功".to_string(),
        code: Some(0),
    })
}
