import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/workspace";
import z from "zod";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolveWorkspace(userId: string) {
  const active = await resolveActiveWorkspace(userId);
  if (!active) return null;
  return { workspaceId: active.id, role: active.role };
}

// ─── Validation ──────────────────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── GET /api/tasks/:id/activity ─────────────────────────────────────────────
// PRD FR-10: Activity Log — append-only, immutable, sorted desc by created_at
// Authorization: Any workspace member (Member, Manager, Admin) can view
// Pagination: page + limit (default 20, max 100)

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await props.params;

  try {
    // 1. Auth
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Workspace membership
    const ws = await resolveWorkspace(user.id);
    if (!ws) {
      return NextResponse.json(
        { success: false, error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const prisma = getPrisma();

    // 3. Verify task exists and belongs to workspace
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, workspace_id: true, deleted_at: true },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task không tồn tại" },
        { status: 404 }
      );
    }

    if (task.workspace_id !== ws.workspaceId) {
      return NextResponse.json(
        { success: false, error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // 4. Parse pagination params
    const { searchParams } = new URL(req.url);
    const parsed = paginationSchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const page = parsed.success ? parsed.data.page : 1;
    const limit = parsed.success ? parsed.data.limit : 20;
    const skip = (page - 1) * limit;

    // 5. Fetch activity logs with user info + workspace membership for [Removed User] check
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { task_id: taskId },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              workspace_members: {
                where: { workspace_id: ws.workspaceId },
                select: { id: true },
              },
            },
          },
        },
      }),
      prisma.activityLog.count({ where: { task_id: taskId } }),
    ]);

    // 6. Map user data — handle removed users (PRD 10.1)
    const data = logs.map((log) => {
      const isUserActive =
        log.user && (log.user as any).workspace_members?.length > 0;

      return {
        id: log.id,
        task_id: log.task_id,
        action_type: log.action_type,
        field_changed: log.field_changed,
        old_value: log.old_value,
        new_value: log.new_value,
        created_at: log.created_at,
        user: log.user
          ? isUserActive
            ? { id: log.user.id, name: log.user.name }
            : { id: log.user.id, name: "[Removed User]" }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
