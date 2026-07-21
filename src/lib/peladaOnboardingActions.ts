"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PeladaRole } from "@prisma/client";
import { ACTIVE_PELADA_COOKIE, getCurrentUser, requireAdmin } from "@/lib/session";
import { canAddMensalista, createPeladaWithTrial } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";
import { cookies } from "next/headers";

/**
 * Reuses an already-onboarded user's profile (name/photo from User, position
 * from their most recent Player elsewhere) to skip onboarding when joining
 * another pelada. Returns false if the user has never onboarded before.
 */
async function autoCreatePlayerIfOnboarded(userId: string, peladaId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboarded: true, name: true, image: true }
  });
  if (!dbUser?.onboarded) return false;

  const priorPlayer = await prisma.player.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { nickname: true, photoUrl: true, position: true }
  });

  const membershipStatus = (await canAddMensalista(peladaId)) ? "MENSALISTA" : "CONVIDADO";

  await prisma.player.upsert({
    where: { userId_peladaId: { userId, peladaId } },
    update: {},
    create: {
      userId,
      peladaId,
      nickname: priorPlayer?.nickname || dbUser.name || "Jogador",
      photoUrl: priorPlayer?.photoUrl ?? dbUser.image ?? null,
      position: priorPlayer?.position ?? "MEIA",
      membershipStatus,
      rating: 0
    }
  });
  return true;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function uniqueSlug(name: string) {
  const base = slugify(name) || "pelada";
  let slug = base;
  let attempt = 0;
  while (await prisma.pelada.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

export function buildInvitePath(code: string, matchId?: string) {
  return `/convite/${code}${matchId ? `?matchId=${encodeURIComponent(matchId)}` : ""}`;
}

type InviteValidity = { revokedAt: Date | null; expiresAt: Date | null; maxUses: number | null; usedCount: number };

export function isInviteValid<T extends InviteValidity>(invite: T | null): invite is T {
  if (!invite) return false;
  return (
    !invite.revokedAt &&
    (!invite.expiresAt || invite.expiresAt > new Date()) &&
    (invite.maxUses == null || invite.usedCount < invite.maxUses)
  );
}

async function setActivePeladaCookie(peladaId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PELADA_COOKIE, peladaId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
}

export async function createPeladaAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !user.active) redirect("/login");

  const name = String(formData.get("name") || "").trim();
  const maxLinePlayers = Number(formData.get("maxLinePlayers") || 18);
  const maxGoalkeepers = Number(formData.get("maxGoalkeepers") || 2);
  if (!name) redirect("/peladas/criar?error=Informe%20um%20nome");
  if (!Number.isInteger(maxLinePlayers) || maxLinePlayers < 1) {
    redirect(`/peladas/criar?error=${encodeURIComponent("Informe pelo menos 1 jogador de linha.")}`);
  }
  if (!Number.isInteger(maxGoalkeepers) || maxGoalkeepers < 0) {
    redirect(`/peladas/criar?error=${encodeURIComponent("Informe uma quantidade valida de goleiros.")}`);
  }
  const existingName = await prisma.pelada.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true }
  });
  if (existingName) {
    redirect(`/peladas/criar?error=${encodeURIComponent("Ja existe uma pelada com esse nome. Use outro nome para evitar confusao na busca.")}`);
  }

  const slug = await uniqueSlug(name);
  const pelada = await prisma.$transaction(async (tx) => {
    const created = await createPeladaWithTrial(
      { name, slug, createdByUserId: user.id, maxLinePlayers, maxGoalkeepers },
      tx
    );
    await tx.peladaMembership.create({
      data: { userId: user.id, peladaId: created.id, role: PeladaRole.PRESIDENTE }
    });
    return created;
  });
  await setActivePeladaCookie(pelada.id);
  redirect("/perfil/onboarding");
}

export async function createInvite(formData: FormData) {
  const admin = await requireAdmin();
  const maxUsesRaw = String(formData.get("maxUses") || "").trim();
  const maxUses = maxUsesRaw ? Math.max(1, Number(maxUsesRaw)) : null;

  await prisma.peladaInvite.create({
    data: { peladaId: admin.peladaId!, role: PeladaRole.JOGADOR, maxUses, createdByUserId: admin.id }
  });

  revalidatePath("/admins/convites");
}

