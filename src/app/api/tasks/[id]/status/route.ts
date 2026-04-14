import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import z from "zod";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolveWorkspace(userId: string) {
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get("active_workspace_id")?.value;
  const prisma = getPrisma();

  if (!activeWorkspaceId) return null;

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: activeWorkspaceId,
        user_id: userId,
      },
    },
  });

  if (!membership) return null;
  return { workspaceId: activeWorkspaceId, role: membership.role };
}

// ─── Validation schema ────────────────────────────────────────────────────────

const statusSchema = z.object({
  status: z.enum(["ToDo", "InProgress", "InReview", "Done"], {
    message: 'Status không hợp lệ. Phải là "ToDo" | "InProgress" | "InReview" | "Done"',
  }),
});

// ─── PATCH /api/tasks/:id/status ──────────────────────────────────────────────
// Authorization: assignee của task | Manager | Admin (PRD FR-05 / US-02)
// Business logic:
//   - Cập nhật status + updated_at
//   - Ghi activity_log (action_type = StatusChange, field_changed = "status")
//   - last-write-wins cho concurrent updates (PRD 10.1)
//   - Task thuộc project đã archive → vẫn update được (PRD 10.1)
//   - Task overdue → vẫn update bình thường (PRD 10.1)

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  try {
    // 1. Auth
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Workspace
    const ws = await resolveWorkspace(user.id);
    if (!ws) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy workspace đang hoạt động" },
        { status: 400 }
      );
    }

    // 3. Validate body
    const body = await req.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { status: newStatus } = parsed.data;

    const prisma = getPrisma();

    // 4. Fetch task (không dùng getTaskInWorkspace vì cần phân biệt deleted vs not-found)
    const task = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        assignee_id: true,
        created_by: true,
        workspace_id: true,
        deleted_at: true,
      },
    });

    // 404 — task không tồn tại
    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task không tồn tại" },
        { status: 404 }
      );
    }

    // 400 — task đã bị soft delete (phân biệt với 404)
    if (task.deleted_at !== null) {
      return NextResponse.json(
        { success: false, error: "Task đã bị xóa, không thể cập nhật trạng thái" },
        { status: 400 }
      );
    }

    // 403 — task không thuộc workspace hiện tại
    if (task.workspace_id !== ws.workspaceId) {
      return NextResponse.json(
        { success: false, error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // 5. Authorization: assignee || creator || Manager/Admin (PRD US-02)
    const isManagerOrAdmin = ws.role === "Manager" || ws.role === "Admin";
    const isAssignee = task.assignee_id === user.id;
    const isCreator = task.created_by === user.id;

    if (!isAssignee && !isCreator && !isManagerOrAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Chỉ assignee, người tạo task hoặc Manager mới có thể đổi trạng thái",
        },
        { status: 403 }
      );
    }

    // 6. No-op nếu status giống hiện tại
    if (task.status === newStatus) {
      return NextResponse.json({
        success: true,
        data: { id: task.id, status: task.status, updated: false },
      });
    }

    // 7. Transaction: cập nhật status + ghi activity_log (PRD FR-10)
    const updated = await prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id },
        data: { status: newStatus },
        select: {
          id: true,
          status: true,
          updated_at: true,
          assignee_id: true,
          workspace_id: true,
        },
      });

      // Activity log — ghi đầy đủ old → new (PRD 10.1: ghi từng lần kể cả concurrent)
      await tx.activityLog.create({
        data: {
          task_id: id,
          user_id: user.id,
          action_type: "StatusChange",
          field_changed: "status",
          old_value: task.status,
          new_value: newStatus,
        },
      });

      return updatedTask;
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        updated_at: updated.updated_at,
        updated: true,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
