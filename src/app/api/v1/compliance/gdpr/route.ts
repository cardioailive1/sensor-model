/**
 * GDPR Compliance Endpoints
 * POST /api/v1/compliance/gdpr/delete  — right to erasure (Art. 17)
 * GET  /api/v1/compliance/gdpr/export  — right to portability (Art. 20)
 *
 * Compliance: GDPR Art. 17, 20 / CCPA / SOC 2 P8
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { DataDeletionRequestSchema } from "../../../../../lib/schemas";
import { prisma } from "../../../../../lib/prisma";
import { auditLog, extractRequestMeta } from "../../../../../lib/audit";
import { logger } from "../../../../../lib/logger";

// POST — Right to Erasure
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  let body;
  try {
    body = DataDeletionRequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Users may only delete their own data unless they are ADMIN
  const role = (session.user as any).role;
  if (body.userId !== userId && !["ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ipAddress, userAgent } = extractRequestMeta(req);

  // Soft-delete user (GDPR Art. 17 — right to erasure)
  // We keep the audit log for compliance (legitimate interest / legal obligation)
  await prisma.$transaction([
    // Anonymise personal data
    prisma.user.update({
      where: { id: body.userId },
      data: {
        name: "Deleted User",
        email: `deleted_${body.userId}@anonymised.invalid`,
        image: null,
        mfaSecret: null,
        deletedAt: new Date(),
      },
    }),
    // Revoke all active sessions
    prisma.session.deleteMany({ where: { userId: body.userId } }),
    // Revoke all API keys
    prisma.apiKey.updateMany({
      where: { userId: body.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await auditLog({
    userId,
    action: "user.gdpr_erasure",
    resource: "user",
    resourceId: body.userId,
    ipAddress,
    userAgent,
    metadata: { requestedBy: userId, reason: body.reason },
  });

  logger.info({ userId: body.userId }, "GDPR erasure completed");

  return NextResponse.json({
    message: "Data deletion request processed. Personal data has been anonymised.",
    deletedAt: new Date().toISOString(),
    retainedData: "Audit logs retained for 7 years per legal obligation (GDPR Art. 17(3)(b))",
  });
}

// GET — Right to Portability
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  const [user, sensorSessions, apiKeys] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true, role: true, dataRegion: true },
    }),
    prisma.sensorSession.findMany({
      where: { userId },
      select: { id: true, startedAt: true, endedAt: true, config: true },
    }),
    prisma.apiKey.findMany({
      where: { userId },
      select: { id: true, name: true, prefix: true, scopes: true, createdAt: true, lastUsedAt: true },
    }),
  ]);

  const { ipAddress, userAgent } = extractRequestMeta(req);
  await auditLog({ userId, action: "user.gdpr_export", resource: "user", resourceId: userId, ipAddress, userAgent });

  return NextResponse.json(
    {
      exportedAt: new Date().toISOString(),
      standard: "GDPR Art. 20 — Right to Data Portability",
      format: "application/json",
      data: { user, sensorSessions, apiKeys },
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="sensormodel-data-export-${userId}.json"`,
        "Cache-Control": "no-store",
      },
    }
  );
}
