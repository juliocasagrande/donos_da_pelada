"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DeletionRequestTarget, DeletionVoteValue, PeladaRole, PollStatus, Prisma } from "@prisma/client";
import { archiveUserPeladaStats } from "@/lib/careerStats";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdmin } from "@/lib/session";
import { sendPushToUsers } from "@/lib/push";
import { logAudit } from "@/lib/audit";

type DbClient = typeof prisma | Prisma.TransactionClient;

async function getPeladaAdminUserIds(peladaId: string, db: DbClient = prisma) {
  const admins = await db.peladaMembership.findMany({
    where: {
      peladaId,
      role: { in: [PeladaRole.PRESIDENTE, PeladaRole.ADMIN] },
      user: { active: true }
    },
    select: { userId: true }
  });

  return [...new Set(admins.map((admin) => admin.userId))];
}

async function executePlayerDeletion(playerId: string, peladaId: string, db: DbClient) {
  const player = await db.player.findFirst({ where: { id: playerId, peladaId } });
  if (!player) return;

  if (player.userId) {
    await archiveUserPeladaStats(player.userId, peladaId, db);
    await db.peladaMembership.deleteMany({ where: { userId: player.userId, peladaId } });
  }

  await db.player.update({
    where: { id: playerId },
    data: { active: false, userId: null }
  });
}

async function executePeladaDeletion(peladaId: string, db: DbClient) {
  const players = await db.player.findMany({
    where: { peladaId, userId: { not: null } },
    select: { userId: true }
  });

  for (const player of players) {
    if (!player.userId) continue;
    await archiveUserPeladaStats(player.userId, peladaId, db);
  }

  await db.pelada.delete({ where: { id: peladaId } });
}

function targetLabel(target: DeletionRequestTarget) {
  return target === DeletionRequestTarget.PELADA ? "pelada" : "jogador";
}

async function refreshDeletionPaths(peladaId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/players");
  revalidatePath("/admins");
  revalidatePath("/peladas");
  revalidatePath("/admins/peladas");
}

async function evaluateDeletionRequest(requestId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.deletionRequest.findUnique({
      where: { id: requestId },
      include: { votes: true }
    });
    if (!request || request.status !== PollStatus.OPEN) return null;

    const adminUserIds = await getPeladaAdminUserIds(request.peladaId, tx);
    const adminUserIdSet = new Set(adminUserIds);
    const validVotes = request.votes.filter((vote) => adminUserIdSet.has(vote.userId));
    const yesVotes = validVotes.filter((vote) => vote.vote === DeletionVoteValue.YES).length;
    const noVotes = validVotes.filter((vote) => vote.vote === DeletionVoteValue.NO).length;
    const requiredYesVotes = Math.floor(adminUserIds.length / 2) + 1;

    if (adminUserIds.length === 0) return request;

    if (yesVotes >= requiredYesVotes) {
      await tx.deletionRequest.update({
        where: { id: request.id },
        data: { status: PollStatus.CLOSED, executedAt: new Date() }
      });

      if (request.target === DeletionRequestTarget.PLAYER) {
        await executePlayerDeletion(request.targetId, request.peladaId, tx);
      } else {
        await executePeladaDeletion(request.peladaId, tx);
      }

      return { ...request, executed: true };
    }

    if (adminUserIds.length - noVotes < requiredYesVotes) {
      await tx.deletionRequest.update({
        where: { id: request.id },
        data: { status: PollStatus.CLOSED }
      });
    }

    return request;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (result) await refreshDeletionPaths(result.peladaId);
  return result;
}

