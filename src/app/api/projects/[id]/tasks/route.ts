import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/workspace";

async function resolveWorkspace(userId: string) {
  const active = await resolveActiveWorkspace(userId);
  if (!active) return null;
  return { workspaceId: active.id, role: active.role };
}

// GET /api/projects/:id/tasks
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await props.params;
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

    // Verify project belongs to workspace
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project không tồn tại" },
        { status: 404 }
      );
    }

    if (project.workspace_id !== ws.workspaceId) {
      return NextResponse.json(
        { success: false, error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const tasks = await prisma.task.findMany({
      where: {
        project_id: projectId,
        workspace_id: ws.workspaceId,
        deleted_at: null,
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
      },
      orderBy: [{ status: "asc" }, { due_date: "asc" }, { created_at: "desc" }],
    });

    // Assignee removed from workspace → show [Removed User] (PRD 10.1)
    const data = tasks.map((t) => {
      const isAssigneeActive = t.assignee && t.assignee.workspace_members.length > 0;
      
      return {
        ...t,
        assignee: isAssigneeActive 
          ? { id: t.assignee!.id, name: t.assignee!.name, email: t.assignee!.email } 
          : { id: null, name: "[Removed User]", email: null },
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
