import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BACKOFFICE_DASHBOARD_PATH, BACKOFFICE_LOGIN_PATH } from "@/lib/auth/config";

const PASSWORD_CHANGE_PATH = "/admin/change-password";

// APP_TYPE 환경변수 분기
const APP_TYPE = process.env.APP_TYPE;
const PUBLIC_URL = process.env.PUBLIC_URL ?? "";
const ADMIN_URL = process.env.ADMIN_URL ?? "";

// Public 전용 경로
const PUBLIC_ONLY = ["/knowledge", "/tickets", "/survey"];

export default auth((request) => {
  const { nextUrl } = request;

  // Public 컨테이너: /admin/* 요청을 admin 컨테이너로 보냄
  if (APP_TYPE === "public" && nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.redirect(ADMIN_URL + nextUrl.pathname + nextUrl.search);
  }

  // Admin 컨테이너: public 전용 경로를 public 컨테이너로 보냄
  if (APP_TYPE === "admin" && PUBLIC_ONLY.some(p => nextUrl.pathname.startsWith(p))) {
    return NextResponse.redirect(PUBLIC_URL + nextUrl.pathname + nextUrl.search);
  }

  // Admin 앱이 루트 페이지("/") 접근 시 대시보드로 리다이렉트
  if (APP_TYPE === "admin" && nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
  }

  const isLoginRoute = nextUrl.pathname === BACKOFFICE_LOGIN_PATH;
  const isPasswordChangeRoute = nextUrl.pathname === PASSWORD_CHANGE_PATH;
  const isApiRoute = nextUrl.pathname.startsWith("/api/");
  const isAuthenticated = Boolean(request.auth);
  const user = request.auth?.user as { isInitialPassword?: boolean } | undefined;
  const requiresPasswordChange = user?.isInitialPassword === true;

  if (!isAuthenticated && !isLoginRoute) {
    return NextResponse.redirect(new URL(BACKOFFICE_LOGIN_PATH, nextUrl));
  }

  if (isAuthenticated && isLoginRoute && !requiresPasswordChange) {
    return NextResponse.redirect(new URL(BACKOFFICE_DASHBOARD_PATH, nextUrl));
  }

  if (isAuthenticated && requiresPasswordChange && !isPasswordChangeRoute && !isApiRoute) {
    return NextResponse.redirect(new URL(PASSWORD_CHANGE_PATH, nextUrl));
  }

  if (isAuthenticated && !requiresPasswordChange && isPasswordChangeRoute) {
    return NextResponse.redirect(new URL(BACKOFFICE_DASHBOARD_PATH, nextUrl));
  }

  const requestHeaders = new Headers(request.headers);
  if (request.auth?.user?.role) {
    requestHeaders.set("x-backoffice-role", request.auth.user.role);
  }
  if (request.auth?.user?.agentId) {
    requestHeaders.set("x-backoffice-agent-id", request.auth.user.agentId);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
});

export const config = {
  matcher: ["/admin/:path*", "/knowledge/:path*", "/tickets/:path*", "/survey/:path*"]
};
