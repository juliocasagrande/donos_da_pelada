import { describe, expect, it } from "vitest";
import { rateLimitDecision, rateLimitKey } from "./rateLimit";

describe("rateLimit", () => {
  it("allows requests through the configured limit", () => {
    expect(rateLimitDecision(1, 3)).toEqual({ allowed: true, remaining: 2 });
    expect(rateLimitDecision(3, 3)).toEqual({ allowed: true, remaining: 0 });
  });

  it("blocks requests once the limit is exceeded", () => {
    expect(rateLimitDecision(4, 3)).toEqual({ allowed: false, remaining: 0 });
  });

  it("does not persist raw account identifiers in bucket keys", () => {
    const key = rateLimitKey("login-account", "Jogador@Example.com");
    expect(key).toMatch(/^login-account:[a-f0-9]{64}$/);
    expect(key).not.toContain("jogador@example.com");
  });
});
