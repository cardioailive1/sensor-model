/**
 * Next.js Middleware
 * Protects all routes except public paths
 * Uses Node.js runtime (not Edge) to avoid Auth.js/jose compatibility issues
 */

import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/auth/signin",
  "/auth/error",
  "/auth/verify",
  "/api/auth",
  "/api/health",
  "/_next",
  "/favicon.ico",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Check for session cookie
  const sessionToken =
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!sessionToken) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const requestId = crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set("X-Request-Id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
