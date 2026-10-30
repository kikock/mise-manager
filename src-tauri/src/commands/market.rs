use tauri::{command, AppHandle, State, Emitter};
use crate::common::error::{AppError, AppResult};
use crate::mise::model::{ExecOutput, MarketCacheInfo, PluginMarketItem};
use crate::mise::config::ConfigManager;
use crate::commands::mise::SharedRunner;

#[command]
pub async fn mise_get_market_cache_info() -> AppResult<MarketCacheInfo> {
    let cache_path = ConfigManager::get_app_dir().join("market_cache.json");
    if cache_path.exists() {
        if let Ok(metadata) = std::fs::metadata(&cache_path) {
            let updated_at = metadata.modified().ok().map(|time| {
                let datetime: chrono::DateTime<chrono::Local> = time.into();
                datetime.format("%Y/%m/%d %H:%M").to_string()
            });

            if let Ok(content) = std::fs::read_to_string(&cache_path) {
                if let Ok(list) = serde_json::from_str::<Vec<PluginMarketItem>>(&content) {
                    return Ok(MarketCacheInfo {
                        exists: true,
                        count: list.len(),
                        updated_at,
                    });
                }
            }
        }
    }

    Ok(MarketCacheInfo {
        exists: false,
        count: 0,
        updated_at: None,
    })
}

#[command]
pub async fn mise_clear_market_cache(app: AppHandle) -> AppResult<ExecOutput> {
    let log = |msg: &str| {
        let _ = app.emit("mise:stream", format!("{}\n", msg));
    };

    log("[INFO] 正在定位本地工具市场缓存文件 (market_cache.json)...");
    let cache_path = ConfigManager::get_app_dir().join("market_cache.json");
    if cache_path.exists() {
        if let Err(e) = std::fs::remove_file(&cache_path) {
            log(&format!("[ERROR] 删除本地市场缓存文件失败: {}", e));
            return Err(AppError::io(e));
        }
        log(&format!("[SUCCESS] 本地市场缓存文件已成功删除: {}", cache_path.display()));
        Ok(ExecOutput {
            success: true,
            output: "已成功删除本地市场缓存文件".to_string(),
            code: Some(0),
        })
    } else {
        log("[INFO] 本地当前无 market_cache.json 缓存文件，无需重复清除。");
        Ok(ExecOutput {
            success: true,
            output: "本地当前无缓存文件".to_string(),
            code: Some(0),
        })
    }
}

#[command]
pub async fn mise_clean_cache(
    app: AppHandle,
    runner: State<'_, SharedRunner>,
) -> AppResult<ExecOutput> {
    let _ = app.emit("mise:stream", "[INFO] 准备执行 mise 官方下载缓存清理...\n");
    let _ = app.emit("mise:stream", "[EXEC] 执行底层命令: mise cache clear\n");
    let res = runner.run_stream(Some(&app), &["cache".to_string(), "clear".to_string()]).await?;
    if res.success {
        let _ = app.emit("mise:stream", "[SUCCESS] mise 本地临时压缩包与下载缓存已成功清空，释放磁盘空间！\n");
    }
    Ok(res)
}

