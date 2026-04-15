import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification.service";

/**
 * GET /api/cron/notifications/due-soon
 * Scans for tasks due in the next 24 hours and creates notifications.
 * Protected by internal token.
 */
export async function GET(request: NextRequest) {
  // Check internal token to prevent public access
  const authHeader = request.headers.get("authorization");
  const internalToken = authHeader?.replace("Bearer ", "") || request.nextUrl.searchParams.get("token");
  
  if (internalToken !== process.env.INTERNAL_API_TOKEN && process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const prisma = getPrisma();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  try {
    console.log("[CRON] Scanning for tasks due soon...");
    console.log("[CRON] Now:", now.toISOString());
    console.log("[CRON] Start of Today:", startOfToday.toISOString());
    console.log("[CRON] In 24 Hours:", in24Hours.toISOString());

    // Find tasks that are:
    // 1. Not deleted
    // 2. Not done
    // 3. Have an assignee
    // 4. Due date is within the next 24 hours
    const tasksDueSoon = await prisma.task.findMany({
      where: {
        deleted_at: null,
        status: { not: "Done" },
        assignee_id: { not: null },
        due_date: {
          gte: startOfToday,
          lte: in24Hours,
        },
      },
      select: {
        id: true,
        title: true,
        due_date: true,
        assignee_id: true,
      },
    });

    console.log(`[CRON] Found ${tasksDueSoon.length} tasks matching criteria.`);
    if (tasksDueSoon.length > 0) {
      console.log("[CRON] Tasks:", JSON.stringify(tasksDueSoon.map(t => ({ id: t.id, due: t.due_date })), null, 2));
    }

    let count = 0;
    for (const task of tasksDueSoon) {
      if (!task.assignee_id) continue;

      const created = await NotificationService.createNotification({
        userId: task.assignee_id,
        type: "TaskDueSoon",
        referenceId: task.id,
        content: `Task "${task.title}" sắp đến hạn trong 24h`,
      });
      
      if (created) count++;
    }

    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
