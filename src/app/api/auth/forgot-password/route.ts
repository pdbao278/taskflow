import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { emailService } from "@/lib/services/email.service";

export const runtime = "nodejs";

const forgotSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parseResult = forgotSchema.safeParse(json);

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
    })) as any;

    // Security: Don't reveal if user exists or not, but for this project we'll be simple
    if (!user) {
      return NextResponse.json({ success: false, error: "Email không tồn tại trong hệ thống." }, { status: 404 });
    }

    // Check if locked
    const userData = user as any;
    if (userData.otp_reset_locked_until && userData.otp_reset_locked_until > new Date()) {
      const remainingMs = userData.otp_reset_locked_until.getTime() - Date.now();
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      return NextResponse.json(
        { success: false, error: "Bạn đã bị khóa. Vui lòng thử lại sau.", data: { remainingSeconds } },
        { status: 423 }
      );
    }

    // Generate reset OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp_reset_code: otp,
        otp_reset_expires_at: otpExpiresAt,
        otp_reset_failed_attempts: 0,
      } as any,
    });

    try {
      await emailService.sendOTP(user.email, otp, "RESET_PASSWORD");
    } catch (emailError) {
      console.error("Failed to send reset OTP email:", emailError);
      return NextResponse.json(
        { success: false, error: "Không thể gửi mã xác minh. Vui lòng thử lại sau." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { message: "Mã OTP đã được gửi về email của bạn." } });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ success: false, error: "Có lỗi xảy ra. Vui lòng thử lại sau." }, { status: 500 });
  }
}
