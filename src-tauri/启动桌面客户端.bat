@echo off
chcp 65001 >nul
echo [Mise Manager] 正在启动客户端...
if exist "%~dp0target\release\mise-manager.exe" (
    start "" "%~dp0target\release\mise-manager.exe"
    exit
)
if exist "%~dp0..\mise-manager.exe" (
    start "" "%~dp0..\mise-manager.exe"
    exit
)
if exist "%~dp0target\debug\mise-manager.exe" (
    start "" "%~dp0target\debug\mise-manager.exe"
    exit
)
echo 未检测到可执行程序，请先运行 "npm run build:app" 编译。
pause
