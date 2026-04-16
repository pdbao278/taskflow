import { getAuthUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { getActiveWorkspace } from "@/lib/workspace";
import WorkspaceSettingsView from "./_components/WorkspaceSettingsView";

export default async function WorkspaceSettingsPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace(user.id);

  if (!activeWorkspace) {
    redirect("/app/workspaces/new");
  }

  const currentUserRole = activeWorkspace.currentRole;

  return (
    <div className="w-full p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Cài đặt Workspace</h1>
        <p className="text-gray-500">Quản lý thông tin và cấu hình cho workspace {activeWorkspace.name}</p>
      </div>
      
      <WorkspaceSettingsView 
        workspaceId={activeWorkspace.id}
        initialName={activeWorkspace.name}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
