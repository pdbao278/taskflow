import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/workspace";
import z from "zod";

function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

async function resolveWorkspace(userId: string) {
  const active = await resolveActiveWorkspace(userId);
  if (!active) return null;
  return { workspaceId: active.id, role: active.role };
}

/** Fetch a non-deleted task and verify workspace ownership. */
async function getTaskInWorkspace(taskId: string, workspaceId: string) {
  const prisma = getPrisma();
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { 
        select: { 
          id: true, 
          name: true, 
          email: true,
          workspace_members: {
            where: { workspace_id: workspaceId },
            select: { id: true }
          }
        } 
      },
      creator: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, color: true, archived_at: true } },
      activity_logs: {
        orderBy: { created_at: "desc" },
        take: 50,
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!task) return { task: null, error: "not_found" as const };
  if (task.deleted_at) return { task: null, error: "not_found" as const };
  if (task.workspace_id !== workspaceId) return { task: null, error: "forbidden" as const };

  return { task, error: null };
}

const updateTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Title không được để trống")
    .max(200, "Title tối đa 200 ký tự")
    .optional(),
  description: z
    .string()
    .max(5000, "Mô tả tối đa 5000 ký tự")
    .optional()
    .nullable(),
  assignee_id: z.string().optional().nullable(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
  due_date: z.string().datetime({ offset: true }).optional().nullable(),
  status: z.enum(["ToDo", "InProgress", "InReview", "Done"]).optional(),
});

