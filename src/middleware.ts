import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { canAccessModule } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/api/health",
  "/api/settings/public",
  "/sw.js",
  "/manifest.webmanifest",
  "/offline",
  "/.well-known",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 공개 경로 통과
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // API 요청: 로그인 세션 없으면 401
  if (pathname.startsWith("/api")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 그 외 페이지들
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !token.id) {
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 인증됨: /login 으로 가면 dashboard 로
  if (pathname === "/login" || pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 모듈별 권한 검사
  const allowed = canAccessModule(pathname, token.role as UserRole | undefined);
  if (!allowed) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};