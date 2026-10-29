# 🚀 Mise Manager v__VERSION__ 正式发布 (Tauri 2.x + Rust 原生重构)

> **Mise Manager** 是一款专为 Windows 10/11 平台打造的现代原生多语言与工具链版本治理桌面中心。底层全面由 **Tauri 2.x + Rust 异步原生底层 + Fluent Design** 驱动，提供极速冷启、多环境实时无缝切换、官方生态市场插件库一键安装、Shims 环境变量托管与毫秒级流式控制台。

---

### ✨ 核心功能亮点

- 🎨 **Windows 11 Fluent 现代美学**：深度契合微软 Fluent Design 视觉语言，采用 Mica（云母）/ 亚克力半透明光效、深浅色无缝自适应主题、沉浸式标题栏与平滑微动效。
- 🦀 **Tauri 2.x + Rust 异步流式管道**：彻底告别 Electron 笨重运行时，常驻内存骤降 80%（~35MB），冷启百毫秒直出；安装大体积运行时由 Rust 异步进程实时推流至抽屉终端，杜绝界面卡死。
- ⚡ **多语言与工具链全景纳管**：极速扫描与纳管 Node.js、Python、Go、Rust、Java、Ruby 等全量开发语言环境，支持 Global（全局默认）与 Local（局部项目）一键热切换。
- 🏪 **聚合官方 1000+ 开源工具生态市场**：实时同步官方 mise-versions 索引库，支持关键词模糊检索、分类探查、多版本选择与一键后台静默安装。
- 🛡️ **纯绿色便携隔离与 Shims 纳管**：自定义 `MISE_DATA_DIR` 与 `MISE_BIN_DIR`，支持随移动盘即插即用；内置系统环境探针与一键注入 Windows 用户注册表环境变量，无缝联动 VS Code、Cursor 及各类终端。

---

### 📥 资产安装指南

| 安装程序 / 格式 | 适用系统 | 架构 | 体积 | 适用场景 | 说明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`mise-manager-setup-__VERSION__-full-offline-x64.exe`** | Windows 10 / 11 | `x64` | **~150 MB** | **内网隔离机 / 纯离线环境 / 无 WebView2 系统** | **含 WebView2 离线完整版**（内置微软官方离线安装包，无网络或无 WebView2 环境 100% 自动静默安装可用） |
| **`mise-manager-setup-__VERSION__-x64.exe`** | Windows 10 / 11 | `x64` | **~4 MB** | **日常标准联网电脑（推荐大多数用户首选）** | **官方标准安装包**（向导式安装，体积轻巧，带桌面/开始菜单快捷方式与卸载程序） |
| **`mise-manager-portable-__VERSION__-x64.exe`** | Windows 10 / 11 | `x64` | **~4 MB** | **U 盘随身携带 / 即插即用 / 临时检修调试** | **单文件免安装便携版**（双击即用，不写注册表，U 盘即插即用） |
| **`mise-manager-__VERSION__-win-x64.zip`** | Windows 10 / 11 | `x64` | **~2 MB** | **自动化脚本分发 / 自定义工具目录 / CI 归档** | **绿色免安装压缩包**（解压到任意目录直接运行） |

#### 💡 资产选型指南与快速上手：
1. **纯离线机 / 内网隔离环境**：首选 **`mise-manager-setup-__VERSION__-full-offline-x64.exe`**，已内置微软官方离线安装包，无网络或无 WebView2 环境 100% 自动静默安装可用；
2. **常规联网电脑**：推荐下载 **`mise-manager-setup-__VERSION__-x64.exe`**，仅 ~4MB 极致轻盈，运行向导即可一键完成安装；
3. **免安装与便携运行**：可直接下载 **`mise-manager-portable-__VERSION__-x64.exe`** 单文件版，或下载 **`.zip`** 压缩包解压后直接双击运行！

---

### 🔗 相关链接
- 📖 **项目主页**：[kikock/mise-manager](https://github.com/kikock/mise-manager)
- 🐛 **问题反馈**：[提交 Issue](https://github.com/kikock/mise-manager/issues)
- 📝 **更新日志**：[CHANGELOG.md](https://github.com/kikock/mise-manager/blob/main/CHANGELOG.md)
- 🌐 **mise 官方文档**：[https://mise.jdx.dev](https://mise.jdx.dev)
