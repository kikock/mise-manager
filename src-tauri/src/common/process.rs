use crate::common::error::{AppError, AppResult, ErrorCode};
use std::os::windows::process::CommandExt;
use std::process::{Command, Stdio};
use std::time::Duration;

pub struct CmdOutput {
    pub success: bool,
    pub code: i32,
    pub stdout: String,
    pub stderr: String,
}

pub fn decode_oem(bytes: &[u8]) -> String {
    if bytes.is_empty() {
        return String::new();
    }
    if let Ok(utf8) = std::str::from_utf8(bytes) {
        return utf8.to_string();
    }
    let (cow, _, _) = encoding_rs::GBK.decode(bytes);
    cow.into_owned()
}

pub fn run_command(
    program: &str,
    args: &[&str],
    timeout: Option<Duration>,
) -> AppResult<CmdOutput> {
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = Command::new(program);
    cmd.args(args);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    cmd.creation_flags(CREATE_NO_WINDOW);

    let timeout_duration = timeout.unwrap_or(Duration::from_secs(30));

    let mut child = cmd.spawn().map_err(|e| {
        AppError::new(
            ErrorCode::CommandFailed,
            format!("启动程序 '{}' 失败: {}", program, e),
        )
    })?;

    let start = std::time::Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                let output = child.wait_with_output().map_err(|e| {
                    AppError::new(
                        ErrorCode::CommandFailed,
                        format!("读取 '{}' 输出失败: {}", program, e),
                    )
                })?;

                let stdout = decode_oem(&output.stdout);
                let stderr = decode_oem(&output.stderr);
                let code = status.code().unwrap_or(-1);

                return Ok(CmdOutput {
                    success: status.success(),
                    code,
                    stdout,
                    stderr,
                });
            }
            Ok(None) => {
                if start.elapsed() > timeout_duration {
                    let _ = child.kill();
                    return Err(AppError::new(
                        ErrorCode::CommandTimeout,
                        format!("执行 '{}' 超时 (超过 {} 秒)", program, timeout_duration.as_secs()),
                    ));
                }
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(e) => {
                return Err(AppError::new(
                    ErrorCode::CommandFailed,
                    format!("等待命令执行异常: {}", e),
                ));
            }
        }
    }
}
