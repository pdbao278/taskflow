import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/workspace";

// GET /api/tasks/team — Lấy toàn bộ task trong workspace (dùng cho Kanban)
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

    // Role Validation: Chỉ Manager và Admin được access (PRD FR-08)
    if (ws.role === "Member") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Chỉ Quản lý mới có quyền xem Dashboard Team" },
        { status: 403 }
      );
    }

    const prisma = getPrisma();
    const { searchParams } = new URL(req.url);

    // Params mapping
    const assigneeId = searchParams.get("assignee_id");
    const projectId = searchParams.get("project_id");
    const priority = searchParams.get("priority");
    const dueFrom = searchParams.get("due_from");
    const dueTo = searchParams.get("due_to");
    const search = searchParams.get("search");

    // Validation (search max length)
    if (search && search.length > 200) {
      return NextResponse.json(
        { success: false, error: "Từ khóa tìm kiếm tối đa 200 ký tự" },
        { status: 400 }
      );
    }

    const tasks = await prisma.task.findMany({
      where: {
        workspace_id: ws.id,
        deleted_at: null, // Exclude soft-deleted tasks
        ...(projectId && { project_id: projectId }),
        ...(assigneeId && { assignee_id: assigneeId }),
        ...(priority && { priority: priority as any }),
        ...(search && {
          title: {
            contains: search,
            mode: "insensitive", // case-insensitive search
          },
        }),
        ...((dueFrom || dueTo) && {
          due_date: {
            ...(dueFrom && { gte: new Date(dueFrom) }),
            ...(dueTo && { lte: new Date(dueTo) }),
          },
        }),
      },
      include: {
        project: { select: { id: true, name: true, color: true, archived_at: true } },
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
      // PRD requires sort by due_date asc, nulls last
      orderBy: {
        due_date: {
          sort: "asc", 
          nulls: "last"
        }
      },
    });

    // Cleanup assignee (Removed Users fallback)
    const processedTasks = tasks.map((t) => {
      const isAssigneeActive = t.assignee && t.assignee.workspace_members.length > 0;
      return {
        ...t,
        assignee: isAssigneeActive 
          ? { id: t.assignee!.id, name: t.assignee!.name, email: t.assignee!.email } 
          : t.assignee_id ? { id: null, name: "[Removed User]", email: null } : null,
      };
    });

    // Grouping
    const columns = {
      "To Do": processedTasks.filter((t) => t.status === "ToDo"),
      "In Progress": processedTasks.filter((t) => t.status === "InProgress"),
      "In Review": processedTasks.filter((t) => t.status === "InReview"),
      "Done": processedTasks.filter((t) => t.status === "Done"),
    };

    return NextResponse.json({
      success: true,
      data: {
        columns,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
