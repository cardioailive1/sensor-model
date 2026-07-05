/**
 * Structured Logger
 * Pino-based — JSON output in production, pretty-print in dev
 * Compliance: SOC 2 CC7.2, ISO 27001 A.12.4
 */

import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  base: {
    service: "sensormodel",
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version,
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  // Redact sensitive fields from logs (GDPR / SOC 2)
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.token",
      "*.secret",
      "*.apiKey",
      "*.access_token",
      "*.refresh_token",
      "*.creditCard",
      "*.ssn",
    ],
    censor: "[REDACTED]",
  },
});
