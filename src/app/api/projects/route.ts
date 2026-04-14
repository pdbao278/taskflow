import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import z from "zod";

// Sanitize: strip HTML tags to prevent XSS
function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Tên project không được để trống")
    .max(200, "Tên project tối đa 200 ký tự"),
  description: z
    .string()
    .max(2000, "Mô tả tối đa 2000 ký tự")
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Màu phải là hex hợp lệ (ví dụ: #3B82F6)"),
});

/** Resolve the active workspace for the authenticated user from cookie. */
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

// GET /api/projects — List all projects in the active workspace
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

    const projects = await prisma.project.findMany({
      where: { workspace_id: ws.workspaceId },
      orderBy: { created_at: "desc" },
      include: {
        _count: {
          select: {
            tasks: { where: { deleted_at: null } },
          },
        },
        tasks: {
          where: { deleted_at: null, status: "Done" },
          select: { id: true },
        },
      },
    });

    const data = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      color: p.color,
      archived_at: p.archived_at,
      created_at: p.created_at,
      updated_at: p.updated_at,
      workspace_id: p.workspace_id,
      total_tasks: p._count.tasks,
      completed_tasks: p.tasks.length,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/projects — Create a new project (Admin/Manager only)
export async function POST(req: NextRequest) {
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

    // Authorization: Admin or Manager only
    if (ws.role === "Member") {
      return NextResponse.json(
        { success: false, error: "Chỉ Admin hoặc Manager mới có thể tạo project" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = createProjectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, description, color } = result.data;

    const prisma = getPrisma();
    const project = await prisma.project.create({
      data: {
        workspace_id: ws.workspaceId,
        name: sanitizeText(name),
        description: description ? sanitizeText(description) : null,
        color,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...project,
          total_tasks: 0,
          completed_tasks: 0,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
