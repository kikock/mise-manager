---
description: mise-manager 代码审查与架构量化约束 (Electron 32 + 流式子进程 + Fluent Design)
---

# mise-manager 核心量化指标与架构约束规范

## 1. 核心量化代码指标 (Quantitative Code Constraints)

- **单文件长度 (File Length)**：推荐 `<= 300` 行，硬性上限 `<= 500` 行。超过 500 行必须重构分模块。
- **单函数长度 (Function Length)**：推荐 `<= 30` 行，硬性上限 `<= 50` 行。
- **单文件核心处理函数 (Functions per File)**：`<= 5` 个核心业务/IPC 处理函数，辅助工具函数移入 `utils/`。
- **圈复杂度 (Cyclomatic Complexity)**：`<= 5`，严禁深层嵌套分支与复杂三元链。
- **IPC 接口参数 (IPC Interface Parameters)**：`<= 3` 个统一封装的 Payload 对象，严禁散装长参数。

---

## 2. 架构边界与工程底线 (Architecture Boundaries)

### 2.1 Electron 32 与 Node.js 异步流式子进程
- **I/O 隔离原则**：所有 mise CLI 执行、版本扫描、耗时命令必须交由 Node.js 异步子进程（`child_process.spawn`）通过流式管道（Stream Pipeline）处理。
- **主线程非阻塞**：渲染主进程（Renderer）严禁调用任何同步阻塞操作或同步文件 I/O。
- **流背压与分块控制**：
  - 单次传输数据块 Chunk 体积推荐 `<= 64KB`。
  - 必须实施流背压（Backpressure）机制，防止海量控制台输出直接塞爆渲染层。
- **IPC 通信开销**：单次 IPC 通信耗时 `<= 16ms`（保障 60FPS 流畅），禁止跨进程传递循环引用或超过 10MB 的非分片大对象。

### 2.2 Fluent Design 视觉设计规范（量化指标）
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
