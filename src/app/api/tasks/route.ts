import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import z from "zod";

// Strip all HTML tags to prevent XSS — PRD 10.1
function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

/** Resolve active workspace + role for the authenticated user. */
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

const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Title không được để trống")
    .max(200, "Title tối đa 200 ký tự"),
  description: z
    .string()
    .max(5000, "Mô tả tối đa 5000 ký tự")
    .optional()
    .nullable(),
  project_id: z
    .string()
    .min(1, "Project là bắt buộc"),
  assignee_id: z.string().optional().nullable(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
  due_date: z.string().datetime({ offset: true }).optional().nullable(),
  status: z
    .enum(["ToDo", "InProgress", "InReview", "Done"])
    .default("ToDo"),
});

// GET /api/tasks — List all tasks in the active workspace (Manager/Member view)
export async function GET(req: NextRequest) {
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

    const prisma = getPrisma();

    // Get filter params
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const assigneeId = searchParams.get("assigneeId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    const tasks = await prisma.task.findMany({
      where: {
        workspace_id: ws.workspaceId,
        deleted_at: null,
        ...(projectId && { project_id: projectId }),
        ...(assigneeId && { assignee_id: assigneeId }),
        ...(status && { status: status as any }),
        ...(priority && { priority: priority as any }),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { created_at: "desc" },
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

// POST /api/tasks — Manager and Member can create tasks (PRD FR-04)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const ws = await resolveWorkspace(user.id);
    if (!ws) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy workspace đang hoạt động" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const result = createTaskSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, description, project_id, priority, due_date, status } = result.data;
    const assignee_id = result.data.assignee_id || null; // Normalize empty string to null

    const prisma = getPrisma();

    // Verify project belongs to the active workspace
    const project = await prisma.project.findUnique({
      where: { id: project_id },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project không tồn tại" },
        { status: 404 }
      );
    }

    if (project.workspace_id !== ws.workspaceId) {
      return NextResponse.json(
        { success: false, error: "Project không thuộc workspace hiện tại" },
        { status: 403 }
      );
    }

    // Archived project cannot accept new tasks (PRD 10.1)
    if (project.archived_at) {
      return NextResponse.json(
        { success: false, error: "Không thể tạo task trong project đã bị archive" },
        { status: 400 }
      );
    }

    // Verify assignee is a workspace member (PRD FR-04)
    if (assignee_id) {
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

    const sanitizedTitle = sanitizeText(title);
    const sanitizedDescription = description ? sanitizeText(description) : null;

    // Create task + activity log + notification in a transaction
    const task = await prisma.$transaction(async (tx) => {
      const createdTask = await tx.task.create({
        data: {
          title: sanitizedTitle,
          description: sanitizedDescription,
          project_id,
          workspace_id: ws.workspaceId,
          assignee_id: assignee_id ?? null,
          priority,
          due_date: due_date ? new Date(due_date) : null,
          status,
          created_by: user.id,
        },
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
          project: {
            select: { id: true, name: true, color: true },
          },
        },
      });

      // Activity log — Create action (PRD FR-10)
      await tx.activityLog.create({
        data: {
          task_id: createdTask.id,
          user_id: user.id,
          action_type: "Create",
          new_value: sanitizedTitle,
        },
      });

      // Notification for assignee — FR-09 stub
      if (assignee_id && assignee_id !== user.id) {
        await tx.notification.create({
          data: {
            user_id: assignee_id,
            type: "TaskAssigned",
            reference_id: createdTask.id,
            content: `Bạn được assign task mới: ${sanitizedTitle}`,
          },
        });
      }

      return createdTask;
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
