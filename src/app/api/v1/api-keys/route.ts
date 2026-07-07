/**
 * GET  /api/v1/api-keys  — list user's API keys (no secrets returned)
 * POST /api/v1/api-keys  — create new API key (secret returned ONCE)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CreateApiKeySchema } from "@/lib/schemas";
import { generateApiKey } from "@/lib/apikey";
import { prisma } from "@/lib/prisma";
import { apiLimiter, rateLimitResponse } from "@/lib/ratelimit";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const rl = apiLimiter(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  const keys = await prisma.apiKey.findMany({
    where: { userId, revokedAt: null },
    select: {
      id: true, name: true, prefix: true, scopes: true,
      createdAt: true, lastUsedAt: true, expiresAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: keys });
}

export async function POST(req: NextRequest) {
  const rl = apiLimiter(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const orgId  = (session.user as any).orgId ?? null;

  let body: z.infer<typeof CreateApiKeySchema>;
  try {
    body = CreateApiKeySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid request", details: err }, { status: 400 });
  }

  const result = await generateApiKey(userId, orgId, body.name, body.scopes);

  return NextResponse.json(
    {
      id: result.id,
      prefix: result.prefix,
      key: result.key, // Shown ONCE — user must save this immediately
      warning: "Store this key securely — it will not be shown again.",
    },
    { status: 201 }
  );
}
