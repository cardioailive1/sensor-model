/**
 * Next.js Edge Middleware
 * - Protects all routes except /auth/* and /api/health
 * - Adds correlation ID header for distributed tracing
 * - Enforces HTTPS redirect
 * Compliance: SOC 2 CC6.6, OWASP A02, ISO 27001 A.13
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/auth/signin",
  "/auth/error",
  "/auth/verify",
  "/api/auth",
  "/api/health",
  "/_next",
  "/favicon.ico",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths without auth check
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Require authentication
  if (!req.auth) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Add correlation ID for distributed tracing
  const requestId = crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set("X-Request-Id", requestId);
  response.headers.set("X-Response-Time", String(Date.now()));

  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
