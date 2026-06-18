import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = typeof prisma | Prisma.TransactionClient;

export async function archiveUserPeladaStats(userId: string, peladaId: string, db: DbClient = prisma) {
  const player = await db.player.findFirst({
    where: { userId, peladaId },
    include: { goals: true, pollWinners: true, attendances: true, ratings: true }
  });
  if (!player) return;

  const goalsTotal = player.goals.reduce((sum, item) => sum + item.quantity, 0);
  const presenceTotal = player.attendances.filter((attendance) => attendance.status === "CONFIRMED").length;
  const craqueTotal = player.pollWinners.length;
  const ratingSum = player.ratings.reduce((sum, rating) => sum + rating.value, 0);
  const ratingCount = player.ratings.length;

  await db.userCareerStats.upsert({
    where: { userId },
    update: {
      goalsTotal: { increment: goalsTotal },
      presenceTotal: { increment: presenceTotal },
      craqueTotal: { increment: craqueTotal },
      ratingSum: { increment: ratingSum },
      ratingCount: { increment: ratingCount }
    },
    create: { userId, goalsTotal, presenceTotal, craqueTotal, ratingSum, ratingCount }
  });
}
