import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rateLimit";

describe("checkRateLimit", () => {
  it("allows requests under the limit", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, 3).allowed).toBe(i < 3);
    }
  });

  it("blocks requests once the limit is exceeded", () => {
    const key = `test-${Math.random()}`;
    expect(checkRateLimit(key, 2).allowed).toBe(true);
    expect(checkRateLimit(key, 2).allowed).toBe(true);
    expect(checkRateLimit(key, 2).allowed).toBe(false);
  });

  it("tracks separate keys independently", () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    expect(checkRateLimit(keyA, 1).allowed).toBe(true);
    expect(checkRateLimit(keyA, 1).allowed).toBe(false);
    expect(checkRateLimit(keyB, 1).allowed).toBe(true);
  });
});
