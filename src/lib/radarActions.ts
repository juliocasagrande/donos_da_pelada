"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { GuestFeeMode, GuestPosition, PlayerPosition, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/session";
import { assertMatchInPelada } from "@/lib/peladaGuard";
import { getAttendanceStatusForPlayer, getPeladaAdminUserIds } from "@/lib/actions";
import { sendPushToUsers } from "@/lib/push";
import { searchAddress } from "@/lib/geocode";
import { getUserGlobalRating } from "@/lib/rating";
import { hasConflictingConfirmedMatch } from "@/lib/matchConflicts";

async function getApprovedGuestCount(matchId: string, position: GuestPosition) {
  return prisma.matchGuestRequest.count({ where: { matchId, status: "APPROVED", position } });
}

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw : "";
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function optionalRating(raw: string) {
  if (!raw) return null;
  const rating = Number(raw);
  if (!Number.isFinite(rating)) return null;
  return Math.round(clamp(rating, 0, 10) * 2) / 2;
}

export async function updateRadarSettings(formData: FormData) {
  const user = await requireUser();
  const radarEnabled = value(formData, "radarEnabled") === "on";
  const radarRadiusKm = clamp(Number(value(formData, "radarRadiusKm")) || 10, 1, 20);
  const address = value(formData, "address").trim();
  const latRaw = value(formData, "latitude");
  const lonRaw = value(formData, "longitude");
  let latitude = latRaw ? Number(latRaw) : null;
  let longitude = lonRaw ? Number(lonRaw) : null;

  if (radarEnabled && address && (latitude == null || longitude == null)) {
    const [first] = await searchAddress(address);
    if (first) {
      latitude = first.lat;
      longitude = first.lon;
    }
  }

  if (radarEnabled && (!address || latitude == null || longitude == null)) {
    redirect(`/perfil?radarErro=${encodeURIComponent("Escolha um endereco da lista para ativar o radar.")}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      radarEnabled,
      radarRadiusKm,
      address: address || null,
      latitude,
      longitude
    }
  });

  revalidatePath("/perfil");
  revalidatePath("/dashboard");
  redirect("/perfil?salvo=1");
}

export async function openMatchToGuests(matchId: string, formData: FormData) {
  const admin = await requireAdmin();
  await assertMatchInPelada(matchId, admin.peladaId!);
  const match = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });

  const guestLineSlots = Math.max(0, Math.trunc(Number(value(formData, "guestLineSlots")) || 0));
  const guestGoalkeeperSlots = Math.max(0, Math.trunc(Number(value(formData, "guestGoalkeeperSlots")) || 0));
  const guestLineFeeMode = (value(formData, "guestLineFeeMode") || "FREE") as GuestFeeMode;
  const guestGoalkeeperFeeMode = (value(formData, "guestGoalkeeperFeeMode") || "FREE") as GuestFeeMode;
  const guestLineFeeAmount = guestLineFeeMode === GuestFeeMode.FREE ? null : Number(value(formData, "guestLineFeeAmount")) || 0;
  const guestGoalkeeperFeeAmount =
    guestGoalkeeperFeeMode === GuestFeeMode.FREE ? null : Number(value(formData, "guestGoalkeeperFeeAmount")) || 0;
  const minRatingRaw = value(formData, "guestMinRating");
  const maxRatingRaw = value(formData, "guestMaxRating");
  const guestMinRating = optionalRating(minRatingRaw);
  const guestMaxRating = optionalRating(maxRatingRaw);
  if (guestMinRating != null && guestMaxRating != null && guestMinRating > guestMaxRating) {
    redirect(`/matches/${matchId}/attendance?radarErro=${encodeURIComponent("A nota minima nao pode ser maior que a nota maxima.")}`);
  }

  let guestLatitude: number | null = null;
  let guestLongitude: number | null = null;
  if (match.location) {
    const [first] = await searchAddress(match.location);
    if (first) {
      guestLatitude = first.lat;
      guestLongitude = first.lon;
    }
  }

  if (guestLatitude == null || guestLongitude == null) {
    redirect(`/matches/${matchId}/attendance?radarErro=${encodeURIComponent("Nao foi possivel localizar o endereco da pelada para o radar.")}`);
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      openToGuests: true,
      guestLatitude,
      guestLongitude,
      guestLineSlots,
      guestGoalkeeperSlots,
      guestLineFeeMode,
      guestGoalkeeperFeeMode,
      guestLineFeeAmount,
      guestGoalkeeperFeeAmount,
      guestMinRating,
      guestMaxRating
    }
  });

  revalidatePath(`/matches/${matchId}/attendance`);
  revalidatePath("/radar");
  redirect(`/matches/${matchId}/attendance?radarAberto=1`);
}

export async function closeMatchToGuests(matchId: string) {
  const admin = await requireAdmin();
  await assertMatchInPelada(matchId, admin.peladaId!);

  await prisma.match.update({ where: { id: matchId }, data: { openToGuests: false } });
  await prisma.matchGuestRequest.updateMany({
    where: { matchId, status: "PENDING" },
    data: { status: "REJECTED" }
  });

  revalidatePath(`/matches/${matchId}/attendance`);
  revalidatePath("/radar");
}

export async function requestMatchGuestSlot(matchId: string, formData: FormData) {
  const user = await requireUser();
  const position = (value(formData, "position") || "LINHA") as GuestPosition;

  const match = await prisma.match.findFirst({
    where: { id: matchId, deletedAt: null, openToGuests: true }
  });
  if (!match) redirect("/radar?radarErro=Pelada%20nao%20encontrada%20ou%20nao%20esta%20mais%20aberta.");

  const slotLimit = position === "GOLEIRO" ? match!.guestGoalkeeperSlots : match!.guestLineSlots;
  if (slotLimit != null) {
    const approvedCount = await getApprovedGuestCount(matchId, position);
    if (approvedCount >= slotLimit) {
      redirect(`/radar?radarErro=${encodeURIComponent("Vagas esgotadas para essa posicao nessa pelada.")}`);
    }
  }

  await prisma.matchGuestRequest.upsert({
    where: { matchId_userId: { matchId, userId: user.id } },
    update: { status: "PENDING", position },
    create: { matchId, userId: user.id, position, status: "PENDING" }
  });

  const adminUserIds = await getPeladaAdminUserIds(match!.peladaId);
  await sendPushToUsers(adminUserIds, {
    title: "Pedido para jogar",
    body: `${user.name || user.email} quer jogar em ${match!.title}.`,
    url: "/admins/radar"
  });

  revalidatePath("/radar");
  redirect("/radar?solicitado=1");
}

export async function approveMatchGuestRequest(requestId: string) {
  const admin = await requireAdmin();
  const request = await prisma.matchGuestRequest.findFirst({
    where: { id: requestId, match: { peladaId: admin.peladaId! } },
    include: { match: true, user: true }
  });
  if (!request || request.status !== "PENDING") {
    revalidatePath("/admins/radar");
    return;
  }

  const slotLimit = request.position === "GOLEIRO" ? request.match.guestGoalkeeperSlots : request.match.guestLineSlots;
  if (slotLimit != null) {
    const approvedCount = await getApprovedGuestCount(request.matchId, request.position);
    if (approvedCount >= slotLimit) {
      redirect(`/admins/radar?radarErro=${encodeURIComponent("Vagas esgotadas para essa posicao nessa pelada.")}`);
    }
  }

  if (await hasConflictingConfirmedMatch(request.userId, request.match.date, request.matchId, request.match.peladaId)) {
    redirect(
      `/admins/radar?radarErro=${encodeURIComponent("Esse jogador ja tem outra pelada confirmada com menos de 30 min de diferenca.")}`
    );
  }

  const globalRating = await getUserGlobalRating(request.userId);
  const comparableRating = globalRating ?? 0;
  if (request.match.guestMinRating != null && comparableRating < request.match.guestMinRating) {
    redirect(`/admins/radar?radarErro=${encodeURIComponent("Esse jogador esta abaixo da nota minima definida para a pelada.")}`);
  }
  if (request.match.guestMaxRating != null && comparableRating > request.match.guestMaxRating) {
    redirect(`/admins/radar?radarErro=${encodeURIComponent("Esse jogador esta acima da nota maxima definida para a pelada.")}`);
  }
  const position = request.position === "GOLEIRO" ? PlayerPosition.GOLEIRO : PlayerPosition.MEIA;

  await prisma.$transaction(
    async (tx) => {
      const player = await tx.player.upsert({
        where: { userId_peladaId: { userId: request.userId, peladaId: request.match.peladaId } },
        update: { active: true },
        create: {
          userId: request.userId,
          peladaId: request.match.peladaId,
          nickname: request.user.name || request.user.email || "Convidado",
          position,
          membershipStatus: "CONVIDADO",
          rating: globalRating ?? 0,
          ratingAssigned: true
        }
      });

      const status = await getAttendanceStatusForPlayer(request.matchId, player.position, request.match.date, tx);
      await tx.attendance.upsert({
        where: { matchId_playerId: { matchId: request.matchId, playerId: player.id } },
        update: { present: status === "CONFIRMED", status, confirmedAt: status === "CONFIRMED" ? new Date() : null },
        create: {
          matchId: request.matchId,
          playerId: player.id,
          present: status === "CONFIRMED",
          status,
          confirmedAt: status === "CONFIRMED" ? new Date() : null,
          invitedByUserId: admin.id
        }
      });

      await tx.matchGuestRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", playerId: player.id }
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  await sendPushToUsers([request.userId], {
    title: "Pedido aprovado!",
    body: `Voce foi confirmado em ${request.match.title}.`,
    url: `/matches/${request.matchId}/attendance`
  });

  revalidatePath("/admins/radar");
  revalidatePath(`/matches/${request.matchId}/attendance`);
  revalidatePath("/dashboard");
}

export async function rejectMatchGuestRequest(requestId: string) {
  const admin = await requireAdmin();
  const request = await prisma.matchGuestRequest.findFirst({
    where: { id: requestId, match: { peladaId: admin.peladaId! } },
    include: { match: true }
  });
  if (!request) return;

  await prisma.matchGuestRequest.update({ where: { id: requestId }, data: { status: "REJECTED" } });

  await sendPushToUsers([request.userId], {
    title: "Pedido nao aceito",
    body: `Seu pedido para jogar em ${request.match.title} nao foi aceito.`,
    url: "/radar"
  });

  revalidatePath("/admins/radar");
}
