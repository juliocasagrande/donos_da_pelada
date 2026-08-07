import { describe, expect, it } from "vitest";
import { paymentEventDecision } from "./mercadopagoSubscriptionSync";

describe("paymentEventDecision", () => {
  const lastPaymentAt = new Date("2026-08-01T12:00:00Z");

  it("revokes an active entitlement even when the refunded invoice is older", () => {
    expect(paymentEventDecision({
      status: "refunded",
      debitDate: new Date("2026-07-01T12:00:00Z"),
      lastPaymentAt,
      cancelledAt: null,
      ownsActiveEntitlement: true
    })).toBe("revoke");
  });

  it("keeps a refund from an old subscription in audit history only", () => {
    expect(paymentEventDecision({
      status: "charged_back",
      debitDate: new Date("2026-07-01T12:00:00Z"),
      lastPaymentAt,
      cancelledAt: null,
      ownsActiveEntitlement: false
    })).toBe("audit");
  });

  it("does not let an older non-terminal event replace the newest payment", () => {
    expect(paymentEventDecision({
      status: "approved",
      debitDate: new Date("2026-07-01T12:00:00Z"),
      lastPaymentAt,
      cancelledAt: null,
      ownsActiveEntitlement: true
    })).toBe("audit");
  });
});
