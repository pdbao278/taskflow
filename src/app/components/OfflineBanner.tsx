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
    <div className="fixed top-0 left-0 right-0 z-[10000] p-1 animate-in slide-in-from-top duration-300">
      <div className="bg-zinc-900 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center justify-between gap-4 max-w-fit mx-auto border border-white/10">
        <div className="flex items-center gap-2 text-sm font-medium">
          <WifiOff className="w-4 h-4 text-amber-400" />
          <span>Bạn đang ngoại tuyến. Một số tính năng có thể không hoạt động.</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Đóng"
        >
          <X className="w-4 h-4 opacity-60" />
        </button>
      </div>
    </div>
  );
}
