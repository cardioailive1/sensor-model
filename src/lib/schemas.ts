/**
 * Input Validation Schemas (Zod)
 * All API inputs are validated before processing — OWASP A03 injection prevention
 */

import { z } from "zod";

// ── Sensor ──────────────────────────────────────────────────────────────────
export const SensorReadingSchema = z.object({
  sensorId: z.string().cuid(),
  value: z.number().finite(),
  quality: z.number().min(0).max(1).default(1.0),
  timestamp: z.string().datetime().optional(),
});

export const PredictRequestSchema = z.object({
  sensorId: z.string().cuid(),
  values: z.array(z.number().finite()).min(1).max(1000),
  algorithm: z
    .enum(["ekf", "lstm", "arima", "fourier", "ensemble"])
    .default("ensemble"),
  includeFeaturesExtraction: z.boolean().default(true),
});

export const CreateSensorSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.string().min(1).max(60),
  unit: z.string().min(1).max(20),
  assetId: z.string().cuid(),
  thresholds: z
    .object({
      warning: z.number(),
      critical: z.number(),
      low: z.number().optional(),
    })
    .optional(),
  mlAlgorithm: z.enum(["ekf", "lstm", "arima", "fourier", "ensemble"]).default("ensemble"),
});

// ── Asset ───────────────────────────────────────────────────────────────────
export const CreateAssetSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  vertical: z.enum([
    "manufacturing",
    "industrial_automation",
    "healthcare",
    "aerospace",
    "ev_battery",
    "power_systems",
    "mining",
    "renewable_energy",
  ]),
  location: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
});

// ── Auth ────────────────────────────────────────────────────────────────────
export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(80),
  scopes: z
    .array(
      z.enum(["predict:read", "sensor:write", "alert:read", "admin:all"])
    )
    .min(1)
    .default(["predict:read"]),
  expiresAt: z.string().datetime().optional(),
});

// ── GDPR / Compliance ────────────────────────────────────────────────────────
export const DataDeletionRequestSchema = z.object({
  userId: z.string().cuid(),
  reason: z.string().max(500).optional(),
  confirmation: z.literal("DELETE_MY_DATA"),
});

export const ConsentUpdateSchema = z.object({
  analytics: z.boolean(),
  marketing: z.boolean(),
  thirdParty: z.boolean(),
});

// ── Pagination ───────────────────────────────────────────────────────────────
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(60).optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});
