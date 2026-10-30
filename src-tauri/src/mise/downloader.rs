use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

use crate::common::error::{AppError, AppResult};
use crate::common::process::decode_oem;
use super::config::ConfigManager;
use super::model::ExecOutput;

pub struct MiseDownloader;

impl MiseDownloader {
    /// 构造 Base64 编码的 PowerShell 自动化下载脚本
    fn build_encoded_powershell(target_bin: &str, target_data: &str, target_shims: &str) -> String {
        let script = format!(
            r#"$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

[Console]::Out.WriteLine('>> [1/3] 准备初始化 mise 目录结构...')
$targetBin = '{target_bin}'
$targetData = '{target_data}'
$targetShims = '{target_shims}'

New-Item -ItemType Directory -Force -Path $targetBin | Out-Null
New-Item -ItemType Directory -Force -Path $targetData | Out-Null
New-Item -ItemType Directory -Force -Path $targetShims | Out-Null

[Console]::Out.WriteLine(">> 目录已建立:")
[Console]::Out.WriteLine(">> - 执行程序: $targetBin")
[Console]::Out.WriteLine(">> - 数据目录: $targetData")
[Console]::Out.WriteLine(">> - Shims 代理: $targetShims")

[Console]::Out.WriteLine('>> [2/3] 正在获取 mise 最新预编译发布资产...')
$tag = 'v2026.10.23'
$asset = "mise-$tag-windows-x64.zip"
$urls = @(
    "https://mise.jdx.dev/$tag/$asset",
    "https://github.com/jdx/mise/releases/download/$tag/$asset"
)

$tempZip = Join-Path $env:TEMP $asset
$tempExtract = Join-Path $env:TEMP "mise-extract-$([Guid]::NewGuid().ToString('N'))"

$downloaded = $false
foreach ($url in $urls) {{
    try {{
        [Console]::Out.WriteLine(">> 正在连接下载源: $url ...")
        Invoke-WebRequest -Uri $url -OutFile $tempZip -UseBasicParsing -TimeoutSec 15
        if (Test-Path $tempZip) {{
            $downloaded = $true
            [Console]::Out.WriteLine('>> 下载成功，准备解压...')
            break
        }}
    }} catch {{
        [Console]::Out.WriteLine('>> 连接超时，切换备用线路...')
    }}
}}

if (-not $downloaded) {{
    throw "网络连接受限，下载 mise 失败！请检查网络或配置代理。"
}}

[Console]::Out.WriteLine('>> [3/3] 正在解压并部署到安装目录...')
Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force

$foundExe = Get-ChildItem -Path $tempExtract -Recurse -Filter "mise.exe" | Select-Object -First 1
if (-not $foundExe) {{
    throw "解压文件中未找到 mise.exe！"
}}

Copy-Item -Path $foundExe.FullName -Destination "$targetBin\mise.exe" -Force
$foundShim = Get-ChildItem -Path $tempExtract -Recurse -Filter "mise-shim.exe" | Select-Object -First 1
if ($foundShim) {{
    Copy-Item -Path $foundShim.FullName -Destination "$targetBin\mise-shim.exe" -Force
}}

Remove-Item -Path $tempZip -Force -ErrorAction SilentlyContinue
Remove-Item -Path $tempExtract -Recurse -Force -ErrorAction SilentlyContinue

$verOut = & "$targetBin\mise.exe" --version
[Console]::Out.WriteLine(">> mise 引擎版本: $verOut")
[Console]::Out.WriteLine('>> ✅ Mise 引擎已安装并就绪！')
"#,
            target_bin = target_bin.replace('\'', "''"),
            target_data = target_data.replace('\'', "''"),
            target_shims = target_shims.replace('\'', "''")
        );

        let utf16: Vec<u8> = script
            .encode_utf16()
            .flat_map(|u| u.to_le_bytes())
            .collect();

        base64_encode(&utf16)
    }

