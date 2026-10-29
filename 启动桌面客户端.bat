@echo off
chcp 65001 >nul
echo [Mise Manager] 正在启动 mise 开发环境与版本管理桌面客户端...

:: 1. 检查根目录发布产物
if exist "%~dp0mise-manager.exe" (
    start "" "%~dp0mise-manager.exe"
    exit
)
if exist "%~dp0MiseManager.exe" (
    start "" "%~dp0MiseManager.exe"
    exit
)

:: 2. 检查 Release 编译产物
if exist "%~dp0src-tauri\target\release\mise-manager.exe" (
    start "" "%~dp0src-tauri\target\release\mise-manager.exe"
    exit
)

:: 3. 检查 Debug 编译产物
if exist "%~dp0src-tauri\target\debug\mise-manager.exe" (
    start "" "%~dp0src-tauri\target\debug\mise-manager.exe"
    exit
)

echo.
echo [提示] 未检测到已编译的桌面客户端可执行程序！
echo 请先运行 "npm run build:app" 编译生产版，或运行 "启动热更新开发环境.bat" 进入开发调试模式。
echo.
pause
