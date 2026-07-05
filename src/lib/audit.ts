/**
 * Audit Logging Service
 *
 * Compliance: SOC 2 CC7.2, CC7.3 / ISO 27001 A.12.4 / GDPR Art. 30
 * All security-relevant events are logged with immutable timestamps.
 * Logs are retained for 7 years per data retention policy.
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface AuditEntry {
  userId?: string | null;
  orgId?: string | null;
  action: string;         // verb.noun e.g. "sensor.read", "api_key.create"
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  outcome?: "success" | "failure" | "blocked";
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit log entry. Non-blocking — errors are swallowed but logged
 * so they never break the main request path.
 */
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
    // Audit failures must not propagate — log to structured output instead
    logger.error({ err, entry }, "Audit log write failed");
  }
}

/**
 * Helper to extract request metadata for audit logs
 */
export function extractRequestMeta(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";
  return { ipAddress: ip, userAgent: ua };
}
