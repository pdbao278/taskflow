import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/workspace";

// GET /api/tasks/trash — List soft-deleted tasks, Manager/Admin only
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const ws = await resolveActiveWorkspace(user.id);
    if (!ws) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy workspace đang hoạt động" },
        { status: 400 }
      );
    }

    // Role check: Admin or Manager (NFR-07)
    if (ws.role !== "Admin" && ws.role !== "Manager") {
      return NextResponse.json(
        { success: false, error: "Chỉ Admin hoặc Manager mới có quyền truy cập thùng rác" },
        { status: 403 }
      );
    }

    const prisma = getPrisma();

    // Fetch deleted tasks from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deletedTasks = await prisma.task.findMany({
      where: {
        workspace_id: ws.id,
        deleted_at: {
          not: null,
          gte: thirtyDaysAgo,
        },
      },
      include: {
        project: { select: { name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true } },
        activity_logs: {
          where: { field_changed: "deleted_at" },
          orderBy: { created_at: "desc" },
          take: 1,
          include: {
            user: { select: { name: true } },
          },
        },
      },
      orderBy: {
        deleted_at: "desc",
      },
    });

    const data = deletedTasks.map(task => ({
      ...task,
      deleted_by: task.activity_logs[0]?.user?.name || "Hệ thống",
      activity_logs: undefined, // Hide logs in response
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
