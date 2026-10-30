import React from "react";

export type ToastType = "success" | "info" | "warning" | "error";

export interface ToastMessage {
  id: string;
  type: ToastType;
  content: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case "success": return "rgba(16, 185, 129, 0.4)";
      case "error": return "rgba(239, 68, 68, 0.4)";
      case "warning": return "rgba(245, 158, 11, 0.4)";
      default: return "rgba(0, 120, 212, 0.4)";
    }
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success": return "✅";
      case "error": return "❌";
      case "warning": return "⚠️";
      default: return "💡";
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 24,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="fluent-card"
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            minWidth: 260,
            maxWidth: 420,
            borderRadius: 8,
            border: `1px solid ${getBorderColor(toast.type)}`,
            backgroundColor: "var(--bg-card, #1e1e24)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
            color: "var(--text-primary, #ffffff)",
            fontSize: 13,
            animation: "fluentToastIn 0.22s cubic-bezier(0, 0, 0.2, 1)",
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>{getIcon(toast.type)}</span>
          <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.content}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted, #a1a1aa)",
              cursor: "pointer",
              fontSize: 14,
              padding: "0 4px",
              marginLeft: 6,
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
