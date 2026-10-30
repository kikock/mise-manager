# Mise Manager

<div align="center">

<img src="build/icon.png" width="84" height="84" alt="Mise Manager Logo" />

### 🚀 mise 桌面开发环境与版本管理中心

一款专为 Windows 平台打造的现代原生多语言与工具链版本管理桌面应用。基于 **Tauri 2.x + Rust 异步原生底层 + Fluent Design** 架构，深度融合 Windows 11 设计美学，为 [mise](https://github.com/jdx/mise) 赋予极致轻量、极速响应的可视化操作体验。

[![Platform](https://img.shields.io/badge/Platform-Windows%2011%20%7C%2010-0078D4?logo=windows&logoColor=white)](https://github.com/jdx/mise)
[![Framework](https://img.shields.io/badge/Framework-Tauri%202.x-24C8DB?logo=tauri&logoColor=white)](https://tauri.app/)
[![Backend](https://img.shields.io/badge/Backend-Rust%202021-DEA584?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![UI Style](https://img.shields.io/badge/Design-Fluent%20Design%20System-005FB8)](https://developer.microsoft.com/fluentui)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[功能特性](#-功能特性) • [界面预览](#-界面预览) • [快速开始](#-快速开始) • [工作原理](#-工作原理与架构拓扑) • [常见问题](#-常见问题--faq) • [致谢与上游开源项目](#-致谢与上游开源项目) • [开源协议](#-开源协议)

</div>

---

## 📖 项目简介

在现代全栈开发中，开发者往往需要在不同的语言版本（如 Node.js 18/20/22、Python 3.10/3.12、Go、Rust、Java、Ruby 等）之间频繁切换。**mise**（前身为 rtx）凭借 Rust 带来的极致性能，成为了开发环境与版本管理领域的标杆工具。

**Mise Manager** 致力于降低 Windows 开发者使用 mise 的门槛，提供了一个极具现代感、无缝融合 Windows 11 视觉质感的原生图形化控制台。彻底摆脱传统 Electron 运行时的厚重与资源占用，基于 **Tauri 2.x 与 Rust 异步底层**，启动仅需百毫秒、常驻内存仅 ~35MB。无需记忆繁杂的 CLI 参数，即可在界面中轻松检索全网工具、一键切换版本、监控系统环境变量与维护本地工具链。

---

## 🖼️ 界面预览

### 1. 主页工作台 (Home Dashboard)
直观呈现本机 mise 运行时状态、版本就绪指标、数据存放路径与已安装主流开发工具快速概览。
![主页工作台](docs/screenshots/01-home.png)

### 2. 应用生态市场 (Tool Ecosystem Market)
实时对接官方 REST API，全量聚合 1000+ 开源工具生态，支持关键词检索、分类探查、多版本选择与一键后台静默安装。
![应用生态市场](docs/screenshots/02-market.png)

### 3. 已安装工具精细化管理 (Installed Tools)
清晰展示已安装语言和运行时的所有物理版本，支持 Global（全局默认）与 Local（项目独立）热切换与物理目录秒级直达。
![已安装工具管理](docs/screenshots/03-installed.png)

### 4. 路径配置与环境变量托管 (Settings & Environment)
绿色便携式设计，支持自定义数据目录与 Shims 路径，内置注册表引擎一键将 Shims 垫片安全注入 Windows 用户环境变量。
![系统设置与环境变量托管](docs/screenshots/04-settings.png)

### 5. 极速版本发布日志与多主题适配
内置 GitHub Releases 秒级缓存与更新探查弹窗；原生深度适配 Windows 11 Fluent 深色 / 浅色模式无缝切换。

| 历史版本发行与安装包直达 | Fluent 浅色模式界面 |
| :---: | :---: |
| <img src="docs/screenshots/05-releases-modal.png" width="100%" alt="历史发行版本" /> | <img src="docs/screenshots/06-home-light.png" width="100%" alt="浅色模式" /> |

---

## ✨ 核心亮点与对比

| 指标维度 | 原 Electron 架构 | Tauri 2.x + Rust 原生架构 (当前) | 优势提升 |
| :--- | :--- | :--- | :--- |
| **安装包体积** | ~85 MB | **~4 MB**（标准安装包） | 体积骤降 **95%** |
| **常驻内存 (RAM)** | 140 ~ 180 MB | **~35 MB** | 内存占用降低 **80%** |
| **冷启动耗时** | 1.8 ~ 2.5 秒 | **< 200 毫秒** | 启动速度提升 **10 倍** |
| **底层通信机制** | Node.js IPC 进程间序列化 | **Rust 原生 invoke 管道 + 流式事件总线** | 零拷贝传输，高吞吐无卡顿 |
| **UI 视觉质感** | 网页模拟 Fluent | **系统原生 WebView2 + Mica/亚克力半透明光效** | 原生深浅主题自适应 |

---

## ✨ 功能特性

- 🎨 **原生 Windows 11 视觉盛宴**
  - 严格遵循 Fluent Design 设计规范，拥有 Mica（云母）/ 亚克力半透明光效与细腻的微动效。
  - 完美适配系统自定义深色/浅色模式无缝切换与沉浸式无边框标题栏。
  - 安装向导全流程简体中文适配，集成 Fluent 风格品牌侧边图与高保真全尺寸安装包图标。
- 🦀 **Tauri 2.x + Rust 异步原生核心**
  - 采用 Rust 异步子进程与非阻塞管道执行 CLI 交互，安装输出毫秒级推流至前端抽屉终端，彻底杜绝界面卡顿。
  - 常驻内存仅 ~35MB，冷启动 < 200ms，安装包仅 ~4MB，性能提升数倍。
- 🏪 **丰富的工具版本生态市场**
  - 对接 [mise-versions](https://github.com/jdx/mise-versions) 官方数据源与 REST API，涵盖数百种主流语言、运行时和 CLI 工具。
  - 支持关键词模糊检索、分类筛选与历史版本探查，一键触发后台静默安装与版本部署。
- 📦 **已安装工具精细化管理与交互模态矩阵**
  - 集中监控本机所有通过 mise 管理的工具版本状态。
  - 配备版本安装、安全卸载确认与自定义 mise 探测模态框，操作反馈配合全局 Toast 气泡瞬时直达。
  - 支持一键激活版本（Global / Local）、版本热切换、快速定位本地物理安装目录及安全卸载。
- 🪟 **窗口生命周期管理与托盘常驻策略**
  - 贴合专业桌面工具规范，提供“最小化到系统托盘”与“直接退出应用”两种关闭策略，支持记忆偏好与随时修改。
  - Rust 核心拦截系统关闭事件，托盘支持一键恢复窗口与快捷退出。
- ⚙️ **模块化卡片式设置与环境变量托管**
  - 彻底模块化拆解为 7 大高内聚配置卡片（运行时、路径、环境、窗口、终端、代理/主题、关于）。
  - 自定义 `MISE_DATA_DIR`（数据安装根目录）与 `MISE_BIN_DIR`（Shims 二进制目录），支持便携移动盘与特定盘符部署。
  - 内置环境检测与 Windows 注册表一键写入，告别繁复的手工编辑系统 PATH 环节。

---

## 🚀 快速开始

### 开发环境依赖

- **操作系统**：Windows 10 / Windows 11（推荐 64 位）
- **Node.js**：`>= 18.0.0`（推荐 Node 20/22）
- **Rust Toolchain**：`stable-x86_64-pc-windows-msvc`（安装有 `cargo` 与 `rustc`）
- **Webview2**：Windows 10/11 系统内置运行时

### 安装与运行

1. **克隆或拉取仓库源码**：
   ```powershell
   git clone https://github.com/kikock/mise-manager.git
   cd mise-manager
   ```

2. **安装前端依赖**：
   ```powershell
   npm install
   ```

3. **极速启动热更新调试**：
   - 方式一：双击根目录的 `启动热更新开发环境.bat`
   - 方式二：在终端执行：
     ```powershell
     npm run start
     ```
     （该命令将同时启动 Vite 前端服务与 Tauri 2.x Rust 桌面窗口）

4. **单前端界面独立预览 (浏览器模式)**：
   - 双击 `run-web.bat` 或执行 `npm run dev`

5. **编译正式生产安装包**：
   ```powershell
   # 1. 执行静态架构规范量化校验
   npm run check:standards

   # 2. 编译轻量标准版 (NSIS / 便携单文件)
   npm run build:app

   # 3. 编译内嵌 WebView2 的纯离线完整版
   npm run build:offline
   ```

---

## 🛠️ 工作原理与架构拓扑

Mise Manager 充当了桌面可视化层与底层原生执行层之间的桥梁：

```mermaid
graph TD
    subgraph UI_Layer["前端展现与交互层 (React 18 + Vite + TypeScript + Fluent Design)"]
        A1[主页工作台 Home Dashboard]
        A2[应用生态市场 Tool Market]
        A3[已安装管理 Installed Tools]
        A4[模块化设置中心 Settings Cards<br/>运行时/路径/环境/窗口/终端/主题/关于]
        A5[模态交互矩阵 Modals & Toast<br/>关闭策略/版本安装/安全卸载/路径选择]
    end

    subgraph Bridge["Tauri 2.x 安全通信通道 (IPC Invoke & Event Emitter)"]
        B1["invoke('mise_exec') / invoke('mise_abort_exec')"]
        B2["invoke('get_app_config') / invoke('save_app_config')"]
        B3["invoke('open_folder_dialog') 原生目录选择"]
        B4["invoke('mise_list_installed') / invoke('mise_use_tool')"]
        B5["window.listen('mise-stream-stdout / stderr') 实时推流"]
    end

    subgraph Rust_Core["Tauri 2.x 原生 Rust 内核 (src-tauri)"]
        C1[MiseRunner 异步子进程调度引擎<br/>tokio::process::Command 非阻塞流]
        C2[Windows 注册表与系统环境管理器<br/>winreg 用户环境变量安全写入]
        C3[全局系统托盘与生命周期拦截<br/>tauri::tray::TrayIconBuilder + on_window_event]
        C4[系统对话框与原生 Shell 调用<br/>rfd / tauri_plugin_shell]
    end

    subgraph OS_Layer["操作系统与文件系统层"]
        D1[原生 mise CLI 可执行文件 (mise.exe)]
        D2[本地运行时存储库 (MISE_DATA_DIR)]
        D3[环境垫片目录 (MISE_BIN_DIR/shims)]
        D4[Windows 用户注册表 Path 项]
    end

    UI_Layer <--> Bridge <--> Rust_Core
    Rust_Core <--> D1 & D2 & D3 & D4
```

- **数据根目录 (`MISE_DATA_DIR`)**：存放所下载的各类语言包与 SDK，默认隔离于用户数据目录中，亦可在设置面板重定向至大容量磁盘。
- **Shims 目录 (`MISE_BIN_DIR`)**：存放垫片执行文件，保证通过系统命令行唤起工具时始终无缝调用所激活的版本。

---

## ❓ 常见问题 (FAQ)

### Q1: 下载新版本安装包，直接覆盖安装就算更新了吗？会不会丢失数据？
**答：是的，直接覆盖安装即可完成完整升级，且绝对不会丢失任何已有数据。**
- **程序文件替换**：安装包（NSIS）具有统一的应用程序 GUID，在安装时会自动检测既有安装路径并更新核心程序；
- **配置与数据隔离**：软件配置位于系统用户目录（`%APPDATA%\mise-manager\`），而下载的各类语言版本（Node.js、Python、Go 等）均安全存放于数据根目录（`MISE_DATA_DIR`），与主程序本体完全解耦，覆盖升级过程安全无痛。

### Q2: 首次在 Windows 10/11 上运行提示“Windows 已保护你的电脑 / 未知发布者”怎么办？
**答：这是未申请昂贵商业代码签名证书的开源软件在 Windows SmartScreen 机制下的正常表现，请放心使用。**
- **秒级放行**：在拦截弹窗中点击 **「更多信息」 (More info)**，紧接着点击右下角浮现的 **「仍要运行」 (Run anyway)** 即可正常打开。系统在初次允许后将记忆授权，后续启动不再提示；
- **备选方案**：鼠标右键点击安装包或 exe -> **「属性」** -> 在常规选项卡右下方勾选 **「解除锁定」 (Unblock)** -> 点击确定。

### Q3: 点击右上角关闭按钮后，为什么程序仍在后台托盘运行？如何彻底退出？
**答：这是为了保证后台工具链下载与快速唤醒的桌面端标准设计。**
- **关闭策略自定义**：首次关闭时会弹出「关闭行为」对话框，支持选择 **「最小化到系统托盘」** 或 **「直接退出程序」**，并支持勾选“记住我的选择”；
- **随时更改偏好**：可前往 **「设置」 -> 「窗口与系统托盘」** 卡片，随时切换关闭动作（询问 / 最小化托盘 / 退出应用）；
- **极低常驻开销**：Tauri 2.x 极度轻量，即使常驻托盘，内存仅占用 ~35MB，CPU 占用率为 0%，几乎不消耗系统资源；
- **托盘快速退出**：在任务栏右下角找到 Mise Manager 图标，鼠标右键点击并选择 **「退出」**，即可立即彻底退出程序。

---

## 🤝 致谢与上游开源项目

本项目深度依托并致敬以下优秀的开源项目与创作者：

- **[mise (by @jdx)](https://github.com/jdx/mise)**
  > *The front-end to your dev environment.*  
  用 Rust 打造的高性能、跨语言开发工具多版本管理器与任务运行器。Mise Manager 的底层运行逻辑与安装能力全部依托于 mise 原生内核。
  - 官方文档：[mise.jdx.dev](https://mise.jdx.dev)
  - GitHub 仓库：[https://github.com/jdx/mise](https://github.com/jdx/mise)

- **[mise-versions (by @jdx)](https://github.com/jdx/mise-versions)**
  > *Index of all tools and versions supported by mise.*  
  mise 官方维护的全量工具生态及其可用版本的元数据索引服务。本项目应用市场中的海量工具清单、版本元数据与检索体验均得益于此项目及其开放的在线接口服务。
  - 在线市场：[mise-versions.jdx.dev](https://mise-versions.jdx.dev)
  - GitHub 仓库：[https://github.com/jdx/mise-versions](https://github.com/jdx/mise-versions)

---

## 📄 开源协议

本项目基于 [MIT 协议](LICENSE) 开源，欢迎提交 Issue 与 Pull Request 共同构建更优质的 Windows 开发者工具生态！
