import { getAuthUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { TeamKanbanClient } from "./_components/TeamKanbanClient";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function TeamPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace(user.id);
  const role = activeWorkspace?.currentRole || "Member";

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Team Kanban</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Xem và quản lý tất cả công việc của team trong workspace này.
        </p>
      </div>

      <TeamKanbanClient
        currentUserRole={role}
        currentUserId={user.id}
      />
    </div>
  );
}