export async function requestPlayerDeletion(playerId: string) {
  const admin = await requireAdmin();
  const player = await prisma.player.findFirst({
    where: { id: playerId, peladaId: admin.peladaId! },
    include: { user: true }
  });
  if (!player) return;

  const membership = player.userId
    ? await prisma.peladaMembership.findUnique({
        where: { userId_peladaId: { userId: player.userId, peladaId: admin.peladaId! } },
        select: { role: true }
      })
    : null;

  if (player.userId && (membership?.role === PeladaRole.PRESIDENTE || membership?.role === PeladaRole.ADMIN)) {
    const otherAdmins = await prisma.peladaMembership.count({
      where: {
        peladaId: admin.peladaId!,
        userId: { not: player.userId },
        role: { in: [PeladaRole.PRESIDENTE, PeladaRole.ADMIN] }
      }
    });
    if (otherAdmins === 0) {
      redirect(
        `/players/${playerId}/edit?error=${encodeURIComponent(
          "Adicione outro admin antes de remover este jogador da pelada."
        )}`
      );
    }
  }

  const request = await createDeletionRequest({
    peladaId: admin.peladaId!,
    target: DeletionRequestTarget.PLAYER,
    targetId: player.id,
    targetName: player.nickname,
    createdByUserId: admin.id
  });

  await logAudit(admin, "PLAYER_DELETION_REQUESTED", { type: "Player", id: playerId }, { name: player.nickname });
  await evaluateDeletionRequest(request.id);
  redirect("/players");
}

export async function requestPeladaDeletion(peladaId: string) {
  const user = await getCurrentUser();
  if (!user || !user.active) redirect("/login");

  const pelada = await prisma.pelada.findUnique({ where: { id: peladaId }, select: { id: true, name: true } });
  if (!pelada) redirect("/peladas");

  if (user.role === "MASTER") {
    await prisma.$transaction((tx) => executePeladaDeletion(peladaId, tx));
    await refreshDeletionPaths(peladaId);
    redirect("/admins/peladas");
  }

  const membership = await prisma.peladaMembership.findUnique({
    where: { userId_peladaId: { userId: user.id, peladaId } },
    select: { role: true }
  });

  if (membership?.role !== PeladaRole.PRESIDENTE && membership?.role !== PeladaRole.ADMIN) {
    redirect("/peladas");
  }

  const request = await createDeletionRequest({
    peladaId,
    target: DeletionRequestTarget.PELADA,
    targetId: pelada.id,
    targetName: pelada.name,
    createdByUserId: user.id
  });

  await logAudit(user, "PELADA_DELETION_REQUESTED", { type: "Pelada", id: peladaId }, { name: pelada.name });
  const evaluated = await evaluateDeletionRequest(request.id);
  redirect(evaluated && "executed" in evaluated && evaluated.executed ? "/peladas" : "/dashboard");
}

async function createDeletionRequest({
  peladaId,
  target,
  targetId,
  targetName,
  createdByUserId
}: {
  peladaId: string;
  target: DeletionRequestTarget;
  targetId: string;
  targetName: string;
  createdByUserId: string;
}) {
  const existing = await prisma.deletionRequest.findFirst({
    where: { peladaId, target, targetId, status: PollStatus.OPEN }
  });
  if (existing) return existing;

  const request = await prisma.deletionRequest.create({
    data: {
      peladaId,
      target,
      targetId,
      targetName,
      createdByUserId,
      votes: {
        create: {
          userId: createdByUserId,
          vote: DeletionVoteValue.YES
        }
      }
    }
  });

  const adminUserIds = (await getPeladaAdminUserIds(peladaId)).filter((userId) => userId !== createdByUserId);
  await sendPushToUsers(adminUserIds, {
    title: "Votacao de exclusao aberta",
    body: `Vote sobre excluir ${targetLabel(target)}: ${targetName}.`,
    url: "/dashboard"
  });

  await refreshDeletionPaths(peladaId);
  return request;
}

export async function voteDeletionRequest(requestId: string, vote: DeletionVoteValue) {
  const admin = await requireAdmin();
  const request = await prisma.deletionRequest.findUnique({ where: { id: requestId } });
  if (!request || request.peladaId !== admin.peladaId || request.status !== PollStatus.OPEN) return;

  await prisma.deletionVote.upsert({
    where: { requestId_userId: { requestId, userId: admin.id } },
    update: { vote },
    create: { requestId, userId: admin.id, vote }
  });

  await logAudit(admin, "DELETION_REQUEST_VOTED", { type: "DeletionRequest", id: requestId }, { vote });
  await evaluateDeletionRequest(requestId);
  revalidatePath("/dashboard");
}
