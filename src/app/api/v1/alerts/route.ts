import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { PaginationSchema } from "../../../../lib/schemas";
import { apiLimiter, rateLimitResponse } from "../../../../lib/ratelimit";

export async function GET(req: NextRequest) {
  const rl = apiLimiter(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as any).orgId;
  const { searchParams } = new URL(req.url);
  const { page, limit } = PaginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });
  const resolvedFilter = searchParams.get("resolved");

  const where = {
    ...(resolvedFilter !== null ? { resolved: resolvedFilter === "true" } : { resolved: false }),
    sensor: { asset: { orgId: orgId ?? undefined } },
  };

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      include: { sensor: { select: { id: true, name: true, type: true, unit: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.alert.count({ where }),
  ]);

  return NextResponse.json({
    data: alerts,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}
