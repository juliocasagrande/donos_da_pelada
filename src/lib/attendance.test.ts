import { describe, expect, it } from "vitest";
import { canConfirmPlayer, GOALKEEPER_CAPACITY, isWithinVotingWindow, LINE_CAPACITY } from "./attendance";

describe("canConfirmPlayer", () => {
  it("confirms line players until LINE_CAPACITY before slots are released", () => {
    expect(canConfirmPlayer("MEIA", { total: LINE_CAPACITY - 1, goalkeepers: 0, line: LINE_CAPACITY - 1 }, false)).toBe(true);
    expect(canConfirmPlayer("MEIA", { total: LINE_CAPACITY, goalkeepers: 0, line: LINE_CAPACITY }, false)).toBe(false);
  });

  it("confirms goalkeepers until GOALKEEPER_CAPACITY before slots are released", () => {
    expect(canConfirmPlayer("GOLEIRO", { total: 1, goalkeepers: GOALKEEPER_CAPACITY - 1, line: 0 }, false)).toBe(true);
    expect(canConfirmPlayer("GOLEIRO", { total: 2, goalkeepers: GOALKEEPER_CAPACITY, line: 0 }, false)).toBe(false);
  });

  it("rejects everyone once TOTAL_CAPACITY is reached before slots are released", () => {
    expect(canConfirmPlayer("MEIA", { total: 20, goalkeepers: 2, line: 18 }, false)).toBe(false);
  });

  it("allows extra line players once goalkeeper slots are released and a goalkeeper spot is unused", () => {
    expect(canConfirmPlayer("MEIA", { total: 19, goalkeepers: 1, line: 18 }, true)).toBe(true);
  });

  it("still blocks a third goalkeeper after release", () => {
    expect(canConfirmPlayer("GOLEIRO", { total: 20, goalkeepers: 2, line: 18 }, true)).toBe(false);
  });
});

describe("isWithinVotingWindow", () => {
  it("is true right after opening", () => {
    const now = new Date("2026-06-18T12:00:00Z");
    expect(isWithinVotingWindow(new Date("2026-06-18T11:59:00Z"), now)).toBe(true);
  });

  it("is false after the 6 hour window elapses", () => {
    const openedAt = new Date("2026-06-18T00:00:00Z");
    const now = new Date("2026-06-18T06:00:01Z");
    expect(isWithinVotingWindow(openedAt, now)).toBe(false);
  });
});
