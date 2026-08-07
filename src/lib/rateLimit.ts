import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 5;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
let lastCleanupAt = 0;

type RateLimitRow = { count: number; resetAt: Date };

export function rateLimitKey(prefix: string, identifier: string) {
  const digest = createHash("sha256").update(identifier.trim().toLowerCase()).digest("hex");
  return `${prefix}:${digest}`;
}

export function rateLimitDecision(count: number, max: number) {
  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count)
  };
}

export async function checkRateLimit(
  key: string,
  max = DEFAULT_MAX_ATTEMPTS,
  windowMs = DEFAULT_WINDOW_MS
) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const cappedCount = max + 1;

  const [bucket] = await prisma.$queryRaw<RateLimitRow[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, ${resetAt}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1
        ELSE LEAST("RateLimitBucket"."count" + 1, ${cappedCount})
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${resetAt}
        ELSE "RateLimitBucket"."resetAt"
      END,
      "updatedAt" = ${now}
    RETURNING "count", "resetAt"
  `;

  if (Date.now() - lastCleanupAt >= CLEANUP_INTERVAL_MS) {
    lastCleanupAt = Date.now();
    void prisma.rateLimitBucket
      .deleteMany({ where: { resetAt: { lt: new Date(Date.now() - CLEANUP_INTERVAL_MS) } } })
      .catch((error) => console.error("Falha ao limpar limites expirados:", error));
  }

  return {
    ...rateLimitDecision(bucket?.count ?? cappedCount, max),
    resetAt: bucket?.resetAt ?? resetAt
  };
}
