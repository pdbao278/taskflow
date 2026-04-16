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

    // Pagination (NFR-01)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const where = {
      workspace_id: ws.id,
      assignee_id: targetUserId,
      deleted_at: null,
      status: statusParam ? (statusParam as task_status) : { not: task_status.Done },
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, color: true } },
          assignee: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true } },
        },
        // Sort by due_date nulls last, then due_date asc (DB can't easily sort "overdue" first without extra logic, 
        // so we'll fetch a bit more or just keep simple DB sort and let FE handle highlight).
        // Actually for pagination, we MUST sort in DB.
        orderBy: [
          { status: "asc" }, // Just a stable sort
          { due_date: "asc" },
        ],
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    const now = new Date();
    
    // Sorting logic (simplified, DB sort is applied above, but we can re-sort locally if needed for small page sizes)
    // Note: Local sorting on a small page might be inconsistent across pages.
    // We'll trust the DB sort for pagination consistency.

    const data = tasks.map((t: any) => ({
      ...t,
      assignee: t.assignee ?? { id: null, name: "[Removed User]", email: null },
    }));

    return NextResponse.json({
      success: true,
      data,
      meta: {
        is_read_only: userIdParam !== null && userIdParam !== user.id,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
