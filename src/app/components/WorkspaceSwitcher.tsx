"use client";

import { useState, useRef, useEffect } from "react";
import { 
  ChevronDown, 
  Plus, 
  Settings, 
  Check, 
  Building2,
  MoreVertical
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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl transition-all border border-transparent",
          isOpen ? "bg-zinc-50 border-zinc-200" : "hover:bg-zinc-50/80"
        )}
      >
        <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-zinc-900 flex items-center justify-center text-white font-bold shadow-lg shadow-zinc-200">
          {activeWorkspace?.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <h2 className="text-sm font-semibold text-zinc-900 truncate">
            {activeWorkspace?.name}
          </h2>
          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
            {activeWorkspace?.role}
          </p>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-zinc-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-xl shadow-zinc-200/50 z-50 py-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 mb-1">
            <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest px-2">Workspaces của bạn</h3>
          </div>

          <div className="max-h-64 overflow-y-auto px-2 space-y-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleSwitch(ws.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg transition-all",
                  ws.id === activeWorkspaceId 
                    ? "bg-zinc-50 border border-zinc-100" 
                    : "hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900"
                )}
              >
                <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold text-xs">
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">{ws.name}</p>
                  <p className="text-[10px] text-zinc-400">{ws.role}</p>
                </div>
                {ws.id === activeWorkspaceId && (
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t border-zinc-100 px-2">
            <Link
              href="/app/workspaces/new"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-2 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-all"
            >
              <div className="h-8 w-8 flex-shrink-0 rounded-lg border-2 border-dashed border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:border-zinc-300">
                <Plus className="w-4 h-4" />
              </div>
              <span>Tạo Workspace mới</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
