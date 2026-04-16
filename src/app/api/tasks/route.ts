import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/workspace";
import z from "zod";

import { sanitizeText } from "@/lib/sanitization";

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

    const ws = await resolveActiveWorkspace(user.id);
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

    // Pagination (NFR-01)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const where = {
      workspace_id: ws.id,
      deleted_at: null,
      ...(projectId && { project_id: projectId }),
      ...(assigneeId && { assignee_id: assigneeId }),
      ...(status && { status: status as any }),
      ...(priority && { priority: priority as any }),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, color: true } },
          assignee: { 
            select: { 
              id: true, 
              name: true, 
              email: true,
              workspace_members: {
                where: { workspace_id: ws.id },
                select: { id: true }
              }
            } 
          },
          creator: { select: { id: true, name: true } },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    // Handle removed users: Assignee must exist in DB AND still be part of the workspace.
    const data = tasks.map((t) => {
      const isAssigneeActive = t.assignee && t.assignee.workspace_members.length > 0;
      
      return {
        ...t,
        assignee: isAssigneeActive 
          ? { id: t.assignee!.id, name: t.assignee!.name, email: t.assignee!.email } 
          : { id: null, name: "[Removed User]", email: null },
      };
    });

    return NextResponse.json({ 
      success: true, 
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    });
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

    const ws = await resolveActiveWorkspace(user.id);
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
    
    // Rule: Member-created tasks are auto-assigned to self and cannot be assigned to others (User Req)
    const assignee_id = ws.role === "Member" 
      ? user.id 
      : (result.data.assignee_id || null);

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

    if (project.workspace_id !== ws.id) {
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
            workspace_id: ws.id,
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
          workspace_id: ws.id,
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

      // Notification for assignee (FR-09)
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
