import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { cookies } from "next/headers";

// GET /api/workspaces/members — list all members of the active workspace
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const activeWorkspaceId = cookieStore.get("active_workspace_id")?.value;

    if (!activeWorkspaceId) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy workspace đang hoạt động" },
        { status: 400 }
      );
    }

    const prisma = getPrisma();

    // Verify requester is a member
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: activeWorkspaceId,
          user_id: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspace_id: activeWorkspaceId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { created_at: "asc" },
    });

    const data = members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
