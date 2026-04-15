import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/workspace";

/**
 * Lấy ISO week number và năm từ một Date.
 * Dùng thuật toán ISO 8601: tuần bắt đầu từ thứ Hai.
 */
function getISOWeekYear(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday (ISO week date)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);
  return { week, year };
}

/**
 * Tính ngày bắt đầu (Thứ Hai) và kết thúc (Chủ Nhật) của ISO week.
 */
function getISOWeekRange(year: number, week: number): { start: Date; end: Date } {
  // Ngày đầu tiên của năm
  const jan4 = new Date(Date.UTC(year, 0, 4)); // Jan 4 luôn trong tuần 1
  const dayOfWeek = jan4.getUTCDay() || 7; // 1=Mon ... 7=Sun
  const weekStart = new Date(jan4);
  weekStart.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);
  return { start: weekStart, end: weekEnd };
}

/**
 * Lấy 4 ISO weeks gần nhất (tuần hiện tại + 3 tuần trước).
 * Trả về mảng từ tuần cũ nhất đến mới nhất.
 */
function getLast4Weeks(): Array<{ key: string; label: string; start: Date; end: Date }> {
  const now = new Date();
  const { week: currentWeek, year: currentYear } = getISOWeekYear(now);

  const weeks: Array<{ key: string; label: string; start: Date; end: Date }> = [];

  for (let i = 3; i >= 0; i--) {
    let w = currentWeek - i;
    let y = currentYear;

    // Handle year boundary (week 0 or negative)
    if (w <= 0) {
      y -= 1;
      // Week 52 or 53 of previous year
      const dec28 = new Date(Date.UTC(y, 11, 28));
      const { week: lastWeekOfPrevYear } = getISOWeekYear(dec28);
      w = lastWeekOfPrevYear + w;
    }

    const { start, end } = getISOWeekRange(y, w);
    weeks.push({
      key: `${y}-W${String(w).padStart(2, "0")}`,
      label: `Tuần ${w}`,
      start,
      end,
    });
  }

  return weeks;
}

// GET /api/reports/weekly-completed — Manager/Admin only
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

    // Chỉ Manager và Admin được access Reports (PRD FR-11)
    if (ws.role === "Member") {
      return NextResponse.json(
        { success: false, error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const prisma = getPrisma();
    const weeks = getLast4Weeks();

    // Lấy boundary: từ đầu tuần cũ nhất đến cuối tuần hiện tại
    const rangeStart = weeks[0].start;
    const rangeEnd = weeks[3].end;

    // Query tasks Done trong khoảng 4 tuần
    // Dùng updated_at làm proxy cho thời điểm task được chuyển sang Done
    const doneTasks = await prisma.task.findMany({
      where: {
        workspace_id: ws.id,
        deleted_at: null,
        status: "Done",
        updated_at: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      select: {
        id: true,
        updated_at: true,
      },
    });

    // Group tasks vào từng tuần
    const result = weeks.map(({ key, label, start, end }) => {
      const count = doneTasks.filter((t) => {
        const d = new Date(t.updated_at);
        return d >= start && d <= end;
      }).length;

      return { week: key, label, count };
    });

    return NextResponse.json({ success: true, data: { weeks: result } });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
