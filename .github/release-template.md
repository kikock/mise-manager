# 🚀 mise-manager v__VERSION__ 正式发布 (Tauri 2.x + Rust 原生重构)

> **Mise Manager** 是一款专为 Windows 11 设计的现代原生版本管理器桌面应用。底层由 **Tauri 2.x + Rust 异步子进程** 驱动，搭配 **Fluent Design** 视觉美学。提供极速冷启、多环境实时切换、官方生态市场与环境变量一键注入。

---

### ✨ 架构升级亮点 (v2.0.0)

- 🦀 **Tauri 2.x + Rust 异步原生底层**：彻底摆脱 Electron 笨重运行时，内存占用骤降 80%（~40MB），启动速度由秒级跃升为百毫秒瞬时直出。
- 🎨 **Windows 11 Fluent 现代美学**：采用 Mica/亚克力质感卡片、深浅色无缝自适应主题、平滑过渡动画与自制 ConfirmModal 弹窗体系。
- 📦 **双轨离线打包保证**：提供**轻量标准版**（~15MB）与**内嵌 WebView2 离线完整版**，即使在完全无网络的纯净离线机器上也能自愈静默安装运行！
- ⚡ **流式实时命令管道**：安装大体量运行时与编译下载进度通过 Rust 管道实时推流至前端抽屉终端，杜绝白屏与卡死假死。
- 🛡️ **纯绿色便携隔离**：数据与运行时跟随软件目录便携移动，或一键将 `shims` 注入 Windows 用户注册表环境变量。

---

### 📥 资产安装版本指南

| 安装程序 / 格式 | 体积 | 适用场景 | 说明 |
| :--- | :--- | :--- | :--- |
| **`mise-manager-setup-__VERSION__.exe`** | 约 15 MB | 个人电脑 / 联网环境 | **官方轻量推荐版**（使用系统已有的 WebView2 运行时，体积极轻量） |
| **`mise-manager-full-offline-setup-__VERSION__.exe`** | 约 150 MB | 纯净离线机 / 涉密内网 | **含 WebView2 离线完整版**（内嵌微软官方离线安装包，无网络纯净环境 100% 自动安装） |
| **`mise-manager-portable-__VERSION__.exe`** | 约 10 MB | 移动 U 盘 / 绿色便携 | **单文件免安装版**（免安装即点即用，不写系统注册表） |
| **`mise-manager-__VERSION__-win-x64.zip`** | 约 10 MB | 自动化脚本 / 解压即用 | **绿色免安装压缩包** |

---

### 快速开始：
1. **常规用户推荐**：直接下载 `mise-manager-setup-__VERSION__.exe` 安装运行；
2. **纯净离线 / 内网无网用户**：下载 `mise-manager-full-offline-setup-__VERSION__.exe`，安装程序会自动静默部署 WebView2 运行环境，开箱即用；
3. **便携用户**：下载 `mise-manager-portable-__VERSION__.exe` 随身携带运行！

---

### 🔗 相关链接
- 📖 **项目仓库**：[kikock/mise-manager](https://github.com/kikock/mise-manager)
- 🐛 **问题与建议**：[提交 Issue](https://github.com/kikock/mise-manager/issues)
- 🌐 **mise 官方文档**：[https://mise.jdx.dev](https://mise.jdx.dev)
