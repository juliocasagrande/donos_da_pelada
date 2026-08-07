import { describe, expect, it } from "vitest";
import { normalizeRuntimeDatabaseUrl } from "./databaseUrl";

describe("normalizeRuntimeDatabaseUrl", () => {
  it("raises undersized Prisma pools when Neon PgBouncer is present", () => {
    const normalized = new URL(normalizeRuntimeDatabaseUrl(
      "postgresql://user:secret@example-pooler.neon.tech/db?sslmode=require&connection_limit=1"
    )!);
    expect(normalized.searchParams.get("connection_limit")).toBe("3");
    expect(normalized.searchParams.get("connect_timeout")).toBe("15");
    expect(normalized.searchParams.get("pool_timeout")).toBe("15");
  });

  it("allows an explicit per-process connection limit", () => {
    const normalized = new URL(normalizeRuntimeDatabaseUrl(
      "postgresql://user:secret@example-pooler.neon.tech/db?sslmode=require&connection_limit=3",
      "5"
    )!);
    expect(normalized.searchParams.get("connection_limit")).toBe("5");
  });

  it("ignores an invalid override and preserves a safe configured limit", () => {
    const normalized = new URL(normalizeRuntimeDatabaseUrl(
      "postgresql://user:secret@example-pooler.neon.tech/db?sslmode=require&connection_limit=4",
      "invalid"
    )!);
    expect(normalized.searchParams.get("connection_limit")).toBe("4");
  });

  it("does not rewrite a direct database endpoint", () => {
    const direct = "postgresql://user:secret@example.neon.tech/db?sslmode=require";
    expect(normalizeRuntimeDatabaseUrl(direct)).toBe(direct);
  });
});
