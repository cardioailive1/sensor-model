import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/auth",
  "/api/auth",
  "/api/health",
  "/api/register",
  "/_next",
  "/favicon.ico",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const cookies = req.cookies.getAll();
  const hasSession = cookies.some(
    (c) =>
      c.name.includes("authjs.session-token") ||
      c.name.includes("next-auth.session-token") ||
      c.name.includes("__Secure-authjs.session-token") ||
      c.name.includes("__Secure-next-auth.session-token")
  );

  if (!hasSession) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
