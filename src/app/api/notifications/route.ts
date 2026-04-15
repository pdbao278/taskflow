import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { NotificationService } from "@/lib/services/notification.service";
import { notification_type } from "@prisma/client";

/**
 * GET /api/notifications
 * Lấy list notification của user hiện tại (pagination)
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "30");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    const notifications = await NotificationService.listNotifications(user.id, limit, offset);
    return NextResponse.json({ success: true, data: notifications });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/notifications
 * Tạo notification (internal use, protected by internal token)
 */
export async function POST(request: NextRequest) {
  // Check internal token to prevent public access
  const internalToken = request.headers.get("x-internal-token");
  if (internalToken !== process.env.INTERNAL_API_TOKEN && process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, type, referenceId, content, triggeredById } = body;

    if (!userId || !type || !referenceId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const notification = await NotificationService.createNotification({
      userId,
      type: type as notification_type,
      referenceId,
      content,
      triggeredById,
    });

    return NextResponse.json({ success: true, data: notification });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
