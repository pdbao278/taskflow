import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = params.id;
    const prisma = getPrisma();

    // Verify user is member of workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Fetch members
    const members = await prisma.workspaceMember.findMany({
      where: { workspace_id: workspaceId },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { created_at: "asc" },
    });

    // Fetch pending invites
    const pendingInvites = await prisma.inviteToken.findMany({
      where: {
        workspace_id: workspaceId,
        accepted_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "asc" },
    });

    const activeList = members.map((m) => ({
      id: m.user_id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      status: "Active",
      joinedAt: m.created_at,
    }));

    const pendingList = pendingInvites.map((i) => ({
      id: i.id, // using token id
      name: "-",
      email: i.email,
      role: i.role,
      status: "Pending",
      joinedAt: i.created_at,
      inviteToken: i.token,
      expiresAt: i.expires_at
    }));

    return NextResponse.json({ success: true, data: [...activeList, ...pendingList] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
