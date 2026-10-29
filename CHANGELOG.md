# 更新日志 (CHANGELOG)

本文档记录 **Mise Manager** 的所有版本迭代、特性演进与更新历史。
本项目的版本号严格遵循 [语义化版本规范 (SemVer)](https://semver.org/lang/zh-CN/)。

---

## [v2.0.1] - 2026-10-29

### 🚀 新增与工程优化 (Enhancements)
- **本地调试便捷批处理工具箱**：
  - 增加根目录与 `src-tauri` 目录下的 `启动热更新开发环境.bat`，双击一键同时启动 Vite 前端与 Tauri 桌面窗口；
  - 增加智能感知桌面客户端启动脚本 `启动桌面客户端.bat`，优先探测根目录免安装单文件，并支持探测 Release/Debug 编译产物；
  - 补充 `run-tauri.bat` 与 `run-web.bat`，全面对齐多端调试需求。
- **Release 说明与流水线标准化**：
  - 对标 `repo-rover` 高品质设计规范，全面升级 `.github/release-template.md`，构建全离线完整版、标准版、单文件便携版与绿色压缩包四大资产说明矩阵与选型指引；
  - 在 `.github/workflows/build-artifacts.yml` 中规范化产物收集命名规则并保持向前兼容。
- **全套工程与架构文档现代升级**：
  - 全面清理残留的旧版 Electron 32 与 Node.js 异步流式子进程说明，将全部 SRS、HLD、DLD、工作流规范升级为 **Tauri 2.x + Rust 异步原生底层 + Fluent Design** 标准体系。

---

## [v2.0.0] - 2026-10-29

### 🦀 里程碑重大架构跃迁 (Major Architecture Migration)
- **彻底告别 Electron 32，全面迁移至 Tauri 2.x + Rust 异步原生底层**：
  - **内存暴降 80%**：常驻内存从 150MB+ 骤降至 ~35MB；
  - **安装包体积缩减 95%**：官方标准安装包由 ~85MB 极致缩减至 ~4MB；
  - **冷启动提速 10 倍**：窗口创建至首屏就绪由 1.8 秒提升至 150 毫秒瞬时直出；
  - **零拷贝原生流式通道**：基于 Tokio 异步管道与 `tauri::Emitter`，安装编译日志实时推流至抽屉控制台，彻底杜绝假死。
- **基于 React 18 + Vite + TypeScript 现代化重构**：
  - 采用模块化组件与严格类型契约；
  - 深度集成 Windows 11 Mica（云母）/ 亚克力半透明材质与纯 CSS 变量驱动的深浅主题无缝切换；
  - 引入架构量化守门员检查机制（`check-standards.cjs`），严守代码与函数行数红线。
- **Windows 原生注册表安全接入**：
  - 废弃复杂的外部命令行包装，直接采用 Rust `winreg` 库调用 Win32 注册表 API 原子写入用户环境变量，杜绝 PATH 损坏。

---

## [v1.0.0] - 2026-10-29

### 🚀 初代发布 (Initial Release)
- 完成 mise 桌面版核心原型验证；
- 实现应用生态市场、已安装多版本管理与基本环境变量配置能力。
