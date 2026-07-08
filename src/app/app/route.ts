export const dynamic = "force-dynamic";

import { auth } from "../../lib/auth";
import { NextResponse, NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    const signinUrl = new URL("/auth/signin", req.nextUrl.origin);
    return NextResponse.redirect(signinUrl);
  }

  const filePath = join(process.cwd(), "public", "sensormodel.html");
  
  try {
    let html = await readFile(filePath, "utf-8");
    
    // Inject user info dynamically into the page
    const user = session.user as any;
    const userScript = `
<script>
  window.SM_USER = ${JSON.stringify({ name: user.name, email: user.email, id: user.id })};
  window.SM_API = "${req.nextUrl.origin}";
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
