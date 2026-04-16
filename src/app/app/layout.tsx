import { getAuthUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { LogoutButton } from "../components/LogoutButton";
import { Sidebar } from "../components/Sidebar";
import { AuthSync } from "../components/AuthSync";
import { getActiveWorkspace } from "@/lib/workspace";
import { NewTaskButton } from "./_components/NewTaskButton";
import { NotificationBell } from "../components/notifications/NotificationBell";
import { GlobalSearch } from "./_components/GlobalSearch";
import { MobileNav } from "./_components/MobileNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace(user.id);

  const workspaces = activeWorkspace?.allWorkspaces || [];
  const activeId = activeWorkspace?.id || "";

  return (
    <div className="min-h-screen flex bg-zinc-50">
      <AuthSync />

      {/* Desktop Sidebar */}
      <Sidebar
        workspaces={workspaces}
        activeWorkspaceId={activeId}
        className="hidden md:flex w-64 h-screen sticky top-0"
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Global header with "+ Thêm Task" button (NFR-05: max 3 clicks) */}
        <header className="h-12 border-b border-zinc-200 bg-white flex items-center justify-between px-3 md:px-6 shrink-0 gap-2 md:gap-4">
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <MobileNav workspaces={workspaces} activeWorkspaceId={activeId} />
            <span className="text-[10px] font-bold bg-zinc-900 text-white px-1.5 py-0.5 rounded tracking-tighter">TF</span>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest hidden md:inline-block">Workspace</span>
          </div>

          {/* Global Search Bar (FR-12) */}
          <div className="flex-1 max-w-xl flex justify-center px-1">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 md:mr-2">
              <div className="w-6 h-6 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                <span className="text-[10px] font-bold text-zinc-600">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-xs font-medium text-zinc-600 hidden md:inline">
                {user.name}
              </span>
            </div>

            {/* "+ New Task" — restricted to Admin/Manager (PRD US-01) */}
            {(activeWorkspace?.currentRole === "Admin" || activeWorkspace?.currentRole === "Manager") && (
              <NewTaskButton />
            )}
            <NotificationBell />
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-zinc-50/50">
          {children}
        </main>
      </div>
    </div>
  );
}
