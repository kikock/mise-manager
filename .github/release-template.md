# 🚀 mise-manager v__VERSION__ 正式发布 (Tauri 2.x + Rust 原生重构)

> **Mise Manager** 是一款专为 Windows 11 设计的现代原生版本管理器桌面应用。底层由 **Tauri 2.x + Rust 异步子进程** 驱动，搭配 **Fluent Design** 视觉美学。提供极速冷启、多环境实时切换、官方生态市场与环境变量一键注入。

---

### ✨ 架构升级亮点 (v2.0.0)

- 🦀 **Tauri 2.x + Rust 异步原生底层**：彻底摆脱 Electron 笨重运行时，内存占用骤降 80%（~40MB），启动速度由秒级跃升为百毫秒瞬时直出。
- 🎨 **Windows 11 Fluent 现代美学**：采用 Mica/亚克力质感卡片、深浅色无缝自适应主题、平滑过渡动画与自制 ConfirmModal 弹窗体系。
- 📦 **三大官方发布版本矩阵**：提供**轻量绿色便携版**、**轻量安装版**与**离线完整安装版**，满足个人办公、移动便携、纯离线无网机房等全场景需求！
- ⚡ **流式实时命令管道**：安装大体量运行时与编译下载进度通过 Rust 管道实时推流至前端抽屉终端，杜绝白屏与卡死假死。
- 🛡️ **纯绿色便携隔离**：数据与运行时跟随软件目录便携移动，或一键将 `shims` 注入 Windows 用户注册表环境变量。

---

### 📥 官方三大发布版本下载指南

| 发行版本 | 交付产物 | 体积 | 适用场景 | 说明 |
| :--- | :--- | :---: | :--- | :--- |
| **1. 轻量绿色便携版** | **`mise-manager-portable-__VERSION__.exe`**<br>`mise-manager-__VERSION__-win-x64.zip` | 约 10 MB | 移动 U 盘 / 绿色免安装 / 自动化脚本 | **单文件免安装版**（免安装即点即用，纯绿色隔离，不写系统注册表，使用系统已有 WebView2） |
| **2. 轻量安装版** | **`mise-manager-setup-__VERSION__.exe`**<br>`mise-manager-__VERSION__.msi` | 约 15 MB | 个人电脑 / 常规联网 Windows 10/11 | **官方标准安装包**（向导式安装，带快捷方式与卸载程序，使用系统已有 WebView2） |
| **3. 离线完整安装版** | **`mise-manager-full-offline-setup-__VERSION__.exe`** | 约 150 MB | 纯净离线机房 / 涉密内网 / 精简版系统 | **含 WebView2 离线完整版**（内置微软官方离线安装包，无网络或无 WebView2 环境 100% 自动静默安装可用） |

---

### 快速开始：
1. **轻量便携用户**：下载 `mise-manager-portable-__VERSION__.exe`，双击直接运行；
2. **常规安装用户**：下载 `mise-manager-setup-__VERSION__.exe`，按向导一键安装；
3. **纯净离线 / 内网无网用户**：下载 `mise-manager-full-offline-setup-__VERSION__.exe`，安装程序会自动静默部署 WebView2 运行环境，开箱即用！

---

### 🔗 相关链接
- 📖 **项目仓库**：[kikock/mise-manager](https://github.com/kikock/mise-manager)
- 🐛 **问题与建议**：[提交 Issue](https://github.com/kikock/mise-manager/issues)
- 🌐 **mise 官方文档**：[https://mise.jdx.dev](https://mise.jdx.dev)
