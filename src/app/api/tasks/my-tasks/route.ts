import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/workspace";
import { task_status } from "@prisma/client";

// GET /api/tasks/my-tasks — List tasks assigned to the current user (or a target member for Manager)
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const statusParam = searchParams.get("status");
    const userIdParam = searchParams.get("user_id"); // Manager read-only view (FR-11)

    const ws = await resolveActiveWorkspace(user.id);
    if (!ws) {
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

    // user_id param: chỉ Manager/Admin mới được dùng để xem task của member khác
    const isManagerOrAdmin = ws.role === "Manager" || ws.role === "Admin";
    const targetUserId = userIdParam && isManagerOrAdmin ? userIdParam : user.id;

    // Nếu Member cố tình truyền user_id khác → 403
    if (userIdParam && !isManagerOrAdmin && userIdParam !== user.id) {
      return NextResponse.json(
        { success: false, error: "Không có quyền xem task của người khác" },
        { status: 403 }
      );
    }

    const prisma = getPrisma();

    // Nếu Manager xem task của member khác, validate member thuộc workspace
    if (userIdParam && isManagerOrAdmin && userIdParam !== user.id) {
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspace_id_user_id: {
            workspace_id: ws.id,
            user_id: userIdParam,
          },
        },
      });
      if (!membership) {
        return NextResponse.json(
          { success: false, error: "Thành viên không thuộc workspace này" },
          { status: 404 }
        );
      }
    }

    const tasks = await prisma.task.findMany({
      where: {
        workspace_id: ws.id,
        assignee_id: targetUserId,
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
    
    tasks.sort((a: any, b: any) => {
      const aOverdue = a.due_date && new Date(a.due_date) < now;
      const bOverdue = b.due_date && new Date(b.due_date) < now;

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      if (!a.due_date && b.due_date) return 1;
      if (a.due_date && !b.due_date) return -1;
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }

      return 0;
    });

    const data = tasks.map((t: any) => ({
      ...t,
      assignee: t.assignee ?? { id: null, name: "[Removed User]", email: null },
    }));

    return NextResponse.json({
      success: true,
      data,
      // Trả về metadata để FE biết đây là read-only mode
      meta: {
        is_read_only: userIdParam !== null && userIdParam !== user.id,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
