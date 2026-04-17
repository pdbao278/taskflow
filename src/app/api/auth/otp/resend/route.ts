import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { emailService } from "@/lib/services/email.service";

export const runtime = "nodejs";

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parseResult = resendSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }

    const { email } = parseResult.data;
    const prisma = getPrisma();

    const user = (await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        otp_login_locked_until: true,
      },
    })) as any;

    if (!user) {
      return NextResponse.json({ success: false, error: "Tài khoản không tồn tại" }, { status: 404 });
    }

    const userData = user as any;

    // Check lock
    if (userData.otp_login_locked_until && userData.otp_login_locked_until > new Date()) {
      const remainingMs = userData.otp_login_locked_until.getTime() - Date.now();
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      return NextResponse.json(
        {
          success: false,
          error: "Bạn đã bị khóa. Vui lòng thử lại sau.",
          data: { otp_locked: true, remainingSeconds }
        },
        { status: 423 }
      );
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp_login_code: otp,
        otp_login_expires_at: otpExpiresAt,
        otp_login_failed_attempts: 0,
      } as any,
    });

    try {
      await emailService.sendOTP(user.email, otp, "LOGIN");
    } catch (emailError) {
      console.error("Failed to send OTP email in resend:", emailError);
      return NextResponse.json(
        { success: false, error: "Không thể gửi mã xác minh. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { message: "Đã gửi lại mã OTP." } });
  } catch (error) {
    console.error("OTP resend error:", error);
    return NextResponse.json({ success: false, error: "Có lỗi xảy ra khi gửi lại OTP." }, { status: 500 });
  }
}
