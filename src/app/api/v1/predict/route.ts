/**
 * POST /api/v1/predict
 * Run ML prediction on sensor readings
 * Auth: JWT session OR API key
 * Standards: IEC 61360, IEEE 1451, ISO 13381-1 (RUL)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateApiKey } from "@/lib/apikey";
import { PredictRequestSchema } from "@/lib/schemas";
import { runAlgorithm } from "@/lib/ml/algorithms";
import { prisma } from "@/lib/prisma";
import { auditLog, extractRequestMeta } from "@/lib/audit";
import { predictLimiter, rateLimitResponse } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { z } from "zod";

export async function POST(req: NextRequest) {
  // ── Rate limit ──────────────────────────────────────────────────────────
  const rl = predictLimiter(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  // ── Authentication (session or API key) ─────────────────────────────────
  let userId: string | undefined;
  let orgId: string | null = null;

  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    const result = await validateApiKey(apiKey, "predict:read");
    if (!result.valid) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
    userId = result.userId;
    orgId = result.orgId ?? null;
  } else {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = (session.user as any).id;
    orgId = (session.user as any).orgId;
  }

  // ── Parse & validate body ───────────────────────────────────────────────
  let body: z.infer<typeof PredictRequestSchema>;
  try {
    body = PredictRequestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid request", details: err }, { status: 400 });
  }

  // ── Authorise sensor access ─────────────────────────────────────────────
  const sensor = await prisma.sensor.findFirst({
    where: {
      id: body.sensorId,
      asset: { orgId: orgId ?? undefined },
    },
    include: { asset: true },
  });

  if (!sensor) {
    return NextResponse.json({ error: "Sensor not found" }, { status: 404 });
  }

  // ── Run prediction ──────────────────────────────────────────────────────
  const start = Date.now();
  const result = runAlgorithm(body.values, body.algorithm);
  const durationMs = Date.now() - start;

  // ── Persist prediction ──────────────────────────────────────────────────
  const prediction = await prisma.prediction.create({
    data: {
      sensorId: sensor.id,
      algorithm: result.algorithm,
      predicted: result.predicted,
      confidence: result.confidence,
      rulHours: result.rulHours,
      features: result.features as any,
    },
  });

  // ── Check thresholds & create alert if needed ───────────────────────────
  const thresholds = sensor.thresholds as any;
  if (thresholds?.critical && result.predicted >= thresholds.critical) {
    await prisma.alert.create({
      data: {
        sensorId: sensor.id,
        userId,
        severity: "CRITICAL",
        type: "threshold_breach",
        message: `${sensor.name} predicted value ${result.predicted.toFixed(2)} ${sensor.unit} exceeds critical threshold ${thresholds.critical}`,
        value: result.predicted,
        threshold: thresholds.critical,
      },
    });
  } else if (thresholds?.warning && result.predicted >= thresholds.warning) {
    await prisma.alert.create({
      data: {
        sensorId: sensor.id,
        userId,
        severity: "WARNING",
        type: "threshold_breach",
        message: `${sensor.name} predicted value ${result.predicted.toFixed(2)} ${sensor.unit} exceeds warning threshold ${thresholds.warning}`,
        value: result.predicted,
        threshold: thresholds.warning,
      },
    });
  }

  // ── Audit ───────────────────────────────────────────────────────────────
  const { ipAddress, userAgent } = extractRequestMeta(req);
  await auditLog({
    userId,
    orgId,
    action: "sensor.predict",
    resource: "sensor",
    resourceId: sensor.id,
    ipAddress,
    userAgent,
    metadata: { algorithm: body.algorithm, durationMs, predictionId: prediction.id },
  });

  logger.info({ userId, sensorId: sensor.id, algorithm: body.algorithm, durationMs }, "Prediction served");

  return NextResponse.json(
    {
      predictionId: prediction.id,
      sensorId: sensor.id,
      sensorName: sensor.name,
      unit: sensor.unit,
      algorithm: result.algorithm,
      predicted: result.predicted,
      confidence: result.confidence,
      rulHours: result.rulHours,
      features: body.includeFeaturesExtraction ? result.features : undefined,
      durationMs,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "X-RateLimit-Remaining": String(rl.remaining),
        "Cache-Control": "no-store",
      },
    }
  );
}
