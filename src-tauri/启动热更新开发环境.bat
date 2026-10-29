@echo off
chcp 65001 >nul
echo [Mise Manager] 正在以热更新模式启动 Tauri 开发环境...
cd /d "%~dp0.."
npm run start
pause
