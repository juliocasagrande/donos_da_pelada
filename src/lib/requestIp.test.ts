import { describe, expect, it } from "vitest";
import { getClientIp } from "./requestIp";

describe("getClientIp", () => {
  it("prefers the proxy-provided real IP", () => {
    const headers = new Headers({ "x-real-ip": "203.0.113.10", "x-forwarded-for": "198.51.100.4" });
    expect(getClientIp(headers)).toBe("203.0.113.10");
  });

  it("rejects arbitrary forwarded header contents", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "attacker-controlled text" }))).toBe("unknown");
  });
});
