# mise-manager 项目级开发规范与最高准则 (rules.md)

## 1. 核心架构与技术栈约束
- **主框架**：Tauri 2.x (x64) + Rust 异步原生底层 + Vite/React 18 + Fluent Design 设计系统。
- **发布双轨制**：必须同时提供轻量便携版（使用系统 WebView2）与含离线安装器的完整版（保证无 WebView2 亦可离线自愈运行）。
- **工作流与审查规范**：必须强制遵守 [.agents/workflows/code-review-standards.md](file:///.agents/workflows/code-review-standards.md) 中的全部量化指标。

## 2. 核心量化指标红线
1. **代码规模**：单文件行数 `<= 300` 行（硬上限 `<= 500` 行）；单函数 `<= 30` 行（硬上限 `<= 50` 行）。
2. **圈复杂度**：`<= 5`，避免深层条件嵌套。
3. **IPC 性能与流式规范**：
   - mise CLI 交互与版本扫描必须通过 `child_process.spawn` 流式管道回传。
   - 渲染进程严禁同步 I/O。
   - IPC 单次通讯耗时 `<= 16ms`，单数据块 Chunk `<= 64KB`。
4. **Fluent Design 视觉**：
   - 按钮/输入框圆角 `4px`，卡片/模态窗圆角 `8px`。
   - 动效过渡时长 `<= 200ms`，缓动采用 `cubic-bezier(0.1, 0.9, 0.2, 1.0)`。
   - 文本对比度 `>= 4.5:1`。
