import { NextResponse, type NextRequest } from "next/server";
import { verifyAuthToken } from "./src/lib/jwt";

const PROTECTED_PREFIX = "/app";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("message", "Phiên làm việc đã hết hạn.");
    return NextResponse.redirect(loginUrl);
  }

  const payload = verifyAuthToken(token);

  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("message", "Phiên làm việc đã hết hạn.");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};

