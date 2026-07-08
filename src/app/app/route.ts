export const dynamic = "force-dynamic";

import { auth } from "../../lib/auth";
import { NextResponse, NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  // Try multiple possible paths for the public directory
  const paths = [
    join(process.cwd(), "public", "sensormodel.html"),
    join(process.cwd(), ".next", "server", "public", "sensormodel.html"),
    "/opt/render/project/src/public/sensormodel.html",
  ];

  for (const filePath of paths) {
    try {
      const html = await readFile(filePath, "utf-8");
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch {}
  }

  // Last resort: redirect to the static file directly
  return NextResponse.redirect(new URL("/sensormodel.html", req.url));
}