    /// 执行下载与初始化部署
    pub async fn download_and_install(app: Option<&AppHandle>) -> AppResult<ExecOutput> {
        let app_dir = ConfigManager::get_app_dir();
        let portable_root = app_dir.join("mise");
        let bin_dir = portable_root.join("bin");
        let data_dir = portable_root.join("data");
        let shims_dir = data_dir.join("shims");
        let target_exe = bin_dir.join("mise.exe");

        // 1. 优先执行本地极速复用通道 (Local Fast Path)
        if let Some(src_exe) = Self::find_existing_local_exe(&target_exe) {
            if let Some(h) = app {
                let _ = h.emit("mise:stream", format!(">> [1/2] 发现本地现有 mise 程序: {}\n", src_exe.display()));
                let _ = h.emit("mise:stream", format!(">> [2/2] 正在极速部署至便携目录: {}\n", target_exe.display()));
            }

            let _ = std::fs::create_dir_all(&bin_dir);
            let _ = std::fs::create_dir_all(&data_dir);
            let _ = std::fs::create_dir_all(&shims_dir);
            
            // 复制可执行文件
            let _ = std::fs::copy(&src_exe, &target_exe);
            if let Some(p) = src_exe.parent() {
                let shim_src = p.join("mise-shim.exe");
                if shim_src.exists() {
                    let _ = std::fs::copy(&shim_src, bin_dir.join("mise-shim.exe"));
                }
            }

            // 重置为便携模式
            let mut cfg = ConfigManager::load_config();
            cfg.custom_mise_path = None;
            cfg.custom_root_dir = None;
            let _ = ConfigManager::save_config(&cfg);

            if let Some(h) = app {
                let _ = h.emit("mise:stream", ">> ✅ 已成功完成本地 mise 便携自包含环境初始化！\n");
            }

            return Ok(ExecOutput {
                success: true,
                output: format!("极速部署成功: {}", target_exe.display()),
                code: Some(0),
            });
        }

        // 2. 本地无实例，走 PowerShell 极速网络下载
        let target_bin = bin_dir.to_string_lossy().to_string();
        let target_data = data_dir.to_string_lossy().to_string();
        let target_shims = shims_dir.to_string_lossy().to_string();

        let encoded_cmd = Self::build_encoded_powershell(&target_bin, &target_data, &target_shims);

        let mut cmd = Command::new("powershell.exe");
        cmd.args(["-NoProfile", "-NonInteractive", "-EncodedCommand", &encoded_cmd]);

        #[cfg(target_os = "windows")]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| {
            AppError::process(format!("启动下载脚本失败: {}", e))
        })?;

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        let app_out = app.cloned();
        let app_err = app.cloned();

        let stdout_task = tokio::spawn(async move {
            let mut result = String::new();
            if let Some(pipe) = stdout {
                let mut reader = BufReader::new(pipe);
                let mut buf = Vec::new();
                while let Ok(n) = reader.read_until(b'\n', &mut buf).await {
                    if n == 0 { break; }
                    let line = decode_oem(&buf);
                    result.push_str(&line);
                    if let Some(ref handle) = app_out {
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
                    if n == 0 { break; }
                    let line = decode_oem(&buf);
                    result.push_str(&line);
                    if let Some(ref handle) = app_err {
                        let _ = handle.emit("mise:stream", &line);
                    }
                    buf.clear();
                }
            }
            result
        });

        let status = child.wait().await.map_err(|e| {
            AppError::process(format!("等待下载进程完成错误: {}", e))
        })?;

        let out_text = stdout_task.await.unwrap_or_default();
        let err_text = stderr_task.await.unwrap_or_default();

        let success = status.success();
        let code = status.code();
        let full_output = if success {
            if out_text.is_empty() { err_text } else { out_text }
        } else {
            if err_text.is_empty() { out_text } else { err_text }
        };

        if success {
            let mut cfg = ConfigManager::load_config();
            cfg.custom_mise_path = None;
            cfg.custom_root_dir = None;
            let _ = ConfigManager::save_config(&cfg);
        }

        Ok(ExecOutput {
            success,
            output: full_output,
            code,
        })
    }

    /// 嗅探本地现存可用的 mise.exe
    fn find_existing_local_exe(target_exe: &Path) -> Option<PathBuf> {
        let mut check_list = Vec::new();
        let cfg = ConfigManager::load_config();
        if let Some(ref c) = cfg.custom_mise_path {
            check_list.push(PathBuf::from(c));
        }
        check_list.push(PathBuf::from(r"D:\developmentTool\mise\bin\mise.exe"));
        check_list.push(PathBuf::from(r"D:\tools\mise\bin\mise.exe"));
        check_list.push(PathBuf::from(r"C:\tools\mise\bin\mise.exe"));

        if let Ok(p) = which::which("mise.exe") { check_list.push(p); }
        if let Ok(p) = which::which("mise") { check_list.push(p); }
        if let Some(h) = dirs::home_dir() { check_list.push(h.join(".local").join("bin").join("mise.exe")); }
        if let Some(l) = dirs::data_local_dir() { check_list.push(l.join("mise").join("bin").join("mise.exe")); }

        for p in check_list {
            if p.is_file() && p.exists() {
                // 如果发现的就是目标自身且有效，直接可用
                if p == target_exe {
                    return Some(p);
                }
                return Some(p);
            }
        }
        None
    }
}

/// 简单安全的标准 Base64 编码
fn base64_encode(input: &[u8]) -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((input.len() + 2) / 3 * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;

        out.push(CHARSET[((triple >> 18) & 0x3F) as usize] as char);
        out.push(CHARSET[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            out.push(CHARSET[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(CHARSET[(triple & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}
