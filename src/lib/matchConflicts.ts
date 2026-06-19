import { prisma } from "@/lib/prisma";

const CONFLICT_WINDOW_MS = 30 * 60 * 1000;

export async function hasConflictingConfirmedMatch(
  userId: string,
  matchDate: Date,
  excludeMatchId?: string,
  targetPeladaId?: string
) {
  const windowStart = new Date(matchDate.getTime() - CONFLICT_WINDOW_MS);
  const windowEnd = new Date(matchDate.getTime() + CONFLICT_WINDOW_MS);

  const conflict = await prisma.attendance.findFirst({
    where: {
      status: "CONFIRMED",
      player: { userId, active: true },
      match: {
        deletedAt: null,
        status: "OPEN",
        date: { gt: windowStart, lt: windowEnd },
        ...(targetPeladaId ? { peladaId: { not: targetPeladaId } } : {}),
        ...(excludeMatchId ? { id: { not: excludeMatchId } } : {})
      }
    },
    select: { id: true }
  });

  return Boolean(conflict);
}
