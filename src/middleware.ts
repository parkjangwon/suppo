import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { BACKOFFICE_DASHBOARD_PATH, BACKOFFICE_LOGIN_PATH } from "@/lib/auth/config";

const PASSWORD_CHANGE_PATH = "/admin/change-password";

export default auth((request) => {
  const { nextUrl } = request;
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
  matcher: ["/admin/:path*"]
};
