import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { comparePassword, findUserByEmail } from "@/lib/auth";
import { signAuthToken } from "@/lib/jwt";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Mật khẩu không được để trống"),
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parseResult = loginSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        },
        { status: 400 },
      );
    }

    const { email, password } = parseResult.data;

    const user = await findUserByEmail(email, { forAuth: true });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Email hoặc mật khẩu không đúng.",
        },
        { status: 401 },
      );
    }

    const lockedUntil = (user as any).locked_until as Date | null | undefined;
    if (lockedUntil && lockedUntil > new Date()) {
      const remainingMs = lockedUntil.getTime() - Date.now();
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

      return NextResponse.json(
        {
          success: false,
          error: "Tài khoản tạm bị khóa do nhập sai mật khẩu nhiều lần.",
          data: {
            locked: true,
            remainingSeconds,
          },
        },
        { status: 423 },
      );
    }

    const passwordOk = await comparePassword(password, (user as any).password_hash);

    if (!passwordOk) {
      const failedAttempts = ((user as any).failed_login_attempts ?? 0) + 1;

      let locked_until: Date | null = null;
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        locked_until = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      }

      await getPrisma().user.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: failedAttempts,
          locked_until,
        } as any,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Email hoặc mật khẩu không đúng.",
          data: locked_until
            ? {
                locked: true,
                remainingSeconds: LOCK_DURATION_MINUTES * 60,
              }
            : undefined,
        },
        { status: 401 },
      );
    }

    // Credentials valid -> Login immediately (No OTP)
    // Reset login failure count
    await getPrisma().user.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: 0,
        locked_until: null,
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
    console.error("Login error", error);

    // Make failures actionable (do not leak secrets).
    if (error instanceof Error) {
      if (error.message.includes("DATABASE_URL is still using placeholder")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Không thể kết nối database (DATABASE_URL đang dùng placeholder). Vui lòng cập nhật `.env` với thông tin PostgreSQL thật.",
          },
          { status: 500 },
        );
      }
      if (error.message.includes("DATABASE_URL is not set")) {
        return NextResponse.json(
          { success: false, error: "Thiếu `DATABASE_URL` trong `.env`." },
          { status: 500 },
        );
      }
    }

    const anyErr = error as any;
    if (anyErr?.code === "P1000") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Không thể đăng nhập do database không xác thực được. Vui lòng kiểm tra `DATABASE_URL` trong `.env`.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Có lỗi xảy ra. Vui lòng thử lại.",
      },
      { status: 500 },
    );
  }
}
