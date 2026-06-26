import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const MENSALISTA_FREE_LIMIT = 20;
export const MAX_PRO_PELADAS_PER_USER = 5;

export const PLAN_PRICES = {
  mensal: { label: "Mensal", amount: 29.9, frequency: 1 },
  trimestral: { label: "Trimestral", amount: 80.7, frequency: 3 },
  anual: { label: "Anual", amount: 298.8, frequency: 12 }
} as const;

export type PlanInterval = keyof typeof PLAN_PRICES;

export function isUserPro(user: { plan: string; proRenewsAt: Date | null }) {
  if (user.plan !== "PRO" && user.plan !== "PRO_IN_PROGRESS") return false;
  return Boolean(user.proRenewsAt && user.proRenewsAt.getTime() > Date.now());
}

export async function getOwnerProPeladaIds(ownerId: string) {
  const peladas = await prisma.pelada.findMany({
    where: { createdByUserId: ownerId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
    take: MAX_PRO_PELADAS_PER_USER
  });
  return new Set(peladas.map((pelada) => pelada.id));
}

export async function isPeladaIdPro(peladaId: string) {
  const pelada = await prisma.pelada.findUnique({
    where: { id: peladaId },
    select: { trialEndsAt: true, createdByUserId: true }
  });
  if (!pelada) return false;
  if (pelada.trialEndsAt && pelada.trialEndsAt.getTime() > Date.now()) return true;
  if (!pelada.createdByUserId) return false;

  const owner = await prisma.user.findUnique({
    where: { id: pelada.createdByUserId },
    select: { plan: true, proRenewsAt: true }
  });
  if (!owner || !isUserPro(owner)) return false;

  const proPeladaIds = await getOwnerProPeladaIds(pelada.createdByUserId);
  return proPeladaIds.has(peladaId);
}

export async function canAddMensalista(peladaId: string) {
  if (await isPeladaIdPro(peladaId)) return true;

  const activeMensalistas = await prisma.player.count({
    where: { peladaId, active: true, membershipStatus: "MENSALISTA" }
  });
  return activeMensalistas < MENSALISTA_FREE_LIMIT;
}

export async function enforceFreeTierMensalistaLimit(peladaId: string) {
  if (await isPeladaIdPro(peladaId)) return { changed: 0 };

  const activeMensalistas = await prisma.player.findMany({
    where: { peladaId, active: true, membershipStatus: "MENSALISTA" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true }
  });

  if (activeMensalistas.length <= MENSALISTA_FREE_LIMIT) return { changed: 0 };

  const excessIds = activeMensalistas.slice(MENSALISTA_FREE_LIMIT).map((player) => player.id);
  const result = await prisma.player.updateMany({
    where: { id: { in: excessIds } },
    data: { active: false }
  });

  return { changed: result.count };
}

export async function createPeladaWithTrial(
  data: {
    name: string;
    slug: string;
    createdByUserId?: string;
    maxLinePlayers?: number;
    maxGoalkeepers?: number;
  },
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  return client.pelada.create({
    data: {
      ...data,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    }
  });
}
