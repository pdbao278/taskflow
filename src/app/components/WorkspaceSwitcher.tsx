"use client";

import { useState, useRef, useEffect } from "react";
import { 
  ChevronDown, 
  Plus, 
  Check,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface WorkspaceInfo {
  id: string;
  name: string;
  role: string;
}

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceInfo[];
  activeWorkspaceId: string;
}

export function WorkspaceSwitcher({ workspaces, activeWorkspaceId }: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitch = async (workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) {
      setIsOpen(false);
      return;
    }

    try {
      const res = await apiFetch("/api/workspaces/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });

      if (res.ok) {
        setIsOpen(false);
        // Reload page to refresh all server components with new workspace context
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to switch workspace", err);
    }
  };

  const roleColors: Record<string, string> = {
    Admin: "text-indigo-400",
    Manager: "text-purple-400",
    Member: "text-white/40",
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all",
          isOpen ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
        )}
      >
        <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-indigo-500/20">
          {activeWorkspace?.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <h2 className="text-[13px] font-semibold text-white truncate">
            {activeWorkspace?.name}
          </h2>
          <p className={cn("text-[10px] font-medium uppercase tracking-wider", roleColors[activeWorkspace?.role || "Member"])}>
            {activeWorkspace?.role}
          </p>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-white/20 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-[#1e1e24] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/40 z-50 py-2 tf-animate-scale">
          <div className="px-3 py-2 mb-1">
            <h3 className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.15em] px-2">
              Workspaces
            </h3>
          </div>

          <div className="max-h-64 overflow-y-auto px-2 space-y-0.5">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleSwitch(ws.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg transition-all",
                  ws.id === activeWorkspaceId 
                    ? "bg-indigo-500/10" 
                    : "hover:bg-white/[0.04] text-white/50 hover:text-white/80"
                )}
              >
                <div className={cn(
                  "h-7 w-7 flex-shrink-0 rounded-lg flex items-center justify-center font-bold text-[10px]",
                  ws.id === activeWorkspaceId
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                    : "bg-white/[0.06] text-white/40"
                )}>
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className={cn(
                    "text-[13px] font-medium truncate",
                    ws.id === activeWorkspaceId ? "text-white" : ""
                  )}>{ws.name}</p>
                  <p className="text-[10px] text-white/25">{ws.role}</p>
                </div>
                {ws.id === activeWorkspaceId && (
                  <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          <div className="mt-2 pt-2 border-t border-white/[0.06] px-2">
            <Link
              href="/app/workspaces/new"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-2 rounded-lg text-[13px] font-medium text-white/30 hover:bg-white/[0.04] hover:text-white/60 transition-all"
            >
              <div className="h-7 w-7 flex-shrink-0 rounded-lg border border-dashed border-white/10 flex items-center justify-center text-white/20">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span>Tạo Workspace mới</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
