import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import z from "zod";

function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Tên project không được để trống")
    .max(200, "Tên project tối đa 200 ký tự")
    .optional(),
  description: z
    .string()
    .max(2000, "Mô tả tối đa 2000 ký tự")
    .optional()
    .nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Màu phải là hex hợp lệ (ví dụ: #3B82F6)")
    .optional(),
});

/** Resolve active workspace membership for the auth user. */
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

/** Fetch project ensuring it belongs to the given workspace. Returns 404 data if missing. */
async function getProjectInWorkspace(projectId: string, workspaceId: string) {
  const prisma = getPrisma();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project) return { project: null, error: "not_found" as const };
  if (project.workspace_id !== workspaceId) return { project: null, error: "forbidden" as const };
  return { project, error: null };
}

// GET /api/projects/:id
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

    const { project, error } = await getProjectInWorkspace(id, ws.workspaceId);

    if (error === "not_found") {
      return NextResponse.json({ success: false, error: "Project không tồn tại" }, { status: 404 });
    }
    if (error === "forbidden") {
      return NextResponse.json({ success: false, error: "Không có quyền truy cập" }, { status: 403 });
    }

    const prisma = getPrisma();

    const [totalTasks, completedTasks] = await Promise.all([
      prisma.task.count({
        where: { project_id: id, deleted_at: null },
      }),
      prisma.task.count({
        where: { project_id: id, deleted_at: null, status: "Done" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...project,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        current_user_role: ws.role,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/:id (Admin/Manager only)
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

    if (ws.role === "Member") {
      return NextResponse.json(
        { success: false, error: "Chỉ Admin hoặc Manager mới có thể cập nhật project" },
        { status: 403 }
      );
    }

    const { project, error } = await getProjectInWorkspace(id, ws.workspaceId);

    if (error === "not_found") {
      return NextResponse.json({ success: false, error: "Project không tồn tại" }, { status: 404 });
    }
    if (error === "forbidden") {
      return NextResponse.json({ success: false, error: "Không có quyền truy cập" }, { status: 403 });
    }

    const body = await req.json();
    const result = updateProjectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, description, color } = result.data;

    const prisma = getPrisma();
    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: sanitizeText(name) }),
        ...(description !== undefined && {
          description: description ? sanitizeText(description) : null,
        }),
        ...(color !== undefined && { color }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/:id — Archive project (Admin/Manager only)
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

    if (ws.role === "Member") {
      return NextResponse.json(
        { success: false, error: "Chỉ Admin hoặc Manager mới có thể archive project" },
        { status: 403 }
      );
    }

    const { project, error } = await getProjectInWorkspace(id, ws.workspaceId);

    if (error === "not_found") {
      return NextResponse.json({ success: false, error: "Project không tồn tại" }, { status: 404 });
    }
    if (error === "forbidden") {
      return NextResponse.json({ success: false, error: "Không có quyền truy cập" }, { status: 403 });
    }

    if (project!.archived_at) {
      return NextResponse.json(
        { success: false, error: "Project đã bị archive trước đó" },
        { status: 400 }
      );
    }

    const prisma = getPrisma();
    const archived = await prisma.project.update({
      where: { id },
      data: { archived_at: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: { ...archived, message: "Project đã được archive thành công" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
