import { randomInt } from "crypto";

export type PlayerPosition = "GOLEIRO" | "DEFESA" | "MEIA" | "ATAQUE";

export type BalancePlayer = {
  id: string;
  name: string;
  position: PlayerPosition;
  rating: number;
};

export type BalancedTeam = {
  name: string;
  players: BalancePlayer[];
  totalRating: number;
  averageRating: number;
  positions: Record<PlayerPosition, number>;
};

const positionOrder: PlayerPosition[] = ["GOLEIRO", "DEFESA", "MEIA", "ATAQUE"];

function emptyPositions(): Record<PlayerPosition, number> {
  return { GOLEIRO: 0, DEFESA: 0, MEIA: 0, ATAQUE: 0 };
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function countPlayersByPosition(players: BalancePlayer[]) {
  return players.reduce(
    (acc, player) => {
      acc[player.position] += 1;
      return acc;
    },
    emptyPositions()
  );
}

function getTargetPositionCount(
  totalByPosition: Record<PlayerPosition, number>,
  position: PlayerPosition,
  numberOfTeams: number
) {
  return Math.ceil(totalByPosition[position] / numberOfTeams);
}

function hasTeamWithoutPosition(teams: BalancedTeam[], position: PlayerPosition) {
  return teams.some((team) => team.positions[position] === 0);
}

function calculateTeamCost(
  team: BalancedTeam,
  player: BalancePlayer,
  targetSize: number,
  teams: BalancedTeam[],
  totalByPosition: Record<PlayerPosition, number>,
  numberOfTeams: number
) {
  const ratingCost = team.totalRating * 1.4;
  const sizeCost = team.players.length * 2.8;
  const targetPositionCount = getTargetPositionCount(totalByPosition, player.position, numberOfTeams);
  const currentPositionCount = team.positions[player.position];
  const repeatedPositionCost = currentPositionCount * 5;
  const overTargetPositionCost = currentPositionCount >= targetPositionCount ? 18 : 0;
  const duplicateGoalkeeperCost =
    player.position === "GOLEIRO" && currentPositionCount >= 1 && hasTeamWithoutPosition(teams, "GOLEIRO")
      ? 500
      : 0;
  const duplicateLinePositionCost =
    player.position !== "GOLEIRO" && currentPositionCount >= 1 && hasTeamWithoutPosition(teams, player.position)
      ? 40
      : 0;
  const fullCost = team.players.length >= targetSize ? 9999 : 0;

  return (
    ratingCost +
    sizeCost +
    repeatedPositionCost +
    overTargetPositionCost +
    duplicateGoalkeeperCost +
    duplicateLinePositionCost +
    fullCost
  );
}

function recalculate(team: BalancedTeam) {
  team.totalRating = team.players.reduce((sum, player) => sum + player.rating, 0);
  team.averageRating = team.players.length ? team.totalRating / team.players.length : 0;
  team.positions = emptyPositions();
  for (const player of team.players) {
    team.positions[player.position] += 1;
  }
}

export function balanceTeams(
  players: BalancePlayer[],
  numberOfTeams: number,
  desiredPlayersPerTeam: number
): BalancedTeam[] {
  if (numberOfTeams < 2) {
    throw new Error("Escolha pelo menos 2 times.");
  }

  if (desiredPlayersPerTeam < 1) {
    throw new Error("Cada time precisa ter pelo menos 1 jogador.");
  }

  if (players.length < numberOfTeams) {
    throw new Error("Ha jogadores insuficientes para a quantidade de times.");
  }

  const totalCapacity = numberOfTeams * desiredPlayersPerTeam;
  const selectedPlayers = shuffle(players).slice(0, totalCapacity);
  const totalByPosition = countPlayersByPosition(selectedPlayers);
  const teams: BalancedTeam[] = Array.from({ length: numberOfTeams }, (_, index) => ({
    name: `Time ${index + 1}`,
    players: [],
    totalRating: 0,
    averageRating: 0,
    positions: emptyPositions()
  }));

  const grouped = positionOrder.flatMap((position) =>
    selectedPlayers
      .filter((player) => player.position === position)
      .sort((a, b) => b.rating - a.rating)
  );

  for (const player of grouped) {
    const bestTeam = [...teams].sort((a, b) => {
      const costDiff =
        calculateTeamCost(a, player, desiredPlayersPerTeam, teams, totalByPosition, numberOfTeams) -
        calculateTeamCost(b, player, desiredPlayersPerTeam, teams, totalByPosition, numberOfTeams);

      if (costDiff !== 0) return costDiff;
      return a.players.length - b.players.length;
    })[0];

    bestTeam.players.push(player);
    recalculate(bestTeam);
  }

  return teams.map((team) => {
    recalculate(team);
    return team;
  });
}
