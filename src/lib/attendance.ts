export const LINE_CAPACITY = 18;
export const GOALKEEPER_CAPACITY = 2;
export const TOTAL_CAPACITY = LINE_CAPACITY + GOALKEEPER_CAPACITY;
export const VOTING_WINDOW_HOURS = 1;

export type ConfirmedCounts = { total: number; goalkeepers: number; line: number };

export function canConfirmPlayer(position: string, counts: ConfirmedCounts, released: boolean) {
  if (!released) {
    if (counts.total >= TOTAL_CAPACITY) return false;
    if (position === "GOLEIRO") return counts.goalkeepers < GOALKEEPER_CAPACITY;
    return counts.line < LINE_CAPACITY;
  }

  if (position === "GOLEIRO") {
    if (counts.goalkeepers >= GOALKEEPER_CAPACITY) return false;
    if (counts.goalkeepers === 1) return counts.line <= LINE_CAPACITY;
    return counts.line <= 20;
  }

  if (counts.goalkeepers >= 2) return counts.line < LINE_CAPACITY;
  if (counts.goalkeepers === 1) return counts.line < 20;
  return counts.line < 21;
}

export function isWithinVotingWindow(openedAt: Date, now = new Date()) {
  return now.getTime() - openedAt.getTime() <= VOTING_WINDOW_HOURS * 60 * 60 * 1000;
}
