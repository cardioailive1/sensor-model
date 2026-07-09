export const dynamic = "force-dynamic";

import { auth } from "../../lib/auth";
import { NextResponse, NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/auth/signin", req.nextUrl.origin));
  }

  const filePath = join(process.cwd(), "public", "sensormodel.html");

  try {
    let html = await readFile(filePath, "utf-8");

    const user = session.user as any;

    // Inject full user info including role
    const userScript = `
<script>
  window.SM_USER = {
    name:     ${JSON.stringify(user.name || "")},
    email:    ${JSON.stringify(user.email || "")},
    id:       ${JSON.stringify(user.id || "")},
    role:     ${JSON.stringify(user.role || "ENGINEER")},
    approved: ${JSON.stringify(user.approved || false)}
  };
  window.SM_API = ${JSON.stringify(req.nextUrl.origin)};
</script>`;

    html = html.replace("</head>", userScript + "\n</head>");

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache",
      },
    });
  } catch (err) {
    return new NextResponse(`File not found at: ${filePath}`, { status: 404 });
  }
}
