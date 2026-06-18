import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const MENSALISTA_FREE_LIMIT = 20;

export const PLAN_PRICES = {
  mensal: { label: "Mensal", amount: 29.9, frequency: 1 },
  trimestral: { label: "Trimestral", amount: 80.7, frequency: 3 },
  anual: { label: "Anual", amount: 298.8, frequency: 12 }
} as const;

export type PlanInterval = keyof typeof PLAN_PRICES;

export function isPeladaPro(pelada: {
  plan: string;
  trialEndsAt: Date | null;
  proRenewsAt?: Date | null;
  subscriptionCancelledAt?: Date | null;
}) {
  if (pelada.plan === "PRO" || pelada.plan === "PRO_IN_PROGRESS") {
    return Boolean(pelada.proRenewsAt && pelada.proRenewsAt.getTime() > Date.now());
  }
  return Boolean(pelada.trialEndsAt && pelada.trialEndsAt.getTime() > Date.now());
}

export async function isPeladaIdPro(peladaId: string) {
  const pelada = await prisma.pelada.findUnique({
    where: { id: peladaId },
    select: { plan: true, trialEndsAt: true, proRenewsAt: true, subscriptionCancelledAt: true }
  });
  return Boolean(pelada && isPeladaPro(pelada));
}

export async function canAddMensalista(peladaId: string) {
  const pelada = await prisma.pelada.findUnique({
    where: { id: peladaId },
    select: { plan: true, trialEndsAt: true, proRenewsAt: true, subscriptionCancelledAt: true }
  });
  if (!pelada) return false;
  if (isPeladaPro(pelada)) return true;

  const activeMensalistas = await prisma.player.count({
    where: { peladaId, active: true, membershipStatus: "MENSALISTA" }
  });
  return activeMensalistas < MENSALISTA_FREE_LIMIT;
}

export async function enforceFreeTierMensalistaLimit(peladaId: string) {
  const pelada = await prisma.pelada.findUnique({
    where: { id: peladaId },
    select: { plan: true, trialEndsAt: true, proRenewsAt: true, subscriptionCancelledAt: true }
  });
  if (!pelada || isPeladaPro(pelada)) return { changed: 0 };

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
