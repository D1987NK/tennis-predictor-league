"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";
interface Toast {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4500);
  }, []);

  const dismiss = (id: number) => setToasts((p) => p.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const Icon = icons[t.variant];
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-lg border bg-card p-4 shadow-lg animate-fade-in",
                t.variant === "success" && "border-primary/40",
                t.variant === "error" && "border-destructive/40",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  t.variant === "success" && "text-primary",
                  t.variant === "error" && "text-destructive",
                  t.variant === "info" && "text-atp",
                )}
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