#[command]
pub async fn mise_sync_market_registry(
    app: AppHandle,
    runner: State<'_, SharedRunner>,
) -> AppResult<Vec<PluginMarketItem>> {
    let log = |msg: String| {
        let _ = app.emit("mise:stream", format!("{}\n", msg));
    };

    log("[INFO] 正在连接 mise 官方 Registry 并拉取工具市场最新列表...".to_string());
    log("[EXEC] 执行底层命令: mise registry --json".to_string());

    let installed = runner.list_installed().await.unwrap_or_default();
    let res = runner.run_stream(None, &["registry".to_string(), "--json".to_string()]).await?;

    if !res.success {
        log(format!("[ERROR] 拉取官方 Registry 失败: {}", res.output));
        return mise_get_market_plugins(runner).await;
    }

    log("[PROGRESS 30%] 成功接收官方 Registry 数据流，正在解析 JSON 结构...".to_string());

    #[derive(serde::Deserialize)]
    struct RawEntry {
        short: String,
        #[serde(default)]
        description: Option<String>,
        #[serde(default)]
        backends: Vec<String>,
    }

    let entries: Vec<RawEntry> = serde_json::from_str(&res.output).unwrap_or_default();
    let total = entries.len();
    log(format!("[PROGRESS 60%] 成功解析 {} 个工具条目，正在构建多维度分类与元数据...", total));

    let mut result = Vec::new();
    for item in entries {
        let name = item.short;
        let desc = item.description.unwrap_or_else(|| format!("{} development tool", name));
        let repo = item.backends.first().cloned().unwrap_or_else(|| format!("{}/{}", name, name));
        
        let desc_lower = desc.to_lowercase();
        let name_lower = name.to_lowercase();
        
        let category = if desc_lower.contains("language") || desc_lower.contains("compiler") || desc_lower.contains("runtime") || ["node", "python", "go", "rust", "java", "ruby", "php", "deno", "bun", "zig", "perl", "erlang", "elixir", "scala", "kotlin", "swift"].contains(&name_lower.as_str()) {
            "编程语言"
        } else if desc_lower.contains("package manager") || desc_lower.contains("package") || ["pnpm", "yarn", "npm", "pip", "uv", "cargo", "bundler", "composer", "gem"].contains(&name_lower.as_str()) {
            "包管理器"
        } else if desc_lower.contains("build") || desc_lower.contains("make") || ["gradle", "maven", "ant", "cmake", "ninja", "bazel", "meson"].contains(&name_lower.as_str()) {
            "构建工具"
        } else {
            "CLI工具"
        };

        let is_inst = installed.iter().any(|t| t.name.eq_ignore_ascii_case(&name));
        let inst_ver = installed.iter().find(|t| t.name.eq_ignore_ascii_case(&name)).map(|t| t.version.clone());

        result.push(PluginMarketItem {
            name,
            category: category.to_string(),
            description: desc,
            repository: repo,
            is_installed: is_inst,
            installed_version: inst_ver,
            popular: false,
            latest_version: Some("latest".to_string()),
            versions_count: Some(100),
            updated_at: Some("近期".to_string()),
        });
    }

    log("[PROGRESS 90%] 正在写入本地缓存文件 market_cache.json...".to_string());
    let cache_path = ConfigManager::get_app_dir().join("market_cache.json");
    if let Ok(json_str) = serde_json::to_string(&result) {
        let _ = std::fs::write(&cache_path, json_str);
    }

    log(format!("[SUCCESS] 工具市场更新完成！全网共发现 {} 个可用开源工具", result.len()));

    Ok(result)
}

