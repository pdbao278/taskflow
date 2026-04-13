import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import MembersView from "./_components/MembersView";
import { redirect } from "next/navigation";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function MembersPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace(user.id);

  if (!activeWorkspace) {
    redirect("/app/workspaces/new");
  }

  const currentUserRole = activeWorkspace.currentRole;
  const isAdmin = currentUserRole === "Admin";
  const prisma = getPrisma();

  // Fetch members for the active workspace
  const membersData = await prisma.workspaceMember.findMany({
    where: { workspace_id: activeWorkspace.id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { created_at: "asc" },
  });

  // Fetch pending invites only if Admin
  let pendingInvites: any[] = [];
  if (isAdmin) {
    pendingInvites = await prisma.inviteToken.findMany({
      where: {
        workspace_id: activeWorkspace.id,
        accepted_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "asc" },
    });
  }

  const membersList = [
    ...membersData.map(m => ({
      id: m.user_id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      status: "Active" as const,
      joinedAt: m.created_at.toISOString(),
      isSelf: m.user_id === user.id
    })),
    ...(isAdmin ? pendingInvites.map(i => ({
      id: i.id,
      name: "-",
      email: i.email,
      role: i.role,
      status: "Pending" as const,
      joinedAt: i.created_at.toISOString(),
      isSelf: false,
      inviteToken: i.token,
      expiresAt: i.expires_at.toISOString()
    })) : [])
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-2">Thành viên Workspace</h1>
      <p className="text-gray-500 mb-8">Quản lý thành viên trong workspace {activeWorkspace.name}</p>
      
      <MembersView 
        initialMembers={membersList}
        workspaceId={activeWorkspace.id}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
