import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { BACKOFFICE_DASHBOARD_PATH, BACKOFFICE_LOGIN_PATH } from "@/lib/auth/config";

export default auth((request) => {
  const { nextUrl } = request;
  const isLoginRoute = nextUrl.pathname === BACKOFFICE_LOGIN_PATH;
  const isAuthenticated = Boolean(request.auth);

  if (!isAuthenticated && !isLoginRoute) {
    return NextResponse.redirect(new URL(BACKOFFICE_LOGIN_PATH, nextUrl));
  }

  if (isAuthenticated && isLoginRoute) {
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
