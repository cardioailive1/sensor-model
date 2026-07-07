import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { validateApiKey } from "../../../../lib/apikey";
import { PredictRequestSchema } from "../../../../lib/schemas";
import { runAlgorithm } from "../../../../lib/ml/algorithms";
import { prisma } from "../../../../lib/prisma";
import { apiLimiter, rateLimitResponse } from "../../../../lib/ratelimit";
import { z } from "zod";

async function writeAudit(userId: string | undefined, orgId: string | null, action: string, meta: Record<string, unknown> = {}) {
  try {
    await prisma.auditLog.create({ data: { userId, orgId, action, outcome: "success", metadata: meta as any } });
  } catch {}
}

export async function POST(req: NextRequest) {
  const rl = apiLimiter(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  let userId: string | undefined;
  let orgId: string | null = null;

  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    const result = await validateApiKey(apiKey, "predict:read");
    if (!result.valid) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    userId = result.userId;
    orgId = result.orgId ?? null;
  } else {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userId = (session.user as any).id;
    orgId = (session.user as any).orgId;
  }

  let body: z.infer<typeof PredictRequestSchema>;
  try {
    body = PredictRequestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid request", details: err }, { status: 400 });
  }

  const sensor = await prisma.sensor.findFirst({
    where: { id: body.sensorId, asset: { orgId: orgId ?? undefined } },
    include: { asset: true },
  });
  if (!sensor) return NextResponse.json({ error: "Sensor not found" }, { status: 404 });

  const start = Date.now();
  const result = runAlgorithm(body.values, body.algorithm);
  const durationMs = Date.now() - start;

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

  const thresholds = sensor.thresholds as any;
  if (thresholds?.critical && result.predicted >= thresholds.critical) {
    await prisma.alert.create({ data: { sensorId: sensor.id, userId, severity: "CRITICAL", type: "threshold_breach", message: `${sensor.name} exceeded critical threshold`, value: result.predicted, threshold: thresholds.critical } });
  } else if (thresholds?.warning && result.predicted >= thresholds.warning) {
    await prisma.alert.create({ data: { sensorId: sensor.id, userId, severity: "WARNING", type: "threshold_breach", message: `${sensor.name} exceeded warning threshold`, value: result.predicted, threshold: thresholds.warning } });
  }

  await writeAudit(userId, orgId, "sensor.predict", { algorithm: body.algorithm, durationMs, predictionId: prediction.id });

  return NextResponse.json({
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
  }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
