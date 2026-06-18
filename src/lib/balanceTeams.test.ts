import { describe, expect, it } from "vitest";
import { balanceTeams, shuffle, type BalancePlayer } from "./balanceTeams";

function makePlayers(count: number, position: BalancePlayer["position"], rating = 3): BalancePlayer[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${position}-${index}`,
    name: `${position} ${index}`,
    position,
    rating
  }));
}

describe("shuffle", () => {
  it("preserves all items without duplication or loss", () => {
    const items = Array.from({ length: 30 }, (_, index) => index);
    const result = shuffle(items);
    expect(result).toHaveLength(items.length);
    expect([...result].sort((a, b) => a - b)).toEqual(items);
  });

  it("produces different orderings across calls (not deterministic)", () => {
    const items = Array.from({ length: 20 }, (_, index) => index);
    const orderings = new Set(Array.from({ length: 10 }, () => shuffle(items).join(",")));
    expect(orderings.size).toBeGreaterThan(1);
  });
});

describe("balanceTeams", () => {
  it("throws for fewer than 2 teams", () => {
    expect(() => balanceTeams(makePlayers(4, "MEIA"), 1, 4)).toThrow();
  });

  it("throws when there are fewer players than teams", () => {
    expect(() => balanceTeams(makePlayers(1, "MEIA"), 2, 4)).toThrow();
  });

  it("splits players evenly across teams by count", () => {
    const players = [
      ...makePlayers(2, "GOLEIRO"),
      ...makePlayers(6, "DEFESA"),
      ...makePlayers(6, "MEIA"),
      ...makePlayers(6, "ATAQUE")
    ];

    const teams = balanceTeams(players, 2, 10);
    expect(teams).toHaveLength(2);
    const totalAssigned = teams.reduce((sum, team) => sum + team.players.length, 0);
    expect(totalAssigned).toBe(20);
    for (const team of teams) {
      expect(team.players.length).toBeLessThanOrEqual(10);
    }
  });

  it("avoids leaving a team without a goalkeeper when goalkeepers are available", () => {
    const players = [...makePlayers(2, "GOLEIRO"), ...makePlayers(10, "MEIA", 3)];
    const teams = balanceTeams(players, 2, 6);
    for (const team of teams) {
      expect(team.positions.GOLEIRO).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps total rating reasonably balanced between teams", () => {
    const players = [
      ...makePlayers(2, "GOLEIRO", 4),
      ...makePlayers(8, "DEFESA", 3),
      ...makePlayers(8, "MEIA", 3),
      ...makePlayers(8, "ATAQUE", 3)
    ];
    const teams = balanceTeams(players, 2, 13);
    const [first, second] = teams;
    expect(Math.abs(first.totalRating - second.totalRating)).toBeLessThanOrEqual(6);
  });

  it("prioritizes completing the first two teams when there are leftovers", () => {
    const teams = balanceTeams(makePlayers(10, "MEIA", 3), 3, 4);

    expect(teams[0].players).toHaveLength(4);
    expect(teams[1].players).toHaveLength(4);
    expect(teams[2].players).toHaveLength(2);
  });
});
