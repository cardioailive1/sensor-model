import { prisma } from "./prisma";
import { logger } from "./logger";

export interface AuditEntry {
  userId?: string | null;
  orgId?: string | null;
  action: string;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  outcome?: "success" | "failure" | "blocked";
  metadata?: Record<string, unknown>;
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        orgId: entry.orgId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        outcome: entry.outcome ?? "success",
        metadata: (entry.metadata as any) ?? {},
      },
    });
  } catch (err) {
    logger.error({ err, entry }, "Audit log write failed");
  }
}

export function extractRequestMeta(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";
  return { ipAddress: ip, userAgent: ua };
}
