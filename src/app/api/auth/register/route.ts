import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { hashPassword, findUserByEmail } from "@/lib/auth";
import { signAuthToken } from "@/lib/jwt";

export const runtime = "nodejs";

const registerSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  name: z.string().min(1, "Tên không được để trống").max(100),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parseResult = registerSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        },
        { status: 400 },
      );
    }

    const { email, name, password } = parseResult.data;

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Email này đã được đăng ký. Bạn có muốn đăng nhập không?",
        },
        { status: 400 },
      );
    }

    const password_hash = await hashPassword(password);

    const user = await getPrisma().user.create({
      data: {
        email,
        name,
        password_hash,
      },
    });

    const token = signAuthToken(user);

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
      { status: 201 },
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
    console.error("Register error", error);

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