export async function revokeInvite(inviteId: string) {
  const admin = await requireAdmin();
  await prisma.peladaInvite.updateMany({
    where: { id: inviteId, peladaId: admin.peladaId! },
    data: { revokedAt: new Date() }
  });
  revalidatePath("/admins/convites");
}

/**
 * Resolves where a user should land after joining (or already belonging to) a
 * pelada, optionally jumping straight into a specific match's attendance
 * screen when one is referenced.
 */
export async function resolvePostJoinPath(userId: string, peladaId: string, matchId?: string) {
  const targetMatch = matchId
    ? await prisma.match.findFirst({
        where: { id: matchId, peladaId, status: "OPEN", deletedAt: null },
        select: { id: true }
      })
    : null;
  const alreadyOnboarded = await autoCreatePlayerIfOnboarded(userId, peladaId);
  await setActivePeladaCookie(peladaId);
  return alreadyOnboarded ? (targetMatch ? `/matches/${targetMatch.id}/attendance` : "/dashboard") : "/perfil/onboarding";
}

export async function acceptInvite(code: string, matchId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.active) redirect(`/login?callbackUrl=${encodeURIComponent(buildInvitePath(code, matchId))}`);

  const invite = await prisma.peladaInvite.findUnique({ where: { code } });
  if (!isInviteValid(invite)) {
    redirect(`/convite/${code}?error=Convite%20invalido%20ou%20expirado`);
  }

  const existing = await prisma.peladaMembership.findUnique({
    where: { userId_peladaId: { userId: user.id, peladaId: invite.peladaId } }
  });

  if (!existing) {
    await prisma.$transaction([
      prisma.peladaMembership.create({
        data: { userId: user.id, peladaId: invite.peladaId, role: PeladaRole.JOGADOR }
      }),
      prisma.peladaInvite.update({ where: { id: invite.id }, data: { usedCount: { increment: 1 } } })
    ]);
  }

  redirect(await resolvePostJoinPath(user.id, invite.peladaId, matchId));
}

export async function requestJoinPelada(peladaId: string) {
  const user = await getCurrentUser();
  if (!user || !user.active) redirect("/login");

  const existingMembership = await prisma.peladaMembership.findUnique({
    where: { userId_peladaId: { userId: user.id, peladaId } }
  });
  if (existingMembership) {
    redirect("/peladas");
  }

  await prisma.peladaJoinRequest.upsert({
    where: { peladaId_userId: { peladaId, userId: user.id } },
    update: { status: "PENDING" },
    create: { peladaId, userId: user.id, status: "PENDING" }
  });

  revalidatePath("/peladas/buscar");
}

export async function approveJoinRequest(requestId: string) {
  const admin = await requireAdmin();
  const request = await prisma.peladaJoinRequest.findFirst({
    where: { id: requestId, peladaId: admin.peladaId! },
    include: { pelada: { select: { name: true } } }
  });
  if (!request) return;

  await prisma.$transaction([
    prisma.peladaMembership.upsert({
      where: { userId_peladaId: { userId: request.userId, peladaId: request.peladaId } },
      update: {},
      create: { userId: request.userId, peladaId: request.peladaId, role: PeladaRole.JOGADOR }
    }),
    prisma.peladaJoinRequest.update({ where: { id: requestId }, data: { status: "APPROVED" } })
  ]);

  const alreadyOnboarded = await autoCreatePlayerIfOnboarded(request.userId, request.peladaId);

  await sendPushToUsers([request.userId], {
    title: "Pedido aprovado!",
    body: alreadyOnboarded
      ? `Voce foi aceito na pelada ${request.pelada.name}. Bora jogar!`
      : `Voce foi aceito na pelada ${request.pelada.name}. Complete seu perfil para entrar no elenco.`,
    url: alreadyOnboarded ? "/dashboard" : "/perfil/onboarding"
  });

  revalidatePath("/admins/solicitacoes");
}

export async function rejectJoinRequest(requestId: string) {
  const admin = await requireAdmin();
  await prisma.peladaJoinRequest.updateMany({
    where: { id: requestId, peladaId: admin.peladaId! },
    data: { status: "REJECTED" }
  });
  revalidatePath("/admins/solicitacoes");
}
