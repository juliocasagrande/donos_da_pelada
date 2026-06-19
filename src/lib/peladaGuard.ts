import { prisma } from "@/lib/prisma";

export class PeladaOwnershipError extends Error {
  constructor(entity: string) {
    super(`${entity} nao encontrado(a) nesta pelada.`);
  }
}

export async function assertMatchInPelada(matchId: string, peladaId: string) {
  const match = await prisma.match.findFirst({ where: { id: matchId, peladaId, deletedAt: null }, select: { id: true } });
  if (!match) throw new PeladaOwnershipError("Partida");
  return match;
}

export async function assertPlayerInPelada(playerId: string, peladaId: string) {
  const player = await prisma.player.findFirst({ where: { id: playerId, peladaId }, select: { id: true } });
  if (!player) throw new PeladaOwnershipError("Jogador");
  return player;
}

export async function assertTransactionInPelada(transactionId: string, peladaId: string) {
  const transaction = await prisma.transaction.findFirst({ where: { id: transactionId, peladaId }, select: { id: true } });
  if (!transaction) throw new PeladaOwnershipError("Transacao");
  return transaction;
}

export async function assertPollInPelada(pollId: string, peladaId: string) {
  const poll = await prisma.poll.findFirst({ where: { id: pollId, match: { peladaId, deletedAt: null } }, select: { id: true, matchId: true } });
  if (!poll) throw new PeladaOwnershipError("Votacao");
  return poll;
}
