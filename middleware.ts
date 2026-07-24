import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/services/auth/constants";

const MASTER_DEVELOPER_COOKIE = "fluxa_master_developer";

const protectedRoutes = [
  "/dashboard",
  "/organization",
  "/onboarding/organization",
  "/printers",
  "/analytics",
  "/reports",
  "/settings",
  "/profile",
  "/invitations",
  "/customer",
  "/employee",
];

function isProtected(pathname: string) {
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function withMiddlewareTiming(response: NextResponse, startedAt: number) {
  const duration = performance.now() - startedAt;
  response.headers.set("Server-Timing", `fluxa-middleware;dur=${duration.toFixed(1)}`);
  if (process.env.FLUXA_PERF_LOG === "1") {
    console.info(`[perf] middleware ${duration.toFixed(1)}ms`);
  }
  return response;
}

export function middleware(request: NextRequest) {
  const startedAt = performance.now();
  const { pathname } = request.nextUrl;

  if (pathname === "/developer/login") {
    return withMiddlewareTiming(NextResponse.next(), startedAt);
  }

  if (pathname.startsWith("/developer")) {
    const masterCookie = request.cookies.get(MASTER_DEVELOPER_COOKIE)?.value;
    if (masterCookie) {
      return withMiddlewareTiming(NextResponse.next(), startedAt);
    }
    const loginUrl = new URL("/developer/login", request.url);
    return withMiddlewareTiming(NextResponse.redirect(loginUrl), startedAt);
  }

  if (!isProtected(pathname)) return withMiddlewareTiming(NextResponse.next(), startedAt);

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie) return withMiddlewareTiming(NextResponse.next(), startedAt);

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);

  if (pathname.startsWith("/employee")) {
    loginUrl.searchParams.set("portal", "employee");
  } else if (pathname.startsWith("/organization")) {
    loginUrl.searchParams.set("portal", "organization");
  } else {
    loginUrl.searchParams.set("portal", "customer");
  }

  return withMiddlewareTiming(NextResponse.redirect(loginUrl), startedAt);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
