import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import z from "zod";

const acceptSchema = z.object({
  token: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = acceptSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: "Token không hợp lệ" }, { status: 400 });
    }

    const { token } = result.data;
    const prisma = getPrisma();

    const invite = await prisma.inviteToken.findUnique({ where: { token } });

    if (!invite) {
      return NextResponse.json({ success: false, error: "Link mời đã hết hạn. Vui lòng liên hệ Admin để được mời lại." }, { status: 404 });
    }

    if (invite.accepted_at) {
      return NextResponse.json({ success: false, error: "Bạn đã tham gia workspace này rồi." }, { status: 400 });
    }

    if (invite.expires_at < new Date()) {
      return NextResponse.json({ success: false, error: "Link mời đã hết hạn. Vui lòng liên hệ Admin để được mời lại." }, { status: 400 });
    }

    // Check if the current user's email matches the invite email?
    // Wait, requirement FR-02: User accept invite 2 lần -> reject. (Done by checking accepted_at and if they are a member).
    // What if the logged in user is different from the invited email?
    // "relax strict email identity checks" was mentioned in the user's objective text in conversation summarizing, so I will allow the logged in user to accept it, or I can enforce it depending. Let's make it more resilient. Let's check if the current user is already a member first.

    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: invite.workspace_id,
          user_id: user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ success: false, error: "Bạn đã tham gia workspace này rồi." }, { status: 400 });
    }

    // Accept invite in a transaction
    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          workspace_id: invite.workspace_id,
          user_id: user.id,
          role: invite.role,
        },
      }),
      prisma.inviteToken.update({
        where: { id: invite.id },
        data: { accepted_at: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true, data: { workspaceId: invite.workspace_id } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
