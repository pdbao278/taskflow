import { getAuthUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { getActiveWorkspace } from "@/lib/workspace";
import { ProjectDetailClient } from "./_components/ProjectDetailClient";

export default async function ProjectDetailPage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  const user = await getAuthUser();
  if (!user) redirect("/login");

  const activeWorkspace = await getActiveWorkspace(user.id);
  if (!activeWorkspace) redirect("/app/workspaces/new");

  const currentUserRole = activeWorkspace.currentRole;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <ProjectDetailClient
        projectId={id}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
