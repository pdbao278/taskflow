"use client";

import { useState, useEffect } from "react";
import { WifiOff, X } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Initial check
    setIsOffline(!window.navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      setDismissed(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] p-2 tf-animate-in">
      <div className="bg-[var(--tf-warning-muted)] text-[var(--tf-warning)] px-4 py-2.5 rounded-full shadow-md flex items-center justify-between gap-4 max-w-fit mx-auto border border-[var(--tf-warning)]/20 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Bạn đang ngoại tuyến. Một số tính năng có thể không hoạt động.</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-[var(--tf-warning)]/10 rounded-full transition-colors"
          aria-label="Đóng"
        >
          <X className="w-4 h-4 opacity-80" />
        </button>
      </div>
    </div>
  );
}
