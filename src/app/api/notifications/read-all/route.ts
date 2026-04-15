import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { NotificationService } from "@/lib/services/notification.service";

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await NotificationService.markAllAsRead(user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
