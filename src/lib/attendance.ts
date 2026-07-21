export const LINE_CAPACITY = 18;
export const GOALKEEPER_CAPACITY = 2;
export const TOTAL_CAPACITY = LINE_CAPACITY + GOALKEEPER_CAPACITY;
export const VOTING_WINDOW_HOURS = 1.5;

export type ConfirmedCounts = { total: number; goalkeepers: number; line: number };
export type AttendanceCapacity = { line: number; goalkeepers: number };

export function canConfirmPlayer(
  position: string,
  counts: ConfirmedCounts,
  released: boolean,
  capacity: AttendanceCapacity = { line: LINE_CAPACITY, goalkeepers: GOALKEEPER_CAPACITY }
) {
  const lineCapacity = Math.max(1, capacity.line);
  const goalkeeperCapacity = Math.max(0, capacity.goalkeepers);
  const totalCapacity = lineCapacity + goalkeeperCapacity;

  if (!released) {
    if (counts.total >= totalCapacity) return false;
    if (position === "GOLEIRO") return counts.goalkeepers < goalkeeperCapacity;
    return counts.line < lineCapacity;
  }

  if (position === "GOLEIRO") {
    return counts.goalkeepers < goalkeeperCapacity && counts.total < totalCapacity;
  }

  const unusedGoalkeeperSlots = Math.max(0, goalkeeperCapacity - counts.goalkeepers);
  return counts.line < lineCapacity + unusedGoalkeeperSlots;
}

export function isWithinVotingWindow(openedAt: Date, now = new Date()) {
  return now.getTime() - openedAt.getTime() <= VOTING_WINDOW_HOURS * 60 * 60 * 1000;
}
