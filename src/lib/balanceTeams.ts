import { randomInt } from "crypto";

export type PlayerPosition = "GOLEIRO" | "DEFESA" | "MEIA" | "ATAQUE";

export type BalancePlayer = {
  id: string;
  name: string;
  position: PlayerPosition;
  rating: number;
  membershipStatus?: "MENSALISTA" | "CONVIDADO" | string;
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

function getTeamTargetSizes(playerCount: number, numberOfTeams: number, desiredPlayersPerTeam: number) {
  const targetSizes = Array.from({ length: numberOfTeams }, () => 0);
  let remainingPlayers = playerCount;

  for (let index = 0; index < numberOfTeams; index += 1) {
    const teamsLeftAfterThis = numberOfTeams - index - 1;
    const reservedForLaterTeams = teamsLeftAfterThis;
    const isPriorityTeam = index < 2;
    const target = isPriorityTeam ? desiredPlayersPerTeam : Math.min(desiredPlayersPerTeam, remainingPlayers);
    const size = Math.max(1, Math.min(target, remainingPlayers - reservedForLaterTeams));

    targetSizes[index] = size;
    remainingPlayers -= size;
  }

  let index = 2;
  while (remainingPlayers > 0) {
    const targetIndex = index < numberOfTeams ? index : numberOfTeams - 1;
    if (targetSizes[targetIndex] < desiredPlayersPerTeam) {
      targetSizes[targetIndex] += 1;
      remainingPlayers -= 1;
    } else if (targetSizes.every((size) => size >= desiredPlayersPerTeam)) {
      break;
    }
    index += 1;
  }

  return targetSizes;
}

function recalculate(team: BalancedTeam) {
  team.totalRating = team.players.reduce((sum, player) => sum + player.rating, 0);
  team.averageRating = team.players.length ? team.totalRating / team.players.length : 0;
  team.positions = emptyPositions();
  for (const player of team.players) {
    team.positions[player.position] += 1;
  }
}

function selectPriorityPlayers(
  players: BalancePlayer[],
  totalCapacity: number,
  numberOfTeams: number,
  deprioritizeGuests: boolean
) {
  const shuffled = shuffle(players);
  const selected = new Map<string, BalancePlayer>();
  const addPlayers = (items: BalancePlayer[]) => {
    for (const player of items) {
      if (selected.size >= totalCapacity) return;
      selected.set(player.id, player);
    }
  };

  const goalkeepers = shuffled.filter((player) => player.position === "GOLEIRO");
  addPlayers(goalkeepers.slice(0, numberOfTeams));
  if (deprioritizeGuests) {
    addPlayers(shuffled.filter((player) => player.membershipStatus === "MENSALISTA"));
    addPlayers(goalkeepers);
    addPlayers(shuffled.filter((player) => player.membershipStatus !== "MENSALISTA"));
  } else {
    addPlayers(goalkeepers);
    addPlayers(shuffled);
  }

  return [...selected.values()];
}

function sortedCandidateTeams(
  teams: BalancedTeam[],
  player: BalancePlayer,
  targetSizes: number[],
  desiredPlayersPerTeam: number,
  totalByPosition: Record<PlayerPosition, number>,
  numberOfTeams: number,
  allowedIndexes?: number[]
) {
  const allowed = allowedIndexes ? new Set(allowedIndexes) : null;
  return [...teams]
    .filter((team) => !allowed || allowed.has(teams.indexOf(team)))
    .sort((a, b) => {
      const leftTargetSize = targetSizes[teams.indexOf(a)] ?? desiredPlayersPerTeam;
      const rightTargetSize = targetSizes[teams.indexOf(b)] ?? desiredPlayersPerTeam;
      const costDiff =
        calculateTeamCost(a, player, leftTargetSize, teams, totalByPosition, numberOfTeams) -
        calculateTeamCost(b, player, rightTargetSize, teams, totalByPosition, numberOfTeams);

      if (costDiff !== 0) return costDiff;
      return teams.indexOf(a) - teams.indexOf(b);
    });
}

function placePlayer(
  teams: BalancedTeam[],
  player: BalancePlayer,
  targetSizes: number[],
  desiredPlayersPerTeam: number,
  totalByPosition: Record<PlayerPosition, number>,
  numberOfTeams: number,
  allowedIndexes?: number[]
) {
  const bestTeam = sortedCandidateTeams(
    teams,
    player,
    targetSizes,
    desiredPlayersPerTeam,
    totalByPosition,
    numberOfTeams,
    allowedIndexes
  )[0];

  if (!bestTeam) return false;

  bestTeam.players.push(player);
  recalculate(bestTeam);
  return true;
}

function getPriorityTeamIndexes(numberOfTeams: number) {
  return Array.from({ length: Math.min(2, numberOfTeams) }, (_, index) => index);
}

function availablePriorityIndexes(teams: BalancedTeam[], targetSizes: number[], numberOfTeams: number) {
  return getPriorityTeamIndexes(numberOfTeams).filter(
    (index) => teams[index].players.length < (targetSizes[index] ?? 0)
  );
}

export function balanceTeams(
  players: BalancePlayer[],
  numberOfTeams: number,
  desiredPlayersPerTeam: number,
  deprioritizeGuests: boolean = true
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
  const selectedPlayers = selectPriorityPlayers(players, totalCapacity, numberOfTeams, deprioritizeGuests);
  const totalByPosition = countPlayersByPosition(selectedPlayers);
  const targetSizes = getTeamTargetSizes(selectedPlayers.length, numberOfTeams, desiredPlayersPerTeam);
  const priorityTeamIndexes = getPriorityTeamIndexes(numberOfTeams);
  const teams: BalancedTeam[] = Array.from({ length: numberOfTeams }, (_, index) => ({
    name: `Time ${index + 1}`,
    players: [],
    totalRating: 0,
    averageRating: 0,
    positions: emptyPositions()
  }));

  const assigned = new Set<string>();
  const goalkeepers = selectedPlayers
    .filter((player) => player.position === "GOLEIRO")
    .sort((a, b) => b.rating - a.rating);

  goalkeepers.slice(0, numberOfTeams).forEach((player, index) => {
    if (teams[index].players.length >= (targetSizes[index] ?? desiredPlayersPerTeam)) return;
    teams[index].players.push(player);
    assigned.add(player.id);
    recalculate(teams[index]);
  });

  const monthlyLinePlayers = deprioritizeGuests
    ? selectedPlayers
        .filter((player) => !assigned.has(player.id) && player.membershipStatus === "MENSALISTA")
        .sort((a, b) => b.rating - a.rating)
    : [];

  for (const player of monthlyLinePlayers) {
    const priorityIndexes = availablePriorityIndexes(teams, targetSizes, numberOfTeams);
    placePlayer(
      teams,
      player,
      targetSizes,
      desiredPlayersPerTeam,
      totalByPosition,
      numberOfTeams,
      priorityIndexes.length ? priorityIndexes : undefined
    );
    assigned.add(player.id);
  }

  const remainingPlayers = positionOrder.flatMap((position) =>
    selectedPlayers
      .filter((player) => !assigned.has(player.id) && player.position === position)
      .sort((a, b) => b.rating - a.rating)
  );

  for (const player of remainingPlayers) {
    const priorityHasVacancy = priorityTeamIndexes.some(
      (index) => teams[index].players.length < (targetSizes[index] ?? 0)
    );
    const allowedIndexes = priorityHasVacancy
      ? availablePriorityIndexes(teams, targetSizes, numberOfTeams)
      : undefined;

    placePlayer(teams, player, targetSizes, desiredPlayersPerTeam, totalByPosition, numberOfTeams, allowedIndexes);
    assigned.add(player.id);
  }

  return teams.map((team) => {
    recalculate(team);
    return team;
  });
}
