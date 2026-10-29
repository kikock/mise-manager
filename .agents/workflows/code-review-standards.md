---
description: mise-manager 代码审查与架构量化约束 (Tauri 2.x + Rust 异步原生底层 + Fluent Design)
---

# mise-manager 核心量化指标与架构约束规范

## 1. 核心量化代码指标 (Quantitative Code Constraints)

- **单文件长度 (File Length)**：推荐 `<= 300` 行，硬性上限 `<= 500` 行。超过 500 行必须重构分模块。
- **单函数长度 (Function Length)**：推荐 `<= 30` 行，硬性上限 `<= 50` 行。
- **单文件核心处理函数 (Functions per File)**：`<= 5` 个核心业务/命令处理函数，辅助工具函数移入独立工具模块。
- **圈复杂度 (Cyclomatic Complexity)**：`<= 5`，严禁深层嵌套分支与复杂多层三元表达式。
- **IPC 接口参数 (IPC Interface Parameters)**：`<= 3` 个统一封装的 Payload 对象，严禁散装长参数。

---

## 2. 架构边界与工程底线 (Architecture Boundaries)

### 2.1 Tauri 2.x 与 Rust 原生底层约束
- **并发与扫描隔离**：
  - 所有耗时 CLI 操作（如 `mise install`、`mise ls-remote`、全量版本扫描）必须由 Rust 原生底层通过 `tokio::process::Command` 异步管道非阻塞执行。
  - 前端 React/TypeScript 层仅作为纯净无状态/展示层，严禁在前端主线程进行大文件同步 I/O。
- **安全与错误传播 (Zero Unwrap)**：
  - 严禁在生产 Rust 代码中使用未捕获处理的 `.unwrap()` 或 `.expect()`。
  - 所有文件 I/O、进程执行与注册表写入必须通过 `Result<T, AppError>` 进行严格类型传播并序列化抛回前端。
- **事件流控与反压**：
  - 命令标准输出推流事件频率必须进行合理缓冲（Buffer Chunk `<= 64KB`），禁止单字节反复触发前端事件导致 WebView2 渲染管线假死。
- **性能基准红线**：
  - 内存基线：空闲常驻内存 `<= 50MB`（实际 ~35MB），大体积工具安装编译峰值内存 `<= 120MB`。
  - 冷启动耗时：窗体创建至首屏就绪 `<= 200ms`。

### 2.2 Tauri IPC 与流式管道规范
- **原生安全通信**：前端统一通过 `@tauri-apps/api/core` 的 `invoke` 机制调用 Rust 后端命令。
- **双向事件推流**：长时间运行任务（如编译器下载与源码编译），Rust 端使用 `app_handle.emit()` 实时推送 stdout/stderr 流，前端由 `listen()` 接入抽屉控制台。
- **IPC 通信开销**：单次 IPC 通信耗时 `<= 16ms`（保障 60FPS 流畅），禁止跨进程传递循环引用或超过 10MB 的非分片大对象。

### 2.3 Fluent Design 视觉设计规范（量化指标）
- **圆角网格 (Corner Radius)**：
  - 小控件（按钮、输入框、下拉框、标签）：`4px`。
  - 容器卡片、模态弹窗、浮动面板：`8px`。
  - 主应用外框：`8px` 或跟随 Windows 11 原生圆角。
- **深度与光影 (Elevation & Shadows)**：
  - 基础卡片采用柔和双层阴影（`0 2px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`）。
  - 浮层/模态框采用悬浮阴影（`0 8px 16px rgba(0,0,0,0.14), 0 2px 4px rgba(0,0,0,0.08)`）。
- **材质支持 (Materials)**：
  - 优先启用 Mica（云母）或 Acrylic（亚克力）半透明亚光质感。
  - 暗色与亮色模式必须遵循 Fluent 色彩系统，禁止纯黑色 `#000000` 作为背景，采用 `#202020` 或 `#2c2c2c`。
- **交互动效 (Micro-interactions)**：
  - 状态过渡动效时长 `<= 200ms`（推荐 `150ms`）。
  - 贝塞尔缓动曲线统一使用 Fluent 标准：`cubic-bezier(0.1, 0.9, 0.2, 1.0)`。
- **可访问性与对比度 (A11y)**：
  - 文本与背景对比度必须满足 WCAG AA 级标准（`>= 4.5:1`）。
