"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, "id">) => string;
  dismissToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5 toasts

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  const success = useCallback(
    (message: string, title?: string) => {
      showToast({ type: "success", title, message });
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, title?: string) => {
      showToast({ type: "error", title, message, duration: 6000 });
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, title?: string) => {
      showToast({ type: "warning", title, message, duration: 5000 });
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, title?: string) => {
      showToast({ type: "info", title, message });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, showToast, dismissToast, success, error, warning, info }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none no-print"
    >
      {toasts.map((toast) => (
        <ToastItemCard key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastItemCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const getStyles = () => {
    switch (toast.type) {
      case "success":
        return {
          icon: CheckCircle2,
          iconClass: "text-emerald-500 dark:text-emerald-400",
          border: "border-emerald-500/20 dark:border-emerald-500/30",
          bg: "bg-white/95 dark:bg-slate-900/95",
          shadow: "shadow-lg shadow-emerald-500/5",
        };
      case "error":
        return {
          icon: AlertCircle,
          iconClass: "text-rose-500 dark:text-rose-400",
          border: "border-rose-500/20 dark:border-rose-500/30",
          bg: "bg-white/95 dark:bg-slate-900/95",
          shadow: "shadow-lg shadow-rose-500/5",
        };
      case "warning":
        return {
          icon: AlertTriangle,
          iconClass: "text-amber-500 dark:text-amber-400",
          border: "border-amber-500/20 dark:border-amber-500/30",
          bg: "bg-white/95 dark:bg-slate-900/95",
          shadow: "shadow-lg shadow-amber-500/5",
        };
      case "info":
      default:
        return {
          icon: Info,
          iconClass: "text-sky-500 dark:text-sky-400",
          border: "border-sky-500/20 dark:border-sky-500/30",
          bg: "bg-white/95 dark:bg-slate-900/95",
          shadow: "shadow-lg shadow-sky-500/5",
        };
    }
  };

  const style = getStyles();
  const Icon = style.icon;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border ${style.border} ${style.bg} ${style.shadow} backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 animate-in slide-in-from-bottom-3`}
    >
      <div className="shrink-0 mt-0.5">
        <Icon className={`w-5 h-5 ${style.iconClass}`} />
      </div>
      <div className="flex-1 min-w-0 pr-1">
        {toast.title && (
          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-0.5">
            {toast.title}
          </h5>
        )}
        <p className="text-xs text-slate-750 dark:text-slate-300 leading-relaxed break-words font-medium">
          {toast.message}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 -mr-1 -mt-1 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
