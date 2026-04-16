"use client";

import { useToastStore, ToastType } from "@/lib/toast";
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  X 
} from "lucide-react";
import { useEffect, useState } from "react";

const icons: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles: Record<ToastType, string> = {
  success: "bg-[var(--tf-bg-card)] border-[var(--tf-border)] text-[var(--tf-text)]",
  error: "bg-[var(--tf-bg-card)] border-[var(--tf-border)] text-[var(--tf-text)]",
  info: "bg-[var(--tf-bg-card)] border-[var(--tf-border)] text-[var(--tf-text)]",
  warning: "bg-[var(--tf-bg-card)] border-[var(--tf-border)] text-[var(--tf-text)]",
};

const iconColors: Record<ToastType, string> = {
  success: "text-[var(--tf-success)]",
  error: "text-[var(--tf-error)]",
  info: "text-[var(--tf-info)]",
  warning: "text-[var(--tf-warning)]",
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100001] flex flex-col gap-3 max-w-[380px] w-full pointer-events-none">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-start gap-3 p-4 rounded-[var(--tf-radius-lg)] border shadow-lg 
              tf-animate-slide-right
              ${styles[toast.type]}
            `}
            style={{
              boxShadow: "var(--tf-shadow-md)"
            }}
            role="alert"
          >
            <div className={`mt-0.5 shrink-0 ${iconColors[toast.type]}`}>
               <Icon className="w-5 h-5" />
            </div>
            
            <div className="flex-1 text-sm font-semibold pr-2 leading-snug">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 -mr-1 -mt-1 text-[var(--tf-text-muted)] hover:text-[var(--tf-text)] hover:bg-[var(--tf-bg-subtle)] rounded-full transition-colors shrink-0"
              aria-label="Đóng"
            >
              <X className="w-4 h-4 opacity-80" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
