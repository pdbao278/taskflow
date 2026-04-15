import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { NotificationService } from "@/lib/services/notification.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const isUnread = body.unread === true;

  try {
    if (isUnread) {
      await NotificationService.markAsUnread(id, user.id);
    } else {
      await NotificationService.markAsRead(id, user.id);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
