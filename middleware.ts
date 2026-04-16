import { NextResponse, type NextRequest } from "next/server";
import { verifyAuthTokenEdge } from "./src/lib/jwtEdge";

// Simple in-memory rate limiter for demo/local use.
// Note: In production serverless environments, this should be replaced with Redis.
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATELIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

function isRateLimited(request: NextRequest): boolean {
  const ip = (request.ip || request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1") as string;
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.lastReset > RATELIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return false;
  }

  record.count++;
  if (record.count > MAX_REQUESTS) {
    return true;
  }

  return false;
}

const PROTECTED_APP_PREFIX = "/app";
const PROTECTED_API_PREFIX = "/api";
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/cron"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Rate Limiting Check (NFR-03: 100 req/phút per IP)
  if (isRateLimited(request)) {
    return NextResponse.json(
      { success: false, error: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút." },
      { status: 429 }
    );
  }

  // 2. Auth Check
  const isAppRoute = pathname.startsWith(PROTECTED_APP_PREFIX);
  const isApiRoute = pathname.startsWith(PROTECTED_API_PREFIX);
  const isPublicApi = PUBLIC_API_PREFIXES.some(prefix => pathname.startsWith(prefix));

  // If not a protected route, continue
  if (!isAppRoute && !(isApiRoute && !isPublicApi)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("message", "Phiên làm việc đã hết hạn.");
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyAuthTokenEdge(token);

  if (!payload) {
    if (isApiRoute) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("message", "Phiên làm việc đã hết hạn.");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/api/:path*"],
};
