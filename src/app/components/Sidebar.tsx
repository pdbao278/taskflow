"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Settings,
  Users,
  Briefcase,
  ChevronRight,
  FolderKanban,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils"; // Wait, I might not have cn() yet. Let's check or implement.

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
}

export function Sidebar({ workspaces, activeWorkspaceId }: SidebarProps) {
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
    <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col h-screen sticky top-0 overflow-y-auto">
      {/* Workspace Switcher */}
      <div className="p-4 border-b border-zinc-100">
        <WorkspaceSwitcher 
          workspaces={workspaces} 
          activeWorkspaceId={activeWorkspaceId} 
        />
      </div>

      {/* Main Menu */}
      <nav className="flex-1 p-4 space-y-8">
        <div>
          <h3 className="px-4 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-4">Chính</h3>
          <ul className="space-y-1">
            {visibleMenuItems.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.disabled ? "#" : item.href}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all group ${
                      active 
                        ? "bg-zinc-900 text-white shadow-md shadow-zinc-200" 
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                    } ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <item.icon className={`w-4 h-4 ${active ? "text-white" : "text-zinc-400 group-hover:text-zinc-900"}`} />
                    <span className="text-sm font-medium">{item.title}</span>
                    {active && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {isAdmin && (
          <div>
            <h3 className="px-4 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-4">Cài đặt</h3>
            <ul className="space-y-1">
              {visibleSettingsItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all group ${
                        active 
                          ? "bg-zinc-900 text-white shadow-md shadow-zinc-200" 
                          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                      }`}
                    >
                      <item.icon className={`w-4 h-4 ${active ? "text-white" : "text-zinc-400 group-hover:text-zinc-900"}`} />
                      <span className="text-sm font-medium">{item.title}</span>
                      {active && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Footer / User info could go here */}
      <div className="p-4 border-t border-zinc-100">
        <div className="px-4 py-2 text-[10px] text-zinc-400 font-medium">
          TaskFlow v0.1.0
        </div>
      </div>
    </aside>
  );
}
