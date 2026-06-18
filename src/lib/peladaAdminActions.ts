"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PeladaPlan } from "@prisma/client";
import { archiveUserPeladaStats } from "@/lib/careerStats";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireMaster } from "@/lib/session";

export async function setPeladaPlanManually(peladaId: string, plan: PeladaPlan) {
  await requireMaster();
  await prisma.pelada.update({ where: { id: peladaId }, data: { plan, trialEndsAt: null } });
  revalidatePath("/admins/peladas");
}

export async function archiveAndDeletePelada(peladaId: string) {
  const user = await getCurrentUser();
  if (!user || !user.active) redirect("/login");
  const membership =
    user.role === "MASTER"
      ? null
      : await prisma.peladaMembership.findUnique({
          where: { userId_peladaId: { userId: user.id, peladaId } },
          select: { role: true }
        });

  if (user.role !== "MASTER" && membership?.role !== "PRESIDENTE" && membership?.role !== "ADMIN") redirect("/peladas");

  const players = await prisma.player.findMany({
    where: { peladaId, userId: { not: null } },
    select: { userId: true }
  });

  await prisma.$transaction(async (tx) => {
    for (const player of players) {
      if (!player.userId) continue;
      await archiveUserPeladaStats(player.userId, peladaId, tx);
    }

    await tx.pelada.delete({ where: { id: peladaId } });
  });

  revalidatePath("/admins/peladas");
  revalidatePath("/peladas");
  redirect(user.role === "MASTER" ? "/admins/peladas" : "/peladas");
}
