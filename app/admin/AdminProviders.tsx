"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import styles from "./admin.module.css";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type ConfirmState = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

type ToastTone = "success" | "error";

type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
};

type AdminUiContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
  };
};

const AdminUiContext = createContext<AdminUiContextValue | null>(null);

export function useAdminConfirm() {
  const context = useContext(AdminUiContext);

  if (!context) {
    throw new Error("useAdminConfirm must be used inside AdminProviders.");
  }

  return context.confirm;
}

export function useAdminToast() {
  const context = useContext(AdminUiContext);

  if (!context) {
    throw new Error("useAdminToast must be used inside AdminProviders.");
  }

  return context.toast;
}

export default function AdminProviders({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((tone: ToastTone, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((currentToasts) => [...currentToasts, { id, tone, message }]);
    window.setTimeout(() => removeToast(id), 3600);
  }, [removeToast]);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        cancelLabel: "Annuler",
        confirmLabel: options.tone === "danger" ? "Supprimer définitivement" : "Confirmer",
        tone: "default",
        ...options,
        resolve,
      });
    });
  }, []);

  const closeConfirm = useCallback((value: boolean) => {
    setConfirmState((currentState) => {
      currentState?.resolve(value);
      return null;
    });
  }, []);

  const contextValue = useMemo<AdminUiContextValue>(() => ({
    confirm,
    toast: {
      success: (message: string) => pushToast("success", message),
      error: (message: string) => pushToast("error", message),
    },
  }), [confirm, pushToast]);

  return (
    <AdminUiContext.Provider value={contextValue}>
      {children}

      {confirmState ? (
        <div className={styles.confirmOverlay} role="presentation" onMouseDown={() => closeConfirm(false)}>
          <div
            className={styles.confirmModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-confirm-title"
            aria-describedby={confirmState.description ? "admin-confirm-description" : undefined}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.confirmIcon}>!</div>
            <div>
              <p className={styles.confirmKicker}>Confirmation FAST CASH</p>
              <h2 id="admin-confirm-title">{confirmState.title}</h2>
              {confirmState.description ? (
                <p id="admin-confirm-description">{confirmState.description}</p>
              ) : null}
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.buttonSecondary} type="button" onClick={() => closeConfirm(false)}>
                {confirmState.cancelLabel}
              </button>
              <button
                className={confirmState.tone === "danger" ? styles.buttonDanger : styles.button}
                type="button"
                onClick={() => closeConfirm(true)}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.toastStack} aria-live="polite" aria-relevant="additions removals">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.premiumToast} ${toast.tone === "error" ? styles.premiumToastError : ""}`}>
            <strong>{toast.tone === "success" ? "✓" : "!"}</strong>
            <span>{toast.message}</span>
            <button type="button" onClick={() => removeToast(toast.id)} aria-label="Fermer la notification">
              ×
            </button>
          </div>
        ))}
      </div>
    </AdminUiContext.Provider>
  );
}
