import { cookies } from "next/headers";
import { getPrisma } from "./prisma";

/**
 * Lấy workspace đang hoạt động của user dựa trên cookie active_workspace_id.
 * Nếu không có cookie hoặc user không thuộc workspace đó, mặc định lấy workspace đầu tiên.
 */
export async function getActiveWorkspace(userId: string) {
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get("active_workspace_id")?.value;
  const prisma = getPrisma();

  // Fetch all workspaces user belongs to
  const memberships = await prisma.workspaceMember.findMany({
    where: { user_id: userId },
    include: { workspace: true },
    orderBy: { created_at: "asc" },
  });

  if (memberships.length === 0) {
    return null;
  }

  // Try to find the workspace from cookie
  if (activeWorkspaceId) {
    const active = memberships.find((m) => m.workspace_id === activeWorkspaceId);
    if (active) {
      return {
        ...active.workspace,
        currentRole: active.role,
        allWorkspaces: memberships.map(m => ({ 
          id: m.workspace_id, 
          name: m.workspace.name,
          role: m.role
        }))
      };
    }
  }

  // Fallback to the first one
  const first = memberships[0];
  return {
    ...first.workspace,
    currentRole: first.role,
    allWorkspaces: memberships.map(m => ({ 
      id: m.workspace_id, 
      name: m.workspace.name,
      role: m.role
    }))
  };
}

/**
 * Lightweight version of getActiveWorkspace for API routes.
 * Returns { id, role } or null if no workspaces.
 */
export async function resolveActiveWorkspace(userId: string) {
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get("active_workspace_id")?.value;
  const prisma = getPrisma();

  // Fetch all memberships for this user
  const memberships = await prisma.workspaceMember.findMany({
    where: { user_id: userId },
    select: { workspace_id: true, role: true },
    orderBy: { created_at: "asc" },
  });

  if (memberships.length === 0) return null;

  // Try to find by cookie
  if (activeWorkspaceId) {
    const active = memberships.find((m) => m.workspace_id === activeWorkspaceId);
    if (active) {
      return { id: active.workspace_id, role: active.role };
    }
  }

  // Fallback to first
  const first = memberships[0];
  return { id: first.workspace_id, role: first.role };
}
