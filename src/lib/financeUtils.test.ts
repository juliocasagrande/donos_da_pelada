import { describe, expect, it } from "vitest";
import { formatCurrencyBRL, monthKey, monthLabel, parseMonthKey, shiftMonth } from "./financeUtils";

describe("shiftMonth", () => {
  it("moves forward within the same year", () => {
    expect(shiftMonth(2026, 3, 1)).toEqual({ year: 2026, month: 4 });
  });

  it("rolls over to the next year", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });

  it("rolls back to the previous year", () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("handles multi-month deltas", () => {
    expect(shiftMonth(2026, 6, -8)).toEqual({ year: 2025, month: 10 });
  });
});

describe("monthKey / parseMonthKey", () => {
  it("formats a zero-padded key", () => {
    expect(monthKey(2026, 3)).toBe("2026-03");
    expect(monthKey(2026, 11)).toBe("2026-11");
  });

  it("parses a valid key", () => {
    expect(parseMonthKey("2026-03", { year: 2099, month: 1 })).toEqual({ year: 2026, month: 3 });
  });

  it("falls back for invalid or missing keys", () => {
    const fallback = { year: 2099, month: 1 };
    expect(parseMonthKey(undefined, fallback)).toEqual(fallback);
    expect(parseMonthKey("not-a-key", fallback)).toEqual(fallback);
    expect(parseMonthKey("2026-13", fallback)).toEqual(fallback);
  });
});

describe("monthLabel", () => {
  it("returns a Portuguese label", () => {
    expect(monthLabel(2026, 1)).toBe("Janeiro 2026");
    expect(monthLabel(2026, 12)).toBe("Dezembro 2026");
  });
});

describe("formatCurrencyBRL", () => {
  it("formats values as Brazilian currency", () => {
    expect(formatCurrencyBRL(150)).toContain("150,00");
    expect(formatCurrencyBRL(0)).toContain("0,00");
  });
});