// GET /api/tasks/:id
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const ws = await resolveWorkspace(user.id);
    if (!ws) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy workspace đang hoạt động" },
        { status: 400 }
      );
    }

    const { task, error } = await getTaskInWorkspace(id, ws.workspaceId);

    if (error === "not_found") {
      return NextResponse.json(
        { success: false, error: "Task không tồn tại" },
        { status: 404 }
      );
    }
    if (error === "forbidden") {
      return NextResponse.json(
        { success: false, error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // Assignee removed from workspace (onDelete: SetNull or workspace_member deleted) → show [Removed User]
    const isAssigneeActive = task!.assignee && (task!.assignee as any).workspace_members?.length > 0;
    const taskData = {
      ...task,
      assignee: isAssigneeActive 
        ? { id: task!.assignee!.id, name: task!.assignee!.name, email: task!.assignee!.email } 
        : { id: null, name: "[Removed User]", email: null },
      current_user_role: ws.role,
      current_user_id: user.id,
    };

    return NextResponse.json({ success: true, data: taskData });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/:id — creator | assignee | Manager | Admin
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const ws = await resolveWorkspace(user.id);
    if (!ws) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy workspace đang hoạt động" },
        { status: 400 }
      );
    }

    const { task, error } = await getTaskInWorkspace(id, ws.workspaceId);

    if (error === "not_found") {
      return NextResponse.json(
        { success: false, error: "Task không tồn tại" },
        { status: 404 }
      );
    }
    if (error === "forbidden") {
      return NextResponse.json(
        { success: false, error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // Authorization: creator | assignee | Manager | Admin (PRD FR-04 + US-02)
    const isManagerOrAdmin = ws.role === "Manager" || ws.role === "Admin";
    const isCreator = task!.created_by === user.id;
    const isAssignee = task!.assignee_id === user.id;

    const body = await req.json();
    const result = updateTaskSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, description, priority, due_date, status } = result.data;
    const assignee_id = result.data.assignee_id === "" ? null : result.data.assignee_id;

    // 1. Check permission for Status Change (PRD US-02)
    if (status !== undefined && status !== task!.status) {
      if (!isAssignee && !isCreator && !isManagerOrAdmin) {
        return NextResponse.json(
          { success: false, error: "Chỉ assignee, người tạo task hoặc Manager mới có thể đổi trạng thái" },
          { status: 403 }
        );
      }
    }

    // 2. Check permission for other fields (PRD roles table)
    const normalize = (v: any) => (v === undefined || v === null || v === "" ? null : v);

    const hasContentChanges = 
      (title !== undefined && normalize(title) !== normalize(task!.title)) ||
      (description !== undefined && normalize(description) !== normalize(task!.description)) ||
      (priority !== undefined && priority !== task!.priority) ||
      (due_date !== undefined && normalize(due_date) !== normalize(task!.due_date?.toISOString())) ||
      (assignee_id !== undefined && normalize(assignee_id) !== normalize(task!.assignee_id));

    // Rule: Member cannot change assignee (User Req)
    if (assignee_id !== undefined && normalize(assignee_id) !== normalize(task!.assignee_id)) {
      if (ws.role === "Member") {
        return NextResponse.json(
          { success: false, error: "Member không có quyền thay đổi người phân công" },
          { status: 403 }
        );
      }
    }

    if (hasContentChanges) {
      if (!isCreator && !isManagerOrAdmin) {
        return NextResponse.json(
          { success: false, error: "Chỉ creator hoặc Manager mới có thể chỉnh sửa nội dung task" },
          { status: 403 }
        );
      }
    }

    // Ensure user has AT LEAST some role (catch-all)
    if (!isManagerOrAdmin && !isCreator && !isAssignee) {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền chỉnh sửa task này" },
        { status: 403 }
      );
    }

    // If changing assignee, verify new assignee is a workspace member
    if (assignee_id !== undefined && assignee_id !== null) {
      const prisma = getPrisma();
      const assigneeMembership = await prisma.workspaceMember.findUnique({
        where: {
          workspace_id_user_id: {
            workspace_id: ws.workspaceId,
            user_id: assignee_id,
          },
        },
      });
      if (!assigneeMembership) {
        return NextResponse.json(
          { success: false, error: "Assignee không phải thành viên của workspace" },
          { status: 400 }
        );
      }
    }

    const prisma = getPrisma();

    // Build activity log entries for changed fields (PRD FR-10)
    type LogEntry = {
      task_id: string;
      user_id: string;
      action_type: "Update" | "StatusChange";
      field_changed: string;
      old_value: string | null;
      new_value: string | null;
    };
    const logEntries: LogEntry[] = [];

    const sanitizedTitle = title !== undefined ? sanitizeText(title) : undefined;
    const sanitizedDescription =
      description !== undefined
        ? description
          ? sanitizeText(description)
          : null
        : undefined;

    if (sanitizedTitle !== undefined && sanitizedTitle !== task!.title) {
      logEntries.push({
        task_id: id,
        user_id: user.id,
        action_type: "Update",
        field_changed: "title",
        old_value: task!.title,
        new_value: sanitizedTitle,
      });
    }
    if (sanitizedDescription !== undefined && sanitizedDescription !== task!.description) {
      logEntries.push({
        task_id: id,
        user_id: user.id,
        action_type: "Update",
        field_changed: "description",
        old_value: task!.description ?? null,
        new_value: sanitizedDescription,
      });
    }
    if (status !== undefined && status !== task!.status) {
      logEntries.push({
        task_id: id,
        user_id: user.id,
        action_type: "StatusChange",
        field_changed: "status",
        old_value: task!.status,
        new_value: status,
      });
    }
    if (priority !== undefined && priority !== task!.priority) {
      logEntries.push({
        task_id: id,
        user_id: user.id,
        action_type: "Update",
        field_changed: "priority",
        old_value: task!.priority,
        new_value: priority,
      });
    }
    if (assignee_id !== undefined && assignee_id !== task!.assignee_id) {
      logEntries.push({
        task_id: id,
        user_id: user.id,
        action_type: "Update",
        field_changed: "assignee",
        old_value: task!.assignee_id ?? null,
        new_value: assignee_id ?? null,
      });
    }
    if (due_date !== undefined) {
      const newDate = due_date ? new Date(due_date).toISOString() : null;
      const oldDate = task!.due_date ? task!.due_date.toISOString() : null;
      if (newDate !== oldDate) {
        logEntries.push({
          task_id: id,
          user_id: user.id,
          action_type: "Update",
          field_changed: "due_date",
          old_value: oldDate,
          new_value: newDate,
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id },
        data: {
          ...(sanitizedTitle !== undefined && { title: sanitizedTitle }),
          ...(sanitizedDescription !== undefined && { description: sanitizedDescription }),
          ...(assignee_id !== undefined && { assignee_id: assignee_id ?? null }),
          ...(priority !== undefined && { priority }),
          ...(due_date !== undefined && { due_date: due_date ? new Date(due_date) : null }),
          ...(status !== undefined && { status }),
        },
        include: {
          assignee: { 
            select: { 
              id: true, 
              name: true, 
              email: true,
              workspace_members: {
                where: { workspace_id: ws.workspaceId },
                select: { id: true }
              }
            } 
          },
          creator: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true, color: true, archived_at: true } },
          activity_logs: {
            orderBy: { created_at: "desc" },
            take: 50,
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Write all activity log entries (last-write-wins, PRD 10.1)
      if (logEntries.length > 0) {
        await tx.activityLog.createMany({ data: logEntries });
      }

      // Notify new assignee if assignee changed (FR-09)
      if (
        assignee_id !== undefined &&
        assignee_id !== null &&
        assignee_id !== task!.assignee_id &&
        assignee_id !== user.id
      ) {
        await tx.notification.create({
          data: {
            user_id: assignee_id,
            type: "TaskAssigned",
            reference_id: id,
            content: `Bạn được assign task mới: ${updatedTask.title}`,
          },
        });
      }

      // Special case: If due_date is changed to "soon" by someone else (Manager/Admin)
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const targetAssigneeId = assignee_id || updatedTask.assignee_id;

      if (
        due_date !== undefined &&
        due_date !== null &&
        updatedTask.status !== "Done" &&
        targetAssigneeId &&
        targetAssigneeId !== user.id
      ) {
        const newDue = new Date(due_date);
        if (newDue <= in24Hours) {
          await tx.notification.create({
            data: {
              user_id: targetAssigneeId,
              type: "TaskDueSoon",
              reference_id: id,
              content: `Hạn hoàn thành task "${updatedTask.title}" đã được đổi sang hôm nay/ngày mai`,
            },
          });
        }
      }

      return updatedTask;
    });

    const isAssigneeActive = updated.assignee && (updated.assignee as any).workspace_members?.length > 0;
    const taskData = {
      ...updated,
      assignee: isAssigneeActive 
        ? { id: updated.assignee!.id, name: updated.assignee!.name, email: updated.assignee!.email } 
        : { id: null, name: "[Removed User]", email: null },
      current_user_role: ws.role,
      current_user_id: user.id,
    };

    return NextResponse.json({ success: true, data: taskData });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/:id — Soft delete, Manager/Admin only (PRD FR-04)
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const ws = await resolveWorkspace(user.id);
    if (!ws) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy workspace đang hoạt động" },
        { status: 400 }
      );
    }

    // 4. Fetch task
    const { task, error } = await getTaskInWorkspace(id, ws.workspaceId);

    if (error === "not_found") {
      return NextResponse.json(
        { success: false, error: "Task không tồn tại" },
        { status: 404 }
      );
    }
    if (error === "forbidden") {
      return NextResponse.json(
        { success: false, error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // 5. Authorization: creator | Manager | Admin (PRD FR-04 update)
    const isManagerOrAdmin = ws.role === "Manager" || ws.role === "Admin";
    const isCreator = task!.created_by === user.id;

    if (!isCreator && !isManagerOrAdmin) {
      return NextResponse.json(
        { success: false, error: "Chỉ người tạo task hoặc Manager mới có thể xóa task" },
        { status: 403 }
      );
    }

    const prisma = getPrisma();

    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id },
        data: { deleted_at: new Date() },
      });

      await tx.activityLog.create({
        data: {
          task_id: id,
          user_id: user.id,
          action_type: "Other",
          field_changed: "deleted_at",
          old_value: null,
          new_value: new Date().toISOString(),
        },
      });
    });

    return NextResponse.json({ success: true, data: { id, deleted: true } });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
