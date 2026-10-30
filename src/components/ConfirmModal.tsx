import React from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "var(--modal-overlay-bg)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onCancel}
    >
      <div
        className="fluent-card"
        style={{
          width: 440,
          backgroundColor: "var(--modal-card-bg)",
          border: "1px solid var(--modal-card-border)",
          boxShadow: "var(--modal-card-shadow)",
          borderRadius: 14,
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 12, color: "var(--text-primary)" }}>
          {title}
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
          {message}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn btn-secondary" style={{ padding: "7px 18px", fontSize: 13 }} onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`btn ${isDanger ? "btn-danger" : "btn-primary"}`}
            style={{ padding: "7px 20px", fontSize: 13 }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
