import React, { useState } from "react";
import { AppConfig, MiseCandidate, MisePaths } from "../../types/index.ts";
import { TauriService } from "../../services/tauri.ts";
import { SelectMiseModal } from "./SelectMiseModal.tsx";

interface SettingsPathCardProps {
  form: AppConfig;
  paths: MisePaths | null;
  onChangeForm: (newForm: AppConfig) => void;
  onSavePaths: () => void;
  onRefreshTools: () => void;
  onResetDefaults: () => void;
  onOpenDirectory: (path: string) => void;
  onUninstallMise: () => void;
}

export const SettingsPathCard: React.FC<SettingsPathCardProps> = ({
  form,
  paths,
  onChangeForm,
  onSavePaths,
  onRefreshTools,
  onResetDefaults,
  onOpenDirectory,
  onUninstallMise,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [candidates, setCandidates] = useState<MiseCandidate[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const rootDir = form.custom_root_dir || paths?.root_dir || "";
  const dataDir = form.mise_data_dir || paths?.data_dir || "";
  const binDir = form.mise_bin_dir || paths?.shims_dir || "";
  const appDir = paths?.app_dir || "";
  const exePath = form.custom_mise_path || paths?.exe_path || "";

  // 联动推导并自动填入
  const applyMiseExeSelection = (exe: string) => {
    let derivedRoot = "";
    if (exe.trim()) {
      const parts = exe.replace(/\\/g, "/").split("/");
      parts.pop();
      if (parts.length > 0 && parts[parts.length - 1].toLowerCase() === "bin") {
        parts.pop();
      }
      derivedRoot = parts.join("\\");
    }
    const derivedData = derivedRoot ? `${derivedRoot}\\data` : form.mise_data_dir || "";
    const derivedShims = derivedRoot ? `${derivedRoot}\\data\\shims` : form.mise_bin_dir || "";

    onChangeForm({
      ...form,
      custom_mise_path: exe,
      custom_root_dir: derivedRoot || form.custom_root_dir,
      mise_data_dir: derivedData,
      mise_bin_dir: derivedShims,
    });
  };

  // 1. 浏览选择文件与文件夹对话框
  const handleBrowseMiseExe = async () => {
    const file = await TauriService.selectFile("请选择本地 mise.exe 可执行文件");
    if (file) {
      applyMiseExeSelection(file);
    }
  };

  const handleBrowseRootDir = async () => {
    const dir = await TauriService.selectDirectory("请选择 MISE 统一主目录");
    if (dir) {
      onChangeForm({
        ...form,
        custom_root_dir: dir,
        mise_data_dir: `${dir}\\data`,
        mise_bin_dir: `${dir}\\data\\shims`,
      });
    }
  };

  const handleBrowseDataDir = async () => {
    const dir = await TauriService.selectDirectory("请选择 MISE 数据存储目录");
    if (dir) {
      onChangeForm({ ...form, mise_data_dir: dir });
    }
  };

  const handleBrowseBinDir = async () => {
    const dir = await TauriService.selectDirectory("请选择 MISE Shims 垫片目录");
    if (dir) {
      onChangeForm({ ...form, mise_bin_dir: dir });
    }
  };

  // 2. 扫描本地已安装 mise
  const handleScanMise = async () => {
    setIsScanning(true);
    setIsModalOpen(true);
    try {
      const list = await TauriService.scanLocalMise();
      setCandidates(list);
    } catch (e) {
      console.error("扫描本地 mise 异常:", e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectCandidate = async (selectedPath: string) => {
    applyMiseExeSelection(selectedPath);
    await TauriService.switchMisePath(selectedPath);
    setIsModalOpen(false);
    onRefreshTools();
  };

  return (
    <div className="fluent-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <span>📁</span>
          <span>mise 核心与数据统一目录配置</span>
        </h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: 12, padding: "3px 10px" }}
            onClick={handleScanMise}
          >
            🔍 扫描本地 mise 选择使用
          </button>
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 4,
              backgroundColor: "rgba(37, 99, 235, 0.15)",
              color: "var(--accent-color)",
              fontWeight: 500,
            }}
          >
            同目录自包含
          </span>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 16 }}>
        默认整合于应用根目录下的 mise 文件夹中（应用可执行文件与下载数据同目录）
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* mise 应用可执行程序 */}
        <div>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>
            mise 应用（可执行程序路径，指定 mise.exe 入口）
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={exePath}
              onChange={(e) => applyMiseExeSelection(e.target.value)}
              placeholder={paths?.exe_path || "默认便携路径或系统 PATH"}
              style={{
                flex: 1,
                padding: "7px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-input)",
                color: "var(--text-primary)",
                fontFamily: "monospace",
                fontSize: 12.5,
              }}
            />
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: "0 12px" }}
              title="选择本地可执行文件"
              onClick={handleBrowseMiseExe}
            >
              📁 浏览 mise 应用
            </button>
          </div>
        </div>

        {/* MISE 统一主目录 */}
        <div>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>
            MISE 统一主目录（bin 与 data 均保存在此处，实现便携绿色管理）
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={rootDir}
              onChange={(e) => onChangeForm({ ...form, custom_root_dir: e.target.value })}
              placeholder={paths?.root_dir || "默认: [应用目录]\\mise"}
              style={{
                flex: 1,
                padding: "7px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-input)",
                color: "var(--text-primary)",
                fontFamily: "monospace",
                fontSize: 12.5,
              }}
            />
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: "0 12px" }}
              title="弹出文件夹选择框选择目录"
              onClick={handleBrowseRootDir}
            >
              📁 浏览统一主目录
            </button>
          </div>
        </div>

        {/* MISE_DATA_DIR */}
        <div>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>
            MISE_DATA_DIR —— 数据目录（工具包存放目录，默认: [主目录]/data）
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={dataDir}
              onChange={(e) => onChangeForm({ ...form, mise_data_dir: e.target.value })}
              style={{
                flex: 1,
                padding: "7px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-input)",
                color: "var(--text-primary)",
                fontFamily: "monospace",
                fontSize: 12.5,
              }}
            />
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: "0 12px" }}
              title="弹出文件夹选择框选择目录"
              onClick={handleBrowseDataDir}
            >
              📁 浏览
            </button>
          </div>
        </div>

        {/* MISE_BIN_DIR */}
        <div>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>
            MISE_BIN_DIR —— shims 目录（默认: [主目录]/data/shims）
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={binDir}
              onChange={(e) => onChangeForm({ ...form, mise_bin_dir: e.target.value })}
              style={{
                flex: 1,
                padding: "7px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-input)",
                color: "var(--text-primary)",
                fontFamily: "monospace",
                fontSize: 12.5,
              }}
            />
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: "0 12px" }}
              title="弹出文件夹选择框选择目录"
              onClick={handleBrowseBinDir}
            >
              📁 浏览
            </button>
          </div>
        </div>

        {/* 黑色终端控制台文本区 (图1) */}
        <div
          style={{
            backgroundColor: "#111116",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 16px",
            fontFamily: "monospace",
            fontSize: 12,
            lineHeight: 1.8,
            color: "var(--text-muted)",
          }}
        >
          <div>应用 运行根目录 = <span style={{ color: "#e4e4e7" }}>{appDir}</span></div>
          <div>MISE 统一主目录 = <span style={{ color: "#38bdf8" }}>{rootDir}</span></div>
          <div>MISE_DATA_DIR = <span style={{ color: "#38bdf8" }}>{dataDir}</span></div>
          <div>MISE_CONFIG_DIR = <span style={{ color: "#38bdf8" }}>{rootDir ? `${rootDir}\\config` : ""}</span></div>
          <div>MISE_BIN_DIR = <span style={{ color: "#38bdf8" }}>{binDir}</span></div>
          <div>mise 实际入口 = <span style={{ color: "#4ade80" }}>{exePath}</span></div>
        </div>

        {/* 底部按钮栏 (图1) */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
          <button className="btn btn-primary" style={{ fontSize: 12.5 }} onClick={onSavePaths}>
            💾 保存路径配置
          </button>
          <button className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={onRefreshTools}>
            🔄 刷新已下载应用
          </button>
          <button className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={onResetDefaults}>
            🔄 恢复默认目录
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12.5 }}
            onClick={() => dataDir && onOpenDirectory(dataDir)}
          >
            📂 打开当前数据目录
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12.5, color: "var(--error-color)", borderColor: "rgba(239, 68, 68, 0.3)" }}
            onClick={onUninstallMise}
          >
            🗑️ 卸载 mise 核心与数据
          </button>
        </div>
      </div>

      {/* 扫描本地 mise 选择使用模态窗 */}
      <SelectMiseModal
        isOpen={isModalOpen}
        candidates={candidates}
        isLoading={isScanning}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelectCandidate}
        onRefreshScan={handleScanMise}
      />
    </div>
  );
};
