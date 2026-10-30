use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tauri::{AppHandle, Emitter};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

use crate::common::error::{AppError, AppResult};
use crate::common::process::decode_oem;
use super::config::ConfigManager;
use super::model::{ExecOutput, InstalledTool};

pub struct MiseRunner {
    current_pid: Arc<AtomicU32>,
}

impl Default for MiseRunner {
    fn default() -> Self {
        Self::new()
    }
}

impl MiseRunner {
    pub fn new() -> Self {
        Self {
            current_pid: Arc::new(AtomicU32::new(0)),
        }
    }

    /// 终止当前正在运行的 Mise 子进程
    pub fn abort_current(&self) -> AppResult<()> {
        let pid = self.current_pid.swap(0, Ordering::SeqCst);
        if pid > 0 {
            #[cfg(target_os = "windows")]
            {
                let _ = std::process::Command::new("taskkill")
                    .args(["/F", "/T", "/PID", &pid.to_string()])
                    .creation_flags(0x08000000)
                    .output();
            }
            #[cfg(not(target_os = "windows"))]
            {
                let _ = std::process::Command::new("kill")
                    .args(["-9", &pid.to_string()])
                    .output();
            }
        }
        Ok(())
    }

    /// 异步流式执行 mise 命令并通过 Tauri 事件推流
    pub async fn run_stream(
        &self,
        app: Option<&AppHandle>,
        args: &[String],
    ) -> AppResult<ExecOutput> {
        self.run_stream_in_dir(app, args, None).await
    }

    /// 异步流式执行 mise 命令，支持指定当前工作目录 (cwd)
    pub async fn run_stream_in_dir(
        &self,
        app: Option<&AppHandle>,
        args: &[String],
        cwd: Option<&str>,
    ) -> AppResult<ExecOutput> {
        let paths = ConfigManager::resolve_paths();
        let envs = ConfigManager::build_mise_env();

        // 强杀之前可能存在的进程
        let _ = self.abort_current();

        let mut cmd = Command::new(&paths.exe_path);
        cmd.args(args);
        cmd.envs(envs);

        if let Some(dir) = cwd {
            if !dir.trim().is_empty() {
                cmd.current_dir(dir.trim());
            }
        }

        #[cfg(target_os = "windows")]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| {
            AppError::process(format!("启动 mise 进程失败 ({}): {}", paths.exe_path, e))
        })?;

        let pid = child.id().unwrap_or(0);
        self.current_pid.store(pid, Ordering::SeqCst);

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        let app_handle_out = app.cloned();
        let app_handle_err = app.cloned();

        let stdout_task = tokio::spawn(async move {
            let mut result = String::new();
            if let Some(pipe) = stdout {
                let mut reader = BufReader::new(pipe);
                let mut buf = Vec::new();
                while let Ok(n) = reader.read_until(b'\n', &mut buf).await {
                    if n == 0 {
                        break;
                    }
                    let line = decode_oem(&buf);
                    result.push_str(&line);
                    if let Some(ref handle) = app_handle_out {
                        let _ = handle.emit("mise:stream", &line);
                    }
                    buf.clear();
                }
            }
            result
        });

        let stderr_task = tokio::spawn(async move {
            let mut result = String::new();
            if let Some(pipe) = stderr {
                let mut reader = BufReader::new(pipe);
                let mut buf = Vec::new();
                while let Ok(n) = reader.read_until(b'\n', &mut buf).await {
                    if n == 0 {
                        break;
                    }
                    let line = decode_oem(&buf);
                    result.push_str(&line);
                    if let Some(ref handle) = app_handle_err {
                        let _ = handle.emit("mise:stream", &line);
                    }
                    buf.clear();
                }
            }
            result
        });

        let status = child.wait().await.map_err(|e| {
            AppError::process(format!("等待子进程执行完成错误: {}", e))
        })?;

        self.current_pid.store(0, Ordering::SeqCst);

        let out_text = stdout_task.await.unwrap_or_default();
        let err_text = stderr_task.await.unwrap_or_default();

        let success = status.success();
        let code = status.code();
        let full_output = if success {
            if out_text.is_empty() { err_text } else { out_text }
        } else {
            if err_text.is_empty() { out_text } else { err_text }
        };

        Ok(ExecOutput {
            success,
            output: full_output,
            code,
        })
    }

    /// 获取 Mise 自身版本信息
    pub async fn get_version(&self) -> Option<String> {
        let args = vec!["--version".to_string()];
        if let Ok(res) = self.run_stream(None, &args).await {
            if res.success {
                return Some(res.output.trim().to_string());
            }
        }
        None
    }

    /// 解析已安装工具列表
    pub async fn list_installed(&self) -> AppResult<Vec<InstalledTool>> {
        let args = vec!["ls".to_string(), "--json".to_string()];
        let res = self.run_stream(None, &args).await?;
        if !res.success {
            return Ok(Vec::new());
        }

        let mut list = Vec::new();
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&res.output) {
            if let Some(obj) = val.as_object() {
                for (name, item_val) in obj {
                    if let Some(arr) = item_val.as_array() {
                        for v in arr {
                            let ver = v.get("version").and_then(|x| x.as_str()).unwrap_or("");
                            let active = v.get("active").and_then(|x| x.as_bool()).unwrap_or(false);
                            let raw_path = v.get("install_path").and_then(|x| x.as_str()).map(|s| s.to_string());
                            let mut final_path = raw_path;
                            // 若底层给出的路径为 i\vfox-... 等哈希包，优先检查标准统一路径 data\installs\<name>\<version>
                            let paths = crate::mise::ConfigManager::resolve_paths();
                            let std_install = std::path::PathBuf::from(&paths.data_dir).join("installs").join(name).join(ver);
                            if std_install.exists() {
                                final_path = Some(std_install.to_string_lossy().to_string());
                            }

                            if !ver.is_empty() {
                                list.push(InstalledTool {
                                    name: name.clone(),
                                    version: ver.to_string(),
                                    is_active: active,
                                    is_global: active,
                                    path: final_path,
                                });
                            }
                        }
                    }
                }
            }
        }
        Ok(list)
    }

    /// 查询远程工具所有可用版本 (mise ls-remote <tool>)
    pub async fn list_remote_versions(&self, tool: &str) -> AppResult<Vec<String>> {
        let args = vec!["ls-remote".to_string(), tool.to_string()];
        let res = self.run_stream(None, &args).await?;
        if !res.success {
            return Ok(Vec::new());
        }
        let mut list: Vec<String> = res
            .output
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        // 倒序排列（最新版本排在前面）
        list.reverse();
        Ok(list)
    }
}
