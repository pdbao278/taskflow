import { getAuthUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { getActiveWorkspace } from "@/lib/workspace";
import { ProjectsClient } from "./_components/ProjectsClient";

export default async function ProjectsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const activeWorkspace = await getActiveWorkspace(user.id);
  if (!activeWorkspace) redirect("/app/workspaces/new");

  const currentUserRole = activeWorkspace.currentRole;

  return (
    <div className="w-full p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Dự án</h1>
        <p className="text-zinc-500 mt-1">
          Tất cả dự án trong workspace <span className="font-medium text-zinc-700">{activeWorkspace.name}</span>
        </p>
      </div>

      <ProjectsClient
        workspaceId={activeWorkspace.id}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
