import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/jwt";

export const runtime = "nodejs";

const verifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "Mã OTP phải có 6 chữ số"),
});

const MAX_OTP_FAILED_ATTEMPTS = 5;
const OTP_LOCK_DURATION_MINUTES = 30;

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
        email: true,
        name: true,
        otp_login_code: true,
        otp_login_expires_at: true,
        otp_login_failed_attempts: true,
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
          error: "Bạn đã nhập sai quá số lần cho phép. Vui lòng thử lại sau.",
          data: { otp_locked: true, remainingSeconds }
        },
        { status: 423 }
      );
    }

    // Check if OTP match and not expired
    const isOtpMatch = userData.otp_login_code === otp;
    const isExpired = userData.otp_login_expires_at && userData.otp_login_expires_at < new Date();

    if (!isOtpMatch || isExpired) {
      if (isExpired) {
        return NextResponse.json({ success: false, error: "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới." }, { status: 401 });
      }

      const failedAttempts = (userData.otp_login_failed_attempts ?? 0) + 1;
      let lockedUntil: Date | null = null;

      if (failedAttempts >= MAX_OTP_FAILED_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + OTP_LOCK_DURATION_MINUTES * 60 * 1000);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          otp_login_failed_attempts: failedAttempts,
          otp_login_locked_until: lockedUntil,
        } as any,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Mã OTP không chính xác.",
          data: lockedUntil ? { otp_locked: true, remainingSeconds: OTP_LOCK_DURATION_MINUTES * 60 } : undefined
        },
        { status: 401 }
      );
    }

    // Success -> Clear OTP and set session
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp_login_code: null,
        otp_login_expires_at: null,
        otp_login_failed_attempts: 0,
        otp_login_locked_until: null,
      } as any,
    });

    const token = signAuthToken(user as any);

    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        },
      },
      { status: 200 },
    );

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json({ success: false, error: "Có lỗi xảy ra khi xác thực OTP." }, { status: 500 });
  }
}