#[command]
pub async fn mise_get_market_plugins(
    runner: State<'_, SharedRunner>,
) -> AppResult<Vec<PluginMarketItem>> {
    let installed = runner.list_installed().await.unwrap_or_default();

    // 优先读取本地缓存文件
    let cache_path = ConfigManager::get_app_dir().join("market_cache.json");
    if cache_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&cache_path) {
            if let Ok(mut cached_list) = serde_json::from_str::<Vec<PluginMarketItem>>(&content) {
                for item in cached_list.iter_mut() {
                    item.is_installed = installed.iter().any(|t| t.name.eq_ignore_ascii_case(&item.name));
                    item.installed_version = installed
                        .iter()
                        .find(|t| t.name.eq_ignore_ascii_case(&item.name))
                        .map(|t| t.version.clone());
                }
                return Ok(cached_list);
            }
        }
    }

    // 默认内置核心工具清单
    let popular_tools = vec![
        ("node", "编程语言", "Node.js JavaScript runtime", "nodejs/node", "26.13.0", 878, "昨天"),
        ("python", "编程语言", "Python programming language", "python/cpython", "3.15.2", 1122, "3 天前"),
        ("pnpm", "包管理器", "Fast, disk space efficient package manager", "pnpm/pnpm", "12.16.1", 586, "2 天前"),
        ("uv", "包管理器", "An extremely fast Python package installer and resolver, written in Rust", "astral-sh/uv", "0.13.6", 329, "3 天前"),
        ("rust", "编程语言", "Rust programming language", "rust-lang/rust", "stable", 160, "昨天"),
        ("go", "编程语言", "Go programming language", "golang/go", "1.27.3", 293, "10 天前"),
        ("codex", "CLI工具", "Lightweight coding agent that runs in your terminal", "openai/codex", "0.163.0", 197, "7 天前"),
        ("claude", "CLI工具", "Claude Code is an agentic coding tool that lives in your terminal", "anthropics/claude-code", "2.1.314", 256, "今天"),
        ("java", "编程语言", "Java Development Kit (Adoptium/Temurin)", "Adoptium/Temurin", "27.0.1+0", 6675, "今天"),
        ("bun", "编程语言", "Incredibly fast JavaScript runtime, bundler, and package manager", "oven-sh/bun", "1.4.4", 216, "7 天前"),
        ("gh", "CLI工具", "GitHub's official command line tool", "cli/cli", "2.103.3", 210, "3 天前"),
        ("ruby", "编程语言", "Ruby programming language", "ruby/ruby", "4.0.9", 703, "6 天前"),
        ("opencode", "CLI工具", "Open-source coding agent", "anomalyco/opencode", "1.0.8", 120, "4 天前"),
        ("terraform", "CLI工具", "Infrastructure automation tool", "hashicorp/terraform", "1.10.5", 340, "5 天前"),
        ("jq", "CLI工具", "Command-line JSON processor", "jqlang/jq", "1.7.1", 45, "12 天前"),
        ("shellcheck", "CLI工具", "Shell script analysis tool", "koalaman/shellcheck", "0.10.0", 82, "15 天前"),
        ("gradle", "构建工具", "Gradle is the open source build system for Java, Android, and Kotlin", "gradle/gradle", "9.8.2", 532, "昨天"),
        ("maven", "构建工具", "Java build tool and dependency management standard", "apache/maven", "3.9.16", 185, "4 天前"),
        ("deno", "编程语言", "Secure TS/JS runtime", "denoland/deno", "2.1.4", 230, "昨天"),
        ("zig", "编程语言", "General-purpose programming language", "ziglang/zig", "0.14.0", 95, "8 天前"),
        ("yarn", "包管理器", "Safe, stable, reproducible projects with Node.js", "yarnpkg/berry", "4.18.1", 310, "3 天前"),
        ("ripgrep", "CLI工具", "Fast line-oriented regex search tool rg", "BurntSushi/ripgrep", "14.1.1", 64, "2 周前"),
        ("fd", "CLI工具", "Simple, fast and user-friendly alternative to find", "sharkdp/fd", "10.2.0", 52, "2 周前"),
        ("bat", "CLI工具", "A cat clone with syntax highlighting and Git integration", "sharkdp/bat", "0.25.0", 78, "2 周前"),
        ("neovim", "CLI工具", "Vim-fork focused on extensibility and usability", "neovim/neovim", "0.10.4", 290, "3 天前"),
    ];

    let list = popular_tools
        .into_iter()
        .map(|(name, cat, desc, repo, latest, count, updated)| {
            let is_inst = installed.iter().any(|t| t.name.eq_ignore_ascii_case(name));
            let inst_ver = installed
                .iter()
                .find(|t| t.name.eq_ignore_ascii_case(name))
                .map(|t| t.version.clone());

            PluginMarketItem {
                name: name.to_string(),
                category: cat.to_string(),
                description: desc.to_string(),
                repository: repo.to_string(),
                is_installed: is_inst,
                installed_version: inst_ver,
                popular: true,
                latest_version: Some(latest.to_string()),
                versions_count: Some(count),
                updated_at: Some(updated.to_string()),
            }
        })
        .collect();

    Ok(list)
}
