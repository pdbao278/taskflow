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
  success: "bg-emerald-50 border-emerald-100 text-emerald-800",
  error: "bg-red-50 border-red-100 text-red-800",
  info: "bg-blue-50 border-blue-100 text-blue-800",
  warning: "bg-amber-50 border-amber-100 text-amber-800",
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100001] flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg 
              animate-in slide-in-from-right-full duration-300
              ${styles[toast.type]}
            `}
            role="alert"
          >
            <Icon className="w-5 h-5 mt-0.5 shrink-0" />
            <div className="flex-1 text-sm font-medium pr-2">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/5 rounded-full transition-colors shrink-0"
              aria-label="Đóng"
            >
              <X className="w-4 h-4 opacity-60" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
