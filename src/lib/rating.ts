import { prisma } from "@/lib/prisma";

export async function getUserGlobalRating(userId: string): Promise<number | null> {
  const result = await prisma.player.aggregate({
    where: { userId, ratingAssigned: true },
    _avg: { rating: true }
  });
  return result._avg.rating ?? null;
}
