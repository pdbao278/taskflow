import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/workspace";

// POST /api/tasks/:id/restore — Restore a soft-deleted task, Manager/Admin only
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
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
        { success: false, error: "Chỉ Admin hoặc Manager mới có quyền khôi phục task" },
        { status: 403 }
      );
    }

    const prisma = getPrisma();

    // Fetch the task, even if it was deleted
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task không tồn tại" },
        { status: 404 }
      );
    }

    if (task.workspace_id !== ws.id) {
      return NextResponse.json(
        { success: false, error: "Không có quyền truy cập task này" },
        { status: 403 }
      );
    }

    if (!task.deleted_at) {
      return NextResponse.json(
        { success: false, error: "Task chưa bị xóa" },
        { status: 400 }
      );
    }

    // Check 30 days retention policy (NFR-07)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (task.deleted_at < thirtyDaysAgo) {
      return NextResponse.json(
        { success: false, error: "Task đã bị xóa quá 30 ngày và không thể khôi phục" },
        { status: 400 }
      );
    }

    const restoredTask = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id },
        data: { deleted_at: null },
      });

      // Log the restoration (NFR-07 Activity log immutability & audit trail)
      await tx.activityLog.create({
        data: {
          task_id: id,
          user_id: user.id,
          action_type: "Other",
          field_changed: "deleted_at",
          old_value: task.deleted_at?.toISOString() || null,
          new_value: null,
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, data: restoredTask });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
