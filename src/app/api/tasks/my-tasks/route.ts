import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { task_status } from "@prisma/client";

// GET /api/tasks/my-tasks — List tasks assigned to the current user
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const statusParam = searchParams.get("status");
    const sortParam = searchParams.get("sort") || "due_date_asc";

    const cookieStore = await cookies();
    const activeWorkspaceId = cookieStore.get("active_workspace_id")?.value;

    if (!activeWorkspaceId) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy workspace đang hoạt động" },
        { status: 400 }
      );
    }

    if (statusParam && statusParam !== "ToDo" && statusParam !== "InProgress") {
      return NextResponse.json(
        { success: false, error: "Invalid status parameter" },
        { status: 400 }
      );
    }

    if (sortParam !== "due_date_asc") {
      return NextResponse.json(
        { success: false, error: "Invalid sort parameter" },
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
        status: statusParam ? (statusParam as task_status) : { not: "Done" },
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    const now = new Date();
    // Normalize now to start of day for accurate overdue calculation (due dates don't have times in this app? actually they could, let's just use regular < now for exact overdue based on timestamp)
    
    tasks.sort((a, b) => {
      const aOverdue = a.due_date && new Date(a.due_date) < now;
      const bOverdue = b.due_date && new Date(b.due_date) < now;

      // 1. Overdue comes first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // 2. due_date asc
      if (!a.due_date && b.due_date) return 1;
      if (a.due_date && !b.due_date) return -1;
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }

      return 0; // maintain original creation order if possible
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
