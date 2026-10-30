import React, { useEffect, useRef } from "react";

interface TerminalDrawerProps {
  isOpen: boolean;
  logs: string[];
  isRunning: boolean;
  onClose: () => void;
  onClear: () => void;
  onAbort: () => void;
}

export const TerminalDrawer: React.FC<TerminalDrawerProps> = ({
  isOpen,
  logs,
  isRunning,
  onClose,
  onClear,
  onAbort,
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isOpen]);

  if (!isOpen) return null;

  const renderLogLine = (log: string, idx: number) => {
    let color = "var(--terminal-log-default)";
    if (log.includes("[开始执行]") || log.includes("[INFO]")) {
      color = "var(--terminal-log-info)";
    } else if (log.includes("[EXEC]")) {
      color = "var(--terminal-log-exec)";
    } else if (log.includes("[执行成功]") || log.includes("[SUCCESS]")) {
      color = "var(--terminal-log-success)";
    } else if (log.includes("[执行失败]") || log.includes("[ERROR]") || log.includes("[异常中断]")) {
      color = "var(--terminal-log-error)";
    } else if (log.includes("[PROGRESS") || log.includes("[SCAN]")) {
      color = "var(--terminal-log-scan)";
    }

    return (
      <div key={idx} style={{ color, wordBreak: "break-all" }}>
        {log}
      </div>
    );
  };

  return (
    <div className="terminal-drawer">
      <div className="terminal-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--terminal-header-text)" }}>命令执行实时终端</span>
          {isRunning && (
            <span style={{ color: "var(--terminal-log-exec)", fontSize: 12 }}>
              ● 正在执行中...
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isRunning && (
            <button className="btn btn-danger" style={{ padding: "4px 10px", fontSize: 11 }} onClick={onAbort}>
              强杀中断
            </button>
          )}
          <button className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 11 }} onClick={onClear}>
            清空日志
          </button>
          <button className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 11 }} onClick={onClose}>
            收起
          </button>
        </div>
      </div>
      <div className="terminal-body">
        {logs.length === 0 ? (
          <div style={{ color: "#6b7280" }}>等待命令输出...</div>
        ) : (
          logs.map((log, idx) => renderLogLine(log, idx))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
