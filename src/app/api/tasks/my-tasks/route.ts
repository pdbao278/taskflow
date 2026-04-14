import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { cookies } from "next/headers";

// GET /api/tasks/my-tasks — List tasks assigned to the current user
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const activeWorkspaceId = cookieStore.get("active_workspace_id")?.value;

    if (!activeWorkspaceId) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy workspace đang hoạt động" },
        { status: 400 }
      );
    }

    const prisma = getPrisma();

    // Verify requester is a member of the workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: activeWorkspaceId,
          user_id: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const tasks = await prisma.task.findMany({
      where: {
        workspace_id: activeWorkspaceId,
        assignee_id: user.id,
        deleted_at: null,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
      },
      // PRD US-03: Sort by overdue first, then by due_date asc, then by status
      orderBy: [
        { due_date: "asc" },
        { created_at: "desc" },
      ],
    });

    // Handle removed users
    const data = tasks.map((t) => ({
      ...t,
      assignee: t.assignee ?? { id: null, name: "[Removed User]", email: null },
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
