import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/workspace";
import { task_status } from "@prisma/client";

// GET /api/tasks/my-tasks — List tasks assigned to the current user
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const statusParam = searchParams.get("status");
    const sortParam = searchParams.get("sort") || "due_date_asc";

    const ws = await resolveActiveWorkspace(user.id);
    if (!ws) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy workspace đang hoạt động" },
        { status: 400 }
      );
    }

    if (statusParam && statusParam !== "ToDo" && statusParam !== "InProgress") {
      return NextResponse.json(
        { success: false, error: "Invalid status parameter" },
        { status: 400 }
      );
    }

    const prisma = getPrisma();
    const tasks = await prisma.task.findMany({
      where: {
        workspace_id: ws.id,
        assignee_id: user.id,
        deleted_at: null,
        status: statusParam ? (statusParam as task_status) : { not: "Done" },
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    const now = new Date();
    
    tasks.sort((a: any, b: any) => {
      const aOverdue = a.due_date && new Date(a.due_date) < now;
      const bOverdue = b.due_date && new Date(b.due_date) < now;

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      if (!a.due_date && b.due_date) return 1;
      if (a.due_date && !b.due_date) return -1;
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }

      return 0;
    });

    const data = tasks.map((t: any) => ({
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
