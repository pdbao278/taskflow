import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/workspace";
import z from "zod";
import { sanitizeText } from "@/lib/sanitization";

async function resolveWorkspace(userId: string) {
  const active = await resolveActiveWorkspace(userId);
  if (!active) return null;
  return { workspaceId: active.id, role: active.role };
}

// GET /api/tasks/[id]/comments
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
      return NextResponse.json({ success: false, error: "Không tìm thấy workspace đang hoạt động" }, { status: 400 });
    }

    const prisma = getPrisma();

    const task = await prisma.task.findUnique({
      where: { id },
      select: { workspace_id: true, deleted_at: true },
    });

    if (!task || task.deleted_at !== null) {
      return NextResponse.json({ success: false, error: "Task không tồn tại" }, { status: 404 });
    }

    if (task.workspace_id !== ws.workspaceId) {
      return NextResponse.json({ success: false, error: "Không có quyền truy cập task này" }, { status: 403 });
    }

    const comments = await prisma.comment.findMany({
      where: { task_id: id },
      orderBy: { created_at: "asc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: comments });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

const commentSchema = z.object({
  content: z.string().min(1, "Comment không được để trống").max(2000, "Comment tối đa 2000 ký tự"),
});

// POST /api/tasks/[id]/comments
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

    const ws = await resolveWorkspace(user.id);
    if (!ws) {
      return NextResponse.json({ success: false, error: "Không tìm thấy workspace đang hoạt động" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const rawContent = parsed.data.content;
    const content = sanitizeText(rawContent);

    if (!content.trim()) {
      return NextResponse.json({ success: false, error: "Comment không được để trống sau khi sanitize" }, { status: 400 });
    }

    const prisma = getPrisma();

    const task = await prisma.task.findUnique({
      where: { id },
      select: { workspace_id: true, deleted_at: true },
    });

    if (!task || task.deleted_at !== null) {
      return NextResponse.json({ success: false, error: "Task không tồn tại" }, { status: 404 });
    }

    if (task.workspace_id !== ws.workspaceId) {
      return NextResponse.json({ success: false, error: "Không có quyền truy cập task này" }, { status: 403 });
    }

    // Parse Mentions
    const allMembers = await prisma.workspaceMember.findMany({
      where: { workspace_id: ws.workspaceId },
      include: { user: { select: { id: true, name: true } } },
    });

    const mentionedUserIds = new Set<string>();
    allMembers.forEach((member: any) => {
      // Check if "@Name" is in content
      if (content.includes(`@${member.user.name}`)) {
        mentionedUserIds.add(member.user.id);
      }
    });

    const result = await prisma.$transaction(async (tx: any) => {
      // Create comment
      const newComment = await tx.comment.create({
        data: {
          task_id: id,
          user_id: user.id,
          content,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Create activity log
      await tx.activityLog.create({
        data: {
          task_id: id,
          user_id: user.id,
          action_type: "Comment",
          field_changed: "comment_created",
          new_value: content,
        },
      });

      // Create notifications
      const notificationsData: any[] = [];

      // 1. Mention notifications
      mentionedUserIds.forEach(targetId => {
        if (targetId !== user.id) {
          notificationsData.push({
            user_id: targetId,
            type: "Mention",
            reference_id: id,
            content: `${user.name} đã mention bạn trong task "${task!.workspace_id}"`, // Simplified content for mention
          });
        }
      });

      // 2. TaskCommented notification for assignee
      const taskWithAssignee = await tx.task.findUnique({
        where: { id },
        select: { assignee_id: true, title: true }
      });

      if (
        taskWithAssignee?.assignee_id && 
        taskWithAssignee.assignee_id !== user.id && 
        !mentionedUserIds.has(taskWithAssignee.assignee_id) // Avoid duplicate if assignee was already mentioned
      ) {
        notificationsData.push({
          user_id: taskWithAssignee.assignee_id,
          type: "TaskCommented",
          reference_id: id,
          content: `${user.name} đã comment vào task của bạn: "${taskWithAssignee.title}"`,
        });
      }

      if (notificationsData.length > 0) {
        await tx.notification.createMany({
          data: notificationsData,
        });
      }

      return newComment;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
