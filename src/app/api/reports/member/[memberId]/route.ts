import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/workspace";

// GET /api/reports/member/:memberId — stats chi tiết của 1 member
export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await props.params;

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

    // Chỉ Manager và Admin được access Reports (PRD FR-11)
    if (ws.role === "Member") {
      return NextResponse.json(
        { success: false, error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const prisma = getPrisma();

    // Validate memberId thuộc workspace hiện tại (workspace isolation)
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: ws.id,
          user_id: memberId,
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: "Thành viên không thuộc workspace này" },
        { status: 404 }
      );
    }

    const now = new Date();

    // Lấy tasks của member trong workspace
    const tasks = await prisma.task.findMany({
      where: {
        workspace_id: ws.id,
        assignee_id: memberId,
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        due_date: true,
        project: { select: { id: true, name: true, color: true } },
      },
    });

    const assigned = tasks.length;
    const completed = tasks.filter((t) => t.status === "Done").length;
    const overdue = tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < now && t.status !== "Done"
    ).length;
    const completion_rate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        user: membership.user,
        role: membership.role,
        stats: { assigned, completed, overdue, completion_rate },
        tasks,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
