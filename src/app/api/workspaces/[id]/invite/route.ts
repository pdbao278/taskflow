import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import z from "zod";
import { BrevoClient } from "@getbrevo/brevo";
import { randomBytes } from "crypto";

const inviteSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  role: z.enum(["Admin", "Manager", "Member"]),
});

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = params.id;
    const body = await req.json();
    const result = inviteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.issues[0].message }, { status: 400 });
    }

    const { email, role } = result.data;
    const prisma = getPrisma();

    // Map role to Vietnamese label
    const roleLabels: Record<string, string> = {
      Admin: "Quản trị viên",
      Manager: "Quản lý",
      Member: "Thành viên",
    };
    const roleLabel = roleLabels[role] || role;

    // Verify user is Admin of the workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
      include: { workspace: true },
    });

    if (!membership || membership.role !== "Admin") {
      return NextResponse.json({ success: false, error: "Chỉ Admin mới có quyền mời thành viên" }, { status: 403 });
    }

    // Check if email already member
    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (targetUser) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspace_id_user_id: {
            workspace_id: workspaceId,
            user_id: targetUser.id,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json({ success: false, error: "Email này đã là thành viên của workspace." }, { status: 400 });
      }
    }

    // Upsert invite token
    await prisma.inviteToken.deleteMany({
      where: { workspace_id: workspaceId, email },
    });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48h expiration

    await prisma.inviteToken.create({
      data: {
        workspace_id: workspaceId,
        email,
        token,
        expires_at: expiresAt,
        role,
      },
    });

    // Send email via Brevo
    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || "no-reply@taskflow.app";
    const senderName = process.env.BREVO_SENDER_NAME || "TaskFlow";
    
    // Ưu tiên dùng NEXT_PUBLIC_APP_URL cho các môi trường deploy (Vercel)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invite?token=${token}`;
    
    if (brevoApiKey) {
      const brevo = new BrevoClient({ apiKey: brevoApiKey });
      
      try {
        await brevo.transactionalEmails.sendTransacEmail({
          subject: `Lời mời tham gia workspace ${membership.workspace.name}`,
          sender: { name: senderName, email: senderEmail },
          to: [{ email: email }],
          htmlContent: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
              <h2>Chào bạn,</h2>
              <p>Bạn được mời tham gia vào workspace <strong>${membership.workspace.name}</strong> trên hệ thống <b>TaskFlow</b>.</p>
              <p>📍 Vai trò của bạn: <strong>${roleLabel}</strong></p>
              <p>Vui lòng nhấn vào nút dưới đây để chấp nhận lời mời (Link có hiệu lực trong 48 giờ):</p>
              <div style="margin: 30px 0;">
                <a href="${inviteUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Tham gia ngay</a>
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #999;">Nếu bạn không yêu cầu lời mời này, vui lòng bỏ qua email.</p>
            </div>
          `,
        });
      } catch (brevoError: any) {
        console.error("Brevo error:", brevoError);
        return NextResponse.json({ success: false, error: "Lỗi khi gửi email qua Brevo. Vui lòng kiểm tra lại cấu hình." }, { status: 500 });
      }
    } else {
      console.log(`[Mock Email] To: ${email}, Role: ${roleLabel}, Link: ${inviteUrl}`);
    }

    return NextResponse.json({ success: true, data: { message: "Đã gửi lời mời" } });
  } catch (err: any) {
    console.error("Invite error:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
