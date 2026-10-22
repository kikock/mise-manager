# 🚀 mise-manager v__VERSION__ 正式发布

> **Mise Manager** 是一款专为 Windows 11 设计的现代化 Fluent Design 开发环境与工具版本管理器。基于 `mise` 核心运行时，提供多版本自由切换、官方应用生态市场、绿色目录管理与环境变量一键注入。

---

### ✨ 核心功能亮点

- 🎨 **Windows 11 Fluent 视觉美学**：采用原生毛玻璃（Mica）质感与现代控件，完美支持**深色 / 浅色 / 跟随系统**一键无缝切换。
- ⚡ **零白屏秒开引擎**：集成 SWR 快照瞬时呈现与本地原生进程调度，优化启动链路，打开即用、流畅丝滑。
- 📦 **工具多版本全量管理**：全量扫描已安装的开发工具（Node.js、Python、Go、Rust、Java 等），支持多版本共存与一键激活 (`mise use`)。
- 🏪 **官方应用生态市场**：无缝对接官方 `mise-versions` 全量数据，支持分页拉取、离线持久化缓存与关键词毫秒级搜索。
- ⚙️ **统一绿色架构与环境注入**：支持自定义主目录（`MISE_DATA_DIR`），自动管理 `shims` 与 `bin`，一键注入系统环境变量 `PATH`，卸载无残留。
- 🔍 **客户端在线升级检测**：内置自动化版本检测通道，直通 GitHub Release，第一时间获取最新更新。

---

### 📥 资产安装指南

| 安装程序 / 格式 | 适用系统 | 架构 | 说明 |
| :--- | :--- | :--- | :--- |
| **`mise-manager-setup-__VERSION__.exe`** | Windows 10 / 11 | `x64` | **官方标准安装包**（向导式安装，带快捷方式与卸载程序） |
| **`mise-manager-portable-__VERSION__.exe`** | Windows 10 / 11 | `x64` | **单文件免安装便携版**（双击即用，不写注册表，U 盘即插即用） |
| **`mise-manager-__VERSION__-win-x64.zip`** | Windows 10 / 11 | `x64` | **绿色免安装压缩包**（解压到任意目录直接运行） |

#### 快速开始：
1. **安装版用户**：下载 `mise-manager-setup-__VERSION__.exe`，运行向导完成安装；
2. **便携版用户**：下载 `mise-manager-portable-__VERSION__.exe` 或解压 `.zip` 压缩包，直接双击运行即可；
3. 首次启动可在首页点击 **“立即安装 mise”** 一键初始化开发环境！

---

### 🔗 相关链接
- 📖 **项目主页**：[kikock/mise-manager](https://github.com/kikock/mise-manager)
- 🐛 **问题反馈**：[提交 Issue](https://github.com/kikock/mise-manager/issues)
- 🌐 **mise 官方文档**：[https://mise.jdx.dev](https://mise.jdx.dev)
