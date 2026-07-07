/**
 * Health Check Endpoint
 * GET /api/health
 * Used by Render.com health checks and uptime monitors
 */

import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  const start = Date.now();

  let dbStatus: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }

  const latencyMs = Date.now() - start;
  const status = dbStatus === "ok" ? 200 : 503;

  return NextResponse.json(
    {
      status: dbStatus === "ok" ? "healthy" : "degraded",
      version: process.env.npm_package_version ?? "1.0.0",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks: {
        database: { status: dbStatus, latencyMs },
        memory: {
          status: "ok",
          heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
      },
    },
    { status }
  );
}
