use std::sync::Arc;
use tauri::{Manager, WindowEvent};

pub mod common;
pub mod commands;
pub mod mise;
pub mod tray;

use commands::config::*;
use commands::dialog::*;
use commands::market::*;
use commands::mise::*;
use commands::system::*;
use mise::MiseRunner;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let runner = Arc::new(MiseRunner::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(runner)
        .setup(|app| {
            if let Err(e) = tray::setup_tray(app.handle()) {
                eprintln!("初始化托盘失败: {}", e);
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            use tauri::Emitter;
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    let _ = window.emit("window-close-requested", ());
                    let _ = window.app_handle().emit("window-close-requested", ());
                }
                WindowEvent::Resized(_) => {
                    if window.is_minimized().unwrap_or(false) {
                        let _ = window.hide();
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            // 配置相关
            get_app_config,
            save_app_config,
            get_mise_paths,
            restore_default_paths,
            // Mise 相关
            mise_exec,
            mise_abort_exec,
            mise_list_installed,
            mise_use_tool,
            mise_use_tool_in_dir,
            mise_uninstall_tool,
            mise_install_tool,
            mise_list_tool_remote_versions,
            mise_get_market_plugins,
            mise_sync_market_registry,
            mise_get_market_cache_info,
            mise_clear_market_cache,
            mise_clean_cache,
            download_mise_engine,
            scan_local_mise,
            switch_mise_path,
            mise_upgrade,
            mise_uninstall,
            // 对话框与原生选择
            select_directory,
            select_file,
            // 系统相关
            open_directory,
            open_external_url,
            check_system_env,
            add_shims_to_user_path,
            apply_all_user_env,
            remove_all_user_env,
            apply_pwsh_profile,
            remove_pwsh_profile,
            hide_to_tray,
            exit_app,
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用程序时发生致命错误");
}
