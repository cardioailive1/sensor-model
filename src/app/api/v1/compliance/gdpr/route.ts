import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { DataDeletionRequestSchema } from "../../../../../lib/schemas";
import { prisma } from "../../../../../lib/prisma";

async function writeAudit(userId: string | undefined, orgId: string | null | undefined, action: string, resourceId: string, meta: Record<string, unknown> = {}) {
  try { await prisma.auditLog.create({ data: { userId, orgId, action, resourceId, outcome: "success", metadata: meta as any } }); } catch {}
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  let body;
  try { body = DataDeletionRequestSchema.parse(await req.json()); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const role = (session.user as any).role;
  if (body.userId !== userId && !["ADMIN", "SUPER_ADMIN"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.$transaction([
    prisma.user.update({ where: { id: body.userId }, data: { name: "Deleted User", email: `deleted_${body.userId}@anonymised.invalid`, image: null, mfaSecret: null, deletedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: body.userId } }),
    prisma.apiKey.updateMany({ where: { userId: body.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await writeAudit(userId, null, "user.gdpr_erasure", body.userId, { reason: body.reason });
  return NextResponse.json({ message: "Data deletion request processed.", deletedAt: new Date().toISOString() });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const [user, sensorSessions, apiKeys] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, createdAt: true, role: true, dataRegion: true } }),
    prisma.sensorSession.findMany({ where: { userId }, select: { id: true, startedAt: true, endedAt: true, config: true } }),
    prisma.apiKey.findMany({ where: { userId }, select: { id: true, name: true, prefix: true, scopes: true, createdAt: true, lastUsedAt: true } }),
  ]);
  await writeAudit(userId, null, "user.gdpr_export", userId);
  return NextResponse.json({ exportedAt: new Date().toISOString(), data: { user, sensorSessions, apiKeys } }, { headers: { "Cache-Control": "no-store" } });
}
