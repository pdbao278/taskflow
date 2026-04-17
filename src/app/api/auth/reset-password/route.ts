import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export const runtime = "nodejs";

const resetSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
});

const MAX_RESET_FAILED_ATTEMPTS = 5;
const RESET_LOCK_DURATION_MINUTES = 30;

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parseResult = resetSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }

    const { email, otp, password } = parseResult.data;
    const prisma = getPrisma();

    const user = (await prisma.user.findUnique({
      where: { email },
    })) as any;

    if (!user) {
      return NextResponse.json({ success: false, error: "Tài khoản không tồn tại." }, { status: 404 });
    }

    const userData = user as any;

    // Check lock
    if (userData.otp_reset_locked_until && userData.otp_reset_locked_until > new Date()) {
      const remainingMs = userData.otp_reset_locked_until.getTime() - Date.now();
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      return NextResponse.json(
        { success: false, error: "Bạn đã bị khóa. Vui lòng thử lại sau.", data: { remainingSeconds } },
        { status: 423 }
      );
    }

    // Verify OTP
    const isOtpMatch = userData.otp_reset_code === otp;
    const isExpired = userData.otp_reset_expires_at && userData.otp_reset_expires_at < new Date();

    if (!isOtpMatch || isExpired) {
      if (isExpired) {
        return NextResponse.json({ success: false, error: "Mã OTP đã hết hạn." }, { status: 401 });
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
        { success: false, error: "Mã OTP không chính xác.", data: lockedUntil ? { remainingSeconds: RESET_LOCK_DURATION_MINUTES * 60 } : undefined },
        { status: 401 }
      );
    }

    // Hash new password and update
    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        otp_reset_code: null,
        otp_reset_expires_at: null,
        otp_reset_failed_attempts: 0,
        otp_reset_locked_until: null,
      } as any,
    });

    return NextResponse.json({ success: true, data: { message: "Mật khẩu của bạn đã được cập nhật thành công." } });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ success: false, error: "Có lỗi xảy ra khi đặt lại mật khẩu." }, { status: 500 });
  }
}
