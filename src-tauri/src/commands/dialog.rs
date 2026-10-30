use tauri::command;
use std::path::Path;
use crate::common::error::{AppError, AppResult};

#[command]
pub async fn select_directory(title: Option<String>) -> AppResult<Option<String>> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let desc = title.unwrap_or_else(|| "请选择目标文件夹".to_string()).replace('\'', "''");
        let script = format!(
            r#"Add-Type -AssemblyName System.Windows.Forms; $form = New-Object System.Windows.Forms.Form; $form.TopMost = $true; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = '{}'; $d.ShowNewFolderButton = $true; if ($d.ShowDialog($form) -eq [System.Windows.Forms.DialogResult]::OK) {{ [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Write-Output $d.SelectedPath }}; $form.Dispose()"#,
            desc
        );
        let output = std::process::Command::new("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .creation_flags(0x08000000)
            .output()
            .map_err(AppError::io)?;

        let text = crate::common::process::decode_oem(&output.stdout).trim().to_string();
        if !text.is_empty() && Path::new(&text).exists() {
            return Ok(Some(text));
        }
        Ok(None)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(None)
    }
}

#[command]
pub async fn select_file(title: Option<String>) -> AppResult<Option<String>> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let t = title.unwrap_or_else(|| "请选择本地 mise.exe 可执行文件".to_string()).replace('\'', "''");
        let script = format!(
            r#"Add-Type -AssemblyName System.Windows.Forms; $form = New-Object System.Windows.Forms.Form; $form.TopMost = $true; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Title = '{}'; $d.Filter = 'mise 可执行程序 (mise.exe)|mise.exe|可执行文件 (*.exe)|*.exe|所有文件 (*.*)|*.*'; if ($d.ShowDialog($form) -eq [System.Windows.Forms.DialogResult]::OK) {{ [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Write-Output $d.FileName }}; $form.Dispose()"#,
            t
        );
        let output = std::process::Command::new("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .creation_flags(0x08000000)
            .output()
            .map_err(AppError::io)?;

        let text = crate::common::process::decode_oem(&output.stdout).trim().to_string();
        if !text.is_empty() && Path::new(&text).exists() {
            return Ok(Some(text));
        }
        Ok(None)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(None)
    }
}
