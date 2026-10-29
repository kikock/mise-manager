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

  return (
    <div className="terminal-drawer">
      <div className="terminal-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>命令执行实时终端</span>
          {isRunning && (
            <span style={{ color: "var(--warning-color)", fontSize: 12 }}>
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
          logs.map((log, idx) => <div key={idx}>{log}</div>)
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
