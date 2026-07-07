/**
 * GET  /api/v1/sensors  — list sensors for org
 * POST /api/v1/sensors  — create sensor
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { CreateSensorSchema, PaginationSchema } from "../../../../lib/schemas";
import { prisma } from "../../../../lib/prisma";
import { auditLog, extractRequestMeta } from "../../../../lib/audit";
import { apiLimiter, rateLimitResponse } from "../../../../lib/ratelimit";

export async function GET(req: NextRequest) {
  const rl = apiLimiter(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as any).orgId;
  const { searchParams } = new URL(req.url);
  const pagination = PaginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });

  const [sensors, total] = await Promise.all([
    prisma.sensor.findMany({
      where: { asset: { orgId: orgId ?? undefined } },
      include: {
        asset: { select: { id: true, name: true, vertical: true } },
        _count: { select: { alerts: true, readings: true } },
      },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.sensor.count({ where: { asset: { orgId: orgId ?? undefined } } }),
  ]);

  return NextResponse.json({
    data: sensors,
    meta: { total, page: pagination.page, limit: pagination.limit, pages: Math.ceil(total / pagination.limit) },
  });
}

export async function POST(req: NextRequest) {
  const rl = apiLimiter(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const orgId  = (session.user as any).orgId;

  let body;
  try {
    body = CreateSensorSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid request", details: err }, { status: 400 });
  }

  // Verify asset belongs to org
  const asset = await prisma.asset.findFirst({
    where: { id: body.assetId, orgId: orgId ?? undefined },
  });
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const sensor = await prisma.sensor.create({
    data: {
      name: body.name,
      type: body.type,
      unit: body.unit,
      assetId: body.assetId,
      thresholds: body.thresholds as any ?? {},
      mlAlgorithm: body.mlAlgorithm,
    },
  });

  const { ipAddress, userAgent } = extractRequestMeta(req);
  await auditLog({ userId, orgId, action: "sensor.create", resource: "sensor", resourceId: sensor.id, ipAddress, userAgent });

  return NextResponse.json(sensor, { status: 201 });
}
