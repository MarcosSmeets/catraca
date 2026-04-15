import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwt } from "jose";

const AUTH_ROUTES = ["/login", "/cadastro"];
const PROTECTED_ROUTES = ["/cart", "/checkout", "/tickets", "/profile", "/orders"];

function isAdminToken(token: string): boolean {
  try {
    const payload = decodeJwt(token);
    const role = payload.role as string | undefined;
    return role === "admin" || role === "organizer";
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const isAdminLoginPage = pathname === "/admin/login";
  const isAdminRoute =
    pathname === "/admin" || pathname.startsWith("/admin/");

  const hasSession = request.cookies.has("refresh_token");
  const adminToken = request.cookies.get("admin_token")?.value;
  const hasValidAdminToken = adminToken ? isAdminToken(adminToken) : false;

  // Regular auth routes: redirect home if already logged in
  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Regular protected routes: require user session
  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin login page: redirect to dashboard if already logged in as admin
  if (isAdminLoginPage && hasValidAdminToken) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Admin routes (except login): require valid admin token
  if (isAdminRoute && !isAdminLoginPage && !hasValidAdminToken) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/cadastro",
    "/cart",
    "/checkout",
    "/checkout/:path*",
    "/tickets",
    "/profile",
    "/orders/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
