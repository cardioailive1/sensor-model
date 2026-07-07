/**
 * API Key Authentication
 * Format: sm_live_<random32> (production) | sm_test_<random32> (test)
 * Storage: only bcrypt hash is stored — plaintext never persisted
 * Compliance: SOC 2 CC6.1, ISO 27001 A.9.4
 */

const bcrypt = require("bcryptjs"); // eslint-disable-line
import { nanoid } from "nanoid";
import { prisma } from "./prisma";
import { auditLog } from "./audit";

const KEY_PREFIX = "sm_live_";
const TEST_PREFIX = "sm_test_";
const BCRYPT_ROUNDS = 12;

export interface GeneratedApiKey {
  id: string;
  key: string;
  prefix: string;
}

export async function generateApiKey(
  userId: string,
  orgId: string | null,
  name: string,
  scopes: string[] = ["predict:read"]
): Promise<GeneratedApiKey> {
  const env = process.env.NODE_ENV === "production" ? KEY_PREFIX : TEST_PREFIX;
  const raw = `${env}${nanoid(32)}`;
  const prefix = raw.slice(0, 12);
  const hash = await bcrypt.hash(raw, BCRYPT_ROUNDS);

  const record = await prisma.apiKey.create({
    data: { name, keyHash: hash, prefix, userId, orgId, scopes },
  });

  await auditLog({ userId, orgId, action: "api_key.create", resourceId: record.id });

  return { id: record.id, key: raw, prefix };
}

export async function validateApiKey(
  raw: string,
  requiredScope?: string
): Promise<{ valid: boolean; userId?: string; orgId?: string | null }> {
  if (!raw?.startsWith("sm_")) return { valid: false };

  const prefix = raw.slice(0, 12);

  const candidates = await prisma.apiKey.findMany({
    where: {
      prefix,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  for (const candidate of candidates) {
    const match = await bcrypt.compare(raw, candidate.keyHash);
    if (match) {
      if (requiredScope && !candidate.scopes.includes(requiredScope)) {
        return { valid: false };
      }
      prisma.apiKey
        .update({ where: { id: candidate.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});

      return { valid: true, userId: candidate.userId, orgId: candidate.orgId };
    }
  }

  return { valid: false };
}

export async function revokeApiKey(keyId: string, userId: string): Promise<void> {
  await prisma.apiKey.update({
    where: { id: keyId, userId },
    data: { revokedAt: new Date() },
  });
  await auditLog({ userId, action: "api_key.revoke", resourceId: keyId });
}
