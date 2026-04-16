"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Settings,
  Users,
  Briefcase,
  FolderKanban,
  BarChart2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NewTaskButton } from "../app/_components/NewTaskButton";

const menuItems: { title: string; icon: any; href: string; disabled?: boolean }[] = [
  {
    title: "Tổng quan",
    icon: LayoutDashboard,
    href: "/app",
  },
  {
    title: "Task của tôi",
    icon: CheckSquare,
    href: "/app/my-tasks",
  },
  {
    title: "Dự án",
    icon: Briefcase,
    href: "/app/projects",
  },
  {
    title: "Team / Kanban",
    icon: FolderKanban,
    href: "/app/team",
  },
  {
    title: "Báo cáo",
    icon: BarChart2,
    href: "/app/reports",
  },
];

const settingsItems = [
  {
    title: "Cài đặt Workspace",
    icon: Settings,
    href: "/app/settings/workspace",
  },
  {
    title: "Thành viên",
    icon: Users,
    href: "/app/settings/members",
  },
  {
    title: "Thùng rác",
    icon: Trash2,
    href: "/app/settings/trash",
  },
];

import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

interface WorkspaceInfo {
  id: string;
  name: string;
  role: string;
}

interface SidebarProps {
  workspaces: WorkspaceInfo[];
  activeWorkspaceId: string;
  className?: string;
}

export function Sidebar({ workspaces, activeWorkspaceId, className }: SidebarProps) {
  const pathname = usePathname();

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const currentRole = activeWorkspace?.role || "Member";
  const isManagerOrAdmin = currentRole === "Manager" || currentRole === "Admin";
  const isAdmin = currentRole === "Admin";

  // Filter main menu
  const visibleMenuItems = menuItems.filter((item) => {
    // Team Kanban and Reports: Manager/Admin only (PRD FR-08, FR-11)
    if (item.href === "/app/team") return isManagerOrAdmin;
    if (item.href === "/app/reports") return isManagerOrAdmin;
    return true;
  });

  // Filter settings menu
  const visibleSettingsItems = settingsItems.filter((item) => {
    if (item.href.startsWith("/app/settings")) return isAdmin;
    return true;
  });

  return (
    <aside
      className={cn(
        "bg-[var(--tf-sidebar-bg)] flex flex-col overflow-y-auto border-r border-white/[0.06]",
        className
      )}
    >
      {/* Workspace Switcher */}
      <div className="p-4 border-b border-white/[0.06]">
        <WorkspaceSwitcher 
          workspaces={workspaces} 
          activeWorkspaceId={activeWorkspaceId} 
        />
      </div>

      {/* "+ New Task" — restricted to Admin/Manager (PRD US-01) */}
      {isManagerOrAdmin && (
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="flex w-full [&>button]:w-full">
            <NewTaskButton />
          </div>
        </div>
      )}

      {/* Main Menu */}
      <nav className="flex-1 p-4 space-y-8">
        <div>
          <h3 className="px-3 text-[10px] font-semibold text-white/25 uppercase tracking-[0.15em] mb-3">
            Chính
          </h3>
          <ul className="space-y-0.5">
            {visibleMenuItems.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.disabled ? "#" : item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                      active
                        ? "bg-gradient-to-r from-indigo-500/15 to-purple-500/10 text-white"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]",
                      item.disabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {/* Active indicator bar */}
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-gradient-to-b from-indigo-400 to-purple-500" />
                    )}
                    <item.icon
                      className={cn(
                        "w-[18px] h-[18px] transition-colors",
                        active
                          ? "text-indigo-400"
                          : "text-white/30 group-hover:text-white/60"
                      )}
                    />
                    <span className="text-[13px] font-medium">{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {isAdmin && (
          <div>
            <h3 className="px-3 text-[10px] font-semibold text-white/25 uppercase tracking-[0.15em] mb-3">
              Cài đặt
            </h3>
            <ul className="space-y-0.5">
              {visibleSettingsItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                        active
                          ? "bg-gradient-to-r from-indigo-500/15 to-purple-500/10 text-white"
                          : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                      )}
                    >
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-gradient-to-b from-indigo-400 to-purple-500" />
                      )}
                      <item.icon
                        className={cn(
                          "w-[18px] h-[18px] transition-colors",
                          active
                            ? "text-indigo-400"
                            : "text-white/30 group-hover:text-white/60"
                        )}
                      />
                      <span className="text-[13px] font-medium">{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.06]">
        <div className="px-3 py-2 text-[10px] text-white/15 font-medium tracking-wider">
          TaskFlow v0.1.0
        </div>
      </div>
    </aside>
  );
}
