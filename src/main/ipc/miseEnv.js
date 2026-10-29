/**
 * Mise Manager — 环境变量与 PowerShell Profile 自动化托管模块
 */
'use strict';

const { exec } = require('child_process');
const { ipcMain } = require('electron');
const { getMiseExeDir, getMiseBinDir, getMiseDataDir } = require('../config');

/** 安全执行 PowerShell 脚本（采用 UTF-16LE Base64 编码，杜绝反斜杠和转义字符问题） */
function runPowerShellScript(scriptText) {
  return new Promise((resolve) => {
    const b64 = Buffer.from(scriptText, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -EncodedCommand ${b64}`, (err, stdout, stderr) => {
      if (err) resolve({ success: false, error: stderr || err.message });
      else resolve({ success: true, output: (stdout || '').trim() });
    });
  });
}

function registerMiseEnvIPC() {
  // 获取当前 Windows 用户环境变量
  ipcMain.handle('env:get', async () => {
    return new Promise((resolve) => {
      const ps = `powershell -NoProfile -Command "[PSCustomObject]@{ MISE_DATA_DIR = [Environment]::GetEnvironmentVariable('MISE_DATA_DIR', 'User'); MISE_BIN_DIR = [Environment]::GetEnvironmentVariable('MISE_BIN_DIR', 'User'); Path = [Environment]::GetEnvironmentVariable('Path', 'User') } | ConvertTo-Json"`;
      exec(ps, (err, stdout) => {
        try {
          const data = JSON.parse(stdout.trim());
          const exeDir  = getMiseExeDir();
          const binDir  = getMiseBinDir();
          const dataDir = getMiseDataDir();
          const currentPath = data.Path || '';
          const pathParts = currentPath.split(';').map(p => p.trim().toLowerCase());

          resolve({
            success: true,
            currentDataDir: data.MISE_DATA_DIR || '',
            currentBinDir:  data.MISE_BIN_DIR || '',
            targetExeDir:   exeDir,
            targetBinDir:   binDir,
            targetDataDir:  dataDir,
            pathHasExeDir:  pathParts.includes(exeDir.toLowerCase()),
            pathHasBinDir:  pathParts.includes(binDir.toLowerCase()),
            pathHasDataDir: pathParts.includes(dataDir.toLowerCase()),
            dataDirMatched: (data.MISE_DATA_DIR || '').toLowerCase() === dataDir.toLowerCase(),
            binDirMatched:  (data.MISE_BIN_DIR || '').toLowerCase() === binDir.toLowerCase(),
          });
        } catch {
          resolve({ success: false });
        }
      });
    });
  });

  // 一键同步写入 Windows 用户环境变量
  ipcMain.handle('env:apply', async () => {
    const exeDir  = getMiseExeDir();
    const binDir  = getMiseBinDir();
    const dataDir = getMiseDataDir();

    const script = `
      $exeDir  = '${exeDir}';
      $binDir  = '${binDir}';
      $dataDir = '${dataDir}';

      [Environment]::SetEnvironmentVariable('MISE_DATA_DIR', $dataDir, 'User');
      [Environment]::SetEnvironmentVariable('MISE_BIN_DIR', $binDir, 'User');

      $currentPath = [Environment]::GetEnvironmentVariable('Path', 'User');
      $parts = @($currentPath -split ';') | Where-Object { 
        $_ -and $_.Trim() -and 
        ($_.Trim().ToLower() -notmatch 'developmenttool[\\\\/]mise') -and
        ($_.Trim().ToLower() -ne $exeDir.ToLower()) -and
        ($_.Trim().ToLower() -ne $binDir.ToLower()) -and
        ($_.Trim().ToLower() -ne $dataDir.ToLower())
      };

      $parts = @($exeDir, $binDir, $dataDir) + $parts;
      $newPath = $parts -join ';';
      [Environment]::SetEnvironmentVariable('Path', $newPath, 'User');
      Write-Output 'OK';
    `;

    const res = await runPowerShellScript(script);
    if (res.success) {
      return { success: true, exeDir, binDir, dataDir };
    } else {
      return { success: false, error: res.error };
    }
  });

  // 一键从 Windows 用户环境变量中清除
  ipcMain.handle('env:remove', async () => {
    const exeDir  = getMiseExeDir();
    const binDir  = getMiseBinDir();
    const dataDir = getMiseDataDir();

    const script = `
      $exeDir  = '${exeDir}';
      $binDir  = '${binDir}';
      $dataDir = '${dataDir}';

      [Environment]::SetEnvironmentVariable('MISE_DATA_DIR', $null, 'User');
      [Environment]::SetEnvironmentVariable('MISE_BIN_DIR', $null, 'User');

      $currentPath = [Environment]::GetEnvironmentVariable('Path', 'User');
      $parts = @($currentPath -split ';') | Where-Object { 
        $_ -and $_.Trim() -and 
        ($_.Trim().ToLower() -ne $exeDir.ToLower()) -and
        ($_.Trim().ToLower() -ne $binDir.ToLower()) -and
        ($_.Trim().ToLower() -ne $dataDir.ToLower()) -and
        ($_.Trim().ToLower() -notmatch 'developmenttool[\\\\/]mise')
      };
      $newPath = $parts -join ';';
      [Environment]::SetEnvironmentVariable('Path', $newPath, 'User');
      Write-Output 'OK';
    `;

    const res = await runPowerShellScript(script);
    if (res.success) {
      return { success: true };
    } else {
      return { success: false, error: res.error };
    }
  });

  // 检测 PowerShell Profile 激活状态
  ipcMain.handle('env:getPwshProfileStatus', async () => {
    const script = [
      '$doc = [Environment]::GetFolderPath("MyDocuments")',
      '$ps51 = Join-Path $doc "WindowsPowerShell\\Microsoft.PowerShell_profile.ps1"',
      '$ps7  = Join-Path $doc "PowerShell\\Microsoft.PowerShell_profile.ps1"',
      'function Check-Profile($p) {',
      '  if (Test-Path $p) {',
      '    $txt = Get-Content $p -Raw -ErrorAction SilentlyContinue',
      '    return [bool]($txt -match "mise\\s+activate")',
      '  }',
      '  return $false',
      '}',
      '[PSCustomObject]@{',
      '  ps51Path = $ps51',
      '  ps51Exists = (Test-Path $ps51)',
      '  ps51Activated = (Check-Profile $ps51)',
      '  ps7Path = $ps7',
      '  ps7Exists = (Test-Path $ps7)',
      '  ps7Activated = (Check-Profile $ps7)',
      '} | ConvertTo-Json',
    ].join('\n');

    const res = await runPowerShellScript(script);
    if (res.success) {
      try {
        const data = JSON.parse(res.output);
        return { success: true, ...data };
      } catch {
        return { success: false, error: '解析返回数据失败' };
      }
    } else {
      return { success: false, error: res.error };
    }
  });

  // 一键激活 PowerShell Profile
  ipcMain.handle('env:applyPwshProfile', async () => {
    const script = [
      '$doc = [Environment]::GetFolderPath("MyDocuments")',
      '$paths = @(',
      '  (Join-Path $doc "WindowsPowerShell\\Microsoft.PowerShell_profile.ps1"),',
      '  (Join-Path $doc "PowerShell\\Microsoft.PowerShell_profile.ps1")',
      ')',
      '$block = @(',
      '  "# >>> mise initialize >>>",',
      '  "`$env:MISE_PWSH_CHPWD_WARNING = \'0\'",',
      '  "if (Get-Command mise -ErrorAction SilentlyContinue) {",',
      '  "    mise activate pwsh | Out-String | Invoke-Expression",',
      '  "}",',
      '  "# <<< mise initialize <<<"',
      ') -join [Environment]::NewLine',
      'foreach ($p in $paths) {',
      '  $dir = Split-Path $p',
      '  if (-not (Test-Path $dir)) {',
      '    New-Item -ItemType Directory -Path $dir -Force | Out-Null',
      '  }',
      '  $content = ""',
      '  if (Test-Path $p) {',
      '    $content = Get-Content $p -Raw -ErrorAction SilentlyContinue',
      '  }',
      '  if (-not $content) { $content = "" }',
      '  $content = $content -replace "(?ms)# >>> mise initialize >>>.*?# <<< mise initialize <<<\\r?\\n?", ""',
      '  $content = $content -replace "(?m)^\\s*\\$env:MISE_PWSH_CHPWD_WARNING\\s*=.*$\\r?\\n?", ""',
      '  $content = $content -replace "(?m)^\\s*mise\\s+activate\\s+pwsh.*$\\r?\\n?", ""',
      '  $content = $content.Trim()',
      '  if ($content) {',
      '    $newContent = $content + [Environment]::NewLine + [Environment]::NewLine + $block + [Environment]::NewLine',
      '  } else {',
      '    $newContent = $block + [Environment]::NewLine',
      '  }',
      '  [System.IO.File]::WriteAllText($p, $newContent, [System.Text.Encoding]::UTF8)',
      '}',
      'Write-Output "OK"',
    ].join('\n');

    const res = await runPowerShellScript(script);
    return { success: res.success && res.output === 'OK', error: res.error };
  });

  // 一键从 PowerShell Profile 中清除激活
  ipcMain.handle('env:removePwshProfile', async () => {
    const script = [
      '$doc = [Environment]::GetFolderPath("MyDocuments")',
      '$paths = @(',
      '  (Join-Path $doc "WindowsPowerShell\\Microsoft.PowerShell_profile.ps1"),',
      '  (Join-Path $doc "PowerShell\\Microsoft.PowerShell_profile.ps1")',
      ')',
      'foreach ($p in $paths) {',
      '  if (Test-Path $p) {',
      '    $content = Get-Content $p -Raw -ErrorAction SilentlyContinue',
      '    if ($content) {',
      '      $content = $content -replace "(?ms)# >>> mise initialize >>>.*?# <<< mise initialize <<<\\r?\\n?", ""',
      '      $content = $content -replace "(?m)^\\s*\\$env:MISE_PWSH_CHPWD_WARNING\\s*=.*$\\r?\\n?", ""',
      '      $content = $content -replace "(?m)^\\s*mise\\s+activate\\s+pwsh.*$\\r?\\n?", ""',
      '      $content = $content.Trim()',
      '      [System.IO.File]::WriteAllText($p, $content, [System.Text.Encoding]::UTF8)',
      '    }',
      '  }',
      '}',
      'Write-Output "OK"',
    ].join('\n');

    const res = await runPowerShellScript(script);
    return { success: res.success && res.output === 'OK', error: res.error };
  });
}

module.exports = { registerMiseEnvIPC };
