import { getAuthUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { LogoutButton } from "../components/LogoutButton";
import { Sidebar } from "../components/Sidebar";
import { AuthSync } from "../components/AuthSync";
import { getActiveWorkspace } from "@/lib/workspace";
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
    <div className="min-h-screen flex bg-[var(--tf-bg)]">
      <AuthSync />

      {/* Desktop Sidebar */}
      <Sidebar
        workspaces={workspaces}
        activeWorkspaceId={activeId}
        className="hidden md:flex w-64 h-screen sticky top-0"
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Global header */}
        <header className="h-[60px] border-b border-[var(--tf-border)] bg-[rgba(255,255,255,0.8)] backdrop-blur-md flex items-center justify-between px-3 md:px-6 shrink-0 gap-2 md:gap-4 z-10 sticky top-0">
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <MobileNav workspaces={workspaces} activeWorkspaceId={activeId} />
            <span className="text-[10px] font-extrabold bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-2 py-1 rounded-md shadow-sm opacity-90 hidden md:inline-block">TF</span>
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest hidden md:inline-block ml-2">Workspace</span>
          </div>

          {/* Global Search Bar (FR-12) */}
          <div className="flex-1 max-w-xl flex justify-center px-1">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 md:mr-3 py-1 px-2 rounded-full hover:bg-[var(--tf-bg-subtle)] transition-colors cursor-default">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-500/10 flex items-center justify-center text-indigo-600 font-bold text-xs shadow-sm">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-[13px] font-semibold text-zinc-700 hidden md:inline">
                {user.name}
              </span>
            </div>

            <NotificationBell />
            <div className="w-[1px] h-4 bg-zinc-200 mx-1 hidden md:block" />
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[var(--tf-bg)]">
          {children}
        </main>
      </div>
    </div>
  );
}
