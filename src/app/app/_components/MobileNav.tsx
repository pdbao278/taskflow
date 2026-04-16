"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "../../components/Sidebar";
import { usePathname } from "next/navigation";

interface WorkspaceInfo {
  id: string;
  name: string;
  role: string;
}

export function MobileNav({ workspaces, activeWorkspaceId }: { workspaces: WorkspaceInfo[], activeWorkspaceId: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden flex items-center shrink-0">
      <button 
        onClick={() => setOpen(true)} 
        className="p-1.5 -ml-1.5 text-zinc-600 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
        aria-label="Mở menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-64 bg-white h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <button 
              onClick={() => setOpen(false)} 
              className="absolute top-2 -right-12 p-2 text-white bg-zinc-900/60 hover:bg-zinc-900/80 rounded-full transition-colors"
              aria-label="Đóng menu"
            >
              <X className="w-5 h-5" />
            </button>
            
            <Sidebar workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} className="w-full border-r-0 h-full" />
          </div>
        </div>
      )}
    </div>
  );
}
