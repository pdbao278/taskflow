import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

const verifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "Mã OTP phải có 6 chữ số"),
});

const MAX_RESET_FAILED_ATTEMPTS = 5;
const RESET_LOCK_DURATION_MINUTES = 30;

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parseResult = verifySchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }

    const { email, otp } = parseResult.data;
    const prisma = getPrisma();

    const user = (await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        otp_reset_code: true,
        otp_reset_expires_at: true,
        otp_reset_failed_attempts: true,
        otp_reset_locked_until: true,
      },
    })) as any;

    if (!user) {
      return NextResponse.json({ success: false, error: "Email không tồn tại trong hệ thống." }, { status: 404 });
    }

    const userData = user as any;

    // Check lock
    if (userData.otp_reset_locked_until && userData.otp_reset_locked_until > new Date()) {
      const remainingMs = userData.otp_reset_locked_until.getTime() - Date.now();
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      return NextResponse.json(
        {
          success: false,
          error: "Bạn đã nhập sai quá số lần cho phép. Vui lòng thử lại sau.",
          data: { remainingSeconds }
        },
        { status: 423 }
      );
    }

    // Verify OTP
    const isOtpMatch = userData.otp_reset_code === otp;
    const isExpired = userData.otp_reset_expires_at && userData.otp_reset_expires_at < new Date();

    if (!isOtpMatch || isExpired) {
      if (isExpired) {
        return NextResponse.json({ success: false, error: "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới." }, { status: 401 });
      }

      const failedAttempts = (userData.otp_reset_failed_attempts ?? 0) + 1;
      let lockedUntil: Date | null = null;

      if (failedAttempts >= MAX_RESET_FAILED_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + RESET_LOCK_DURATION_MINUTES * 60 * 1000);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          otp_reset_failed_attempts: failedAttempts,
          otp_reset_locked_until: lockedUntil,
        } as any,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Mã OTP không chính xác.",
          data: lockedUntil ? { remainingSeconds: RESET_LOCK_DURATION_MINUTES * 60 } : undefined
        },
        { status: 401 }
      );
    }

    // Success -> We don't clear OTP yet because it's needed in the final reset step
    // But we reset failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp_reset_failed_attempts: 0,
      } as any,
    });

    return NextResponse.json({
        success: true,
        data: { message: "Mã OTP hợp lệ." }
    });
  } catch (error) {
    console.error("Reset OTP verification error:", error);
    return NextResponse.json({ success: false, error: "Có lỗ xảy ra khi xác thực mã OTP." }, { status: 500 });
  }
}
