use tauri::{command, AppHandle, State};
use std::sync::Arc;
use crate::common::error::AppResult;
use crate::mise::model::{ExecOutput, InstalledTool, PluginMarketItem};
use crate::mise::MiseRunner;

pub type SharedRunner = Arc<MiseRunner>;

#[command]
pub async fn mise_exec(
    app: AppHandle,
    runner: State<'_, SharedRunner>,
    args: Vec<String>,
) -> AppResult<ExecOutput> {
    runner.run_stream(Some(&app), &args).await
}

#[command]
pub async fn mise_abort_exec(runner: State<'_, SharedRunner>) -> AppResult<()> {
    runner.abort_current()
}

#[command]
pub async fn mise_list_installed(runner: State<'_, SharedRunner>) -> AppResult<Vec<InstalledTool>> {
    runner.list_installed().await
}

#[command]
pub async fn mise_use_tool(
    app: AppHandle,
    runner: State<'_, SharedRunner>,
    tool: String,
    version: String,
    is_global: bool,
) -> AppResult<ExecOutput> {
    let mut args = vec!["use".to_string()];
    if is_global {
        args.push("-g".to_string());
    }
    args.push(format!("{}@{}", tool, version));
    runner.run_stream(Some(&app), &args).await
}

#[command]
pub async fn mise_uninstall_tool(
    app: AppHandle,
    runner: State<'_, SharedRunner>,
    tool: String,
    version: String,
) -> AppResult<ExecOutput> {
    let args = vec![
        "uninstall".to_string(),
        format!("{}@{}", tool, version),
    ];
    runner.run_stream(Some(&app), &args).await
}

#[command]
pub async fn mise_install_tool(
    app: AppHandle,
    runner: State<'_, SharedRunner>,
    tool: String,
    version: Option<String>,
) -> AppResult<ExecOutput> {
    let target = match version {
        Some(v) if !v.trim().is_empty() => format!("{}@{}", tool, v),
        _ => tool,
    };
    let args = vec!["install".to_string(), target];
    runner.run_stream(Some(&app), &args).await
}

#[command]
pub async fn mise_get_market_plugins(
    runner: State<'_, SharedRunner>,
) -> AppResult<Vec<PluginMarketItem>> {
    let installed = runner.list_installed().await.unwrap_or_default();

    let popular_tools = vec![
        ("node", "编程语言", "JavaScript 跨平台运行环境，含 NPM", "https://github.com/nodejs/node"),
        ("python", "编程语言", "高级解释型编程语言，AI与数据科学利器", "https://github.com/python/cpython"),
        ("go", "编程语言", "高性能并发编程语言，云原生开发标配", "https://github.com/golang/go"),
        ("rust", "编程语言", "内存安全、零成本抽象的现代系统编程语言", "https://github.com/rust-lang/rust"),
        ("java", "编程语言", "广泛的企业级开发语言与 JVM 运行时", "https://github.com/openjdk/jdk"),
        ("deno", "编程语言", "新一代安全、快速的 TS/JS 运行时", "https://github.com/denoland/deno"),
        ("bun", "编程语言", "超极速的 JavaScript All-in-one 运行时", "https://github.com/oven-sh/bun"),
        ("zig", "编程语言", "注重健壮性、最优性与可维护性的系统编程语言", "https://github.com/ziglang/zig"),
        ("ruby", "编程语言", "简洁优美、面向对象的动态脚本语言", "https://github.com/ruby/ruby"),
        ("php", "编程语言", "流行的通用服务器端脚本语言", "https://github.com/php/php-src"),
        ("pnpm", "包管理器", "快速、节省磁盘空间的 Node.js 现代包管理器", "https://github.com/pnpm/pnpm"),
        ("yarn", "包管理器", "快速、可靠、安全的 Node.js 依赖管理工具", "https://github.com/yarnpkg/berry"),
        ("maven", "构建工具", "Java 项目依赖与构建生命周期管理标准", "https://github.com/apache/maven"),
        ("gradle", "构建工具", "基于 Groovy/Kotlin DSL 的企业级构建工具", "https://github.com/gradle/gradle"),
        ("neovim", "开发者工具", "可扩展的高性能 Vim 现代分支编辑器", "https://github.com/neovim/neovim"),
        ("ripgrep", "CLI工具", "超极速的现代递归代码行搜索工具 rg", "https://github.com/BurntSushi/ripgrep"),
        ("fd", "CLI工具", "简单、快速且用户友好的 find 替代品", "https://github.com/sharkdp/fd"),
        ("bat", "CLI工具", "带语法高亮与 Git 集成的 cat 增强工具", "https://github.com/sharkdp/bat"),
    ];

    let mut result = Vec::new();
    for (name, cat, desc, repo) in popular_tools {
        let is_inst = installed.iter().any(|t| t.name.eq_ignore_ascii_case(name));
        let inst_ver = installed.iter().find(|t| t.name.eq_ignore_ascii_case(name)).map(|t| t.version.clone());
        result.push(PluginMarketItem {
            name: name.to_string(),
            category: cat.to_string(),
            description: desc.to_string(),
            repository: repo.to_string(),
            is_installed: is_inst,
            installed_version: inst_ver,
            popular: true,
        });
    }

    Ok(result)
}
