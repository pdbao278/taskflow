import { getAuthUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { LogoutButton } from "../components/LogoutButton";
import { Sidebar } from "../components/Sidebar";
import { AuthSync } from "../components/AuthSync";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace(user.id);
  
  // getActiveWorkspace returns the active workspace and a list of all memberships
  const workspaces = activeWorkspace?.allWorkspaces || [];
  const activeId = activeWorkspace?.id || "";

  return (
    <div className="min-h-screen flex bg-zinc-50">
      <AuthSync />
      
      {/* Desktop Sidebar */}
      <Sidebar 
        workspaces={workspaces} 
        activeWorkspaceId={activeId} 
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-12 border-b border-zinc-200 bg-white flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-zinc-900 text-white px-1.5 py-0.5 rounded tracking-tighter">TF</span>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Workspace</span>
          </div>
          <LogoutButton />
        </header>

        <main className="flex-1 overflow-y-auto bg-zinc-50/50">
          {children}
        </main>
      </div>
    </div>
  );
}

