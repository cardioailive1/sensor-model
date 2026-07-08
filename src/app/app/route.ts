export const dynamic = "force-dynamic";

import { auth } from "../../lib/auth";
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect("/auth/signin");
  }

  try {
    const filePath = join(process.cwd(), "public", "sensormodel.html");
    const html = await readFile(filePath, "utf-8");
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return new NextResponse("App not found", { status: 404 });
  }
}
