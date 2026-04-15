import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/workspace";

// GET /api/reports/summary — Manager/Admin only
export async function GET() {
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

    // PRD FR-11: Chỉ Manager và Admin được access Reports
    if (ws.role === "Member") {
      return NextResponse.json(
        { success: false, error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const prisma = getPrisma();
    const now = new Date();

    // Lấy tất cả thành viên workspace (không bao gồm user đã bị xóa khỏi workspace)
    const members = await prisma.workspaceMember.findMany({
      where: { workspace_id: ws.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { created_at: "asc" },
    });

    // Lấy tất cả task có assignee trong workspace (không bao gồm soft-deleted)
    const tasks = await prisma.task.findMany({
      where: {
        workspace_id: ws.id,
        deleted_at: null,
        assignee_id: { not: null },
      },
      select: {
        id: true,
        assignee_id: true,
        status: true,
        due_date: true,
      },
    });

    // Tính stats per-member
    const memberStats = members.map((m) => {
      const memberTasks = tasks.filter((t) => t.assignee_id === m.user_id);

      const assigned = memberTasks.length;
      const completed = memberTasks.filter((t) => t.status === "Done").length;

      // Overdue: due_date < now AND status != Done (PRD section 10)
      const overdue = memberTasks.filter(
        (t) => t.due_date && new Date(t.due_date) < now && t.status !== "Done"
      ).length;

      // Completion rate: tránh chia 0 (PRD data logic)
      const completion_rate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

      return {
        user_id: m.user_id,
        name: m.user.name,
        email: m.user.email,
        assigned,
        completed,
        overdue,
        completion_rate,
      };
    });

    // Sắp xếp giảm dần theo completion_rate (PRD UX: default sort)
    memberStats.sort((a, b) => b.completion_rate - a.completion_rate);

    return NextResponse.json({ success: true, data: { members: memberStats } });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
