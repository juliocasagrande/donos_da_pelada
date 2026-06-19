"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MatchStatus, PeladaRole, PollStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isPeladaAdmin, requireAdmin, requireMaster, requireUser } from "@/lib/session";
import { drawSchema, matchSchema, passwordSchema, playerSchema, signupSchema } from "@/lib/validations";
import { balanceTeams } from "@/lib/balanceTeams";
import { archiveUserPeladaStats } from "@/lib/careerStats";
import { MENSALISTA_FREE_LIMIT, canAddMensalista, isPeladaIdPro } from "@/lib/plan";
import { assertMatchInPelada, assertPlayerInPelada, assertPollInPelada } from "@/lib/peladaGuard";
import { sendPushToAll, sendPushToUsers } from "@/lib/push";
import { canConfirmPlayer, isWithinVotingWindow } from "@/lib/attendance";
import { logAudit } from "@/lib/audit";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw : "";
}

function normalizeWhatsapp(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function getSaoPauloParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute)
  };
}

function isSameSaoPauloDate(a: Date, b: Date) {
  const left = getSaoPauloParts(a);
  const right = getSaoPauloParts(b);
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

function areGoalkeeperSlotsReleased(matchDate: Date) {
  const now = getSaoPauloParts();
  return isSameSaoPauloDate(new Date(), matchDate) && (now.hour > 16 || (now.hour === 16 && now.minute >= 30));
}

type DbClient = typeof prisma | Prisma.TransactionClient;

async function getConfirmedCounts(matchId: string, db: DbClient = prisma) {
  const confirmed = await db.attendance.findMany({
    where: { matchId, status: "CONFIRMED" },
    include: { player: true }
  });

  const goalkeepers = confirmed.filter((attendance) => attendance.player.position === "GOLEIRO").length;
  return {
    total: confirmed.length,
    goalkeepers,
    line: confirmed.length - goalkeepers
  };
}

async function canUserVoteInMatch(userId: string, matchId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, select: { peladaId: true } });
  if (!match) return false;
  const player = await prisma.player.findFirst({
    where: { userId, peladaId: match.peladaId, active: true, membershipStatus: "MENSALISTA" }
  });
  if (!player) return false;

  const attendance = await prisma.attendance.findUnique({
    where: { matchId_playerId: { matchId, playerId: player.id } }
  });

  return attendance?.status === "CONFIRMED";
}

async function demotePeladaAdminIfNotActiveMensalista(userId: string | null | undefined, peladaId: string) {
  if (!userId) return;
  const activeMensalista = await prisma.player.findFirst({
    where: { userId, peladaId, active: true, membershipStatus: "MENSALISTA" },
    select: { id: true }
  });
  if (activeMensalista) return;

  await prisma.peladaMembership.updateMany({
    where: { userId, peladaId, role: PeladaRole.ADMIN },
    data: { role: PeladaRole.JOGADOR }
  });
}

async function getEligibleMatchVoterUserIds(matchId: string) {
  const attendances = await prisma.attendance.findMany({
    where: {
      matchId,
      status: "CONFIRMED",
      player: {
        active: true,
        membershipStatus: "MENSALISTA",
        userId: { not: null }
      }
    },
    select: { player: { select: { userId: true } } }
  });

  return [...new Set(attendances.map((attendance) => attendance.player.userId).filter((userId): userId is string => Boolean(userId)))];
}

async function getAttendanceStatusForPlayer(
  matchId: string,
  position: string,
  matchDate: Date,
  db: DbClient = prisma
) {
  const counts = await getConfirmedCounts(matchId, db);
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { pelada: { select: { maxLinePlayers: true, maxGoalkeepers: true } } }
  });
  const capacity = {
    line: match?.pelada.maxLinePlayers ?? 18,
    goalkeepers: match?.pelada.maxGoalkeepers ?? 2
  };

  return canConfirmPlayer(position, counts, areGoalkeeperSlotsReleased(matchDate), capacity) ? "CONFIRMED" : "WAITLIST";
}

async function promoteNextFromWaitlist(matchId: string) {
  const promoted = await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: matchId } });
    if (!match) return null;

    const waitlist = await tx.attendance.findMany({
      where: { matchId, status: "WAITLIST" },
      include: { player: { include: { user: true } } },
      orderBy: { createdAt: "asc" }
    });

    for (const attendance of waitlist) {
      const status = await getAttendanceStatusForPlayer(matchId, attendance.player.position, match.date, tx);
      if (status !== "CONFIRMED") continue;

      await tx.attendance.update({
        where: { id: attendance.id },
        data: { status: "CONFIRMED", present: true, confirmedAt: new Date() }
      });

      return { match, attendance };
    }

    return null;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (promoted?.attendance.player.userId) {
    await sendPushToUsers([promoted.attendance.player.userId], {
      title: "Voce entrou na pelada",
      body: `Abriu uma vaga na ${promoted.match.title}. Voce saiu da lista de espera.`,
      url: `/matches/${matchId}/attendance`
    });
  }
}

function averageLatestMatchRatings(
  ratings: { value: number; match: { date: Date } }[],
  limit = 10
) {
  const grouped = new Map<number, number[]>();
  for (const rating of ratings) {
    grouped.set(rating.match.date.getTime(), [...(grouped.get(rating.match.date.getTime()) ?? []), rating.value]);
  }

  const averages = [...grouped.entries()]
    .sort(([left], [right]) => right - left)
    .slice(0, limit)
    .map(([, values]) => values.reduce((sum, value) => sum + value, 0) / values.length);

  return averages.length ? averages.reduce((sum, value) => sum + value, 0) / averages.length : null;
}

function playerBalanceRating(player: { rating: number; ratings: { value: number; match: { date: Date } }[] }) {
  return averageLatestMatchRatings(player.ratings, 10) ?? player.rating * 2;
}

export async function saveOnboarding(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !user.active) redirect("/login");
  if (!user.peladaId) redirect("/peladas");
  const currentPlayer = await prisma.player.findFirst({ where: { userId: user.id, peladaId: user.peladaId } });
  const parsed = playerSchema.parse({
    nickname: value(formData, "nickname"),
    photoUrl: value(formData, "photoUrl"),
    position: value(formData, "position"),
    membershipStatus: currentPlayer?.membershipStatus || (isPeladaAdmin(user) ? "MENSALISTA" : "CONVIDADO"),
    rating: currentPlayer?.rating ?? 0
  });

  await prisma.player.upsert({
    where: { userId_peladaId: { userId: user.id, peladaId: user.peladaId } },
    update: parsed,
    create: { ...parsed, userId: user.id, peladaId: user.peladaId, ratingAssigned: false }
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.nickname,
      image: parsed.photoUrl || undefined,
      onboarded: true,
      whatsapp: normalizeWhatsapp(value(formData, "whatsapp")),
      whatsappChatEnabled: value(formData, "whatsappChatEnabled") === "yes"
    }
  });

  redirect("/dashboard");
}

export async function updateOwnProfile(formData: FormData) {
  const user = await requireUser();
  const currentPlayer = await prisma.player.findFirst({ where: { userId: user.id, peladaId: user.peladaId! } });
  const parsed = playerSchema.parse({
    nickname: value(formData, "nickname"),
    photoUrl: value(formData, "photoUrl"),
    position: value(formData, "position"),
    membershipStatus: currentPlayer?.membershipStatus || "CONVIDADO",
    rating: currentPlayer?.rating ?? 0
  });

  await prisma.player.upsert({
    where: { userId_peladaId: { userId: user.id, peladaId: user.peladaId! } },
    update: parsed,
    create: { ...parsed, userId: user.id, peladaId: user.peladaId! }
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.nickname,
      image: parsed.photoUrl || undefined,
      whatsapp: normalizeWhatsapp(value(formData, "whatsapp")),
      whatsappChatEnabled: value(formData, "whatsappChatEnabled") === "yes"
    }
  });

  revalidatePath("/perfil");
  redirect("/perfil?salvo=1");
}

export async function changePassword(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !user.active) return { ok: false, error: "Sessao invalida. Faca login novamente." };

  const currentPassword = value(formData, "currentPassword");
  const newPassword = value(formData, "newPassword");

  const parsedPassword = passwordSchema.safeParse(newPassword);
  if (!parsedPassword.success) {
    return { ok: false, error: parsedPassword.error.issues[0]?.message || "Senha invalida." };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!dbUser?.passwordHash) {
    return { ok: false, error: "Esta conta usa login social e nao tem senha para alterar." };
  }

  const matches = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!matches) {
    return { ok: false, error: "Senha atual incorreta." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) }
  });

  return { ok: true };
}

export async function createLocalPassword(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !user.active) return { ok: false, error: "Sessao invalida. Faca login novamente." };

  const newPassword = value(formData, "newPassword");
  const parsedPassword = passwordSchema.safeParse(newPassword);
  if (!parsedPassword.success) {
    return { ok: false, error: parsedPassword.error.issues[0]?.message || "Senha invalida." };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (dbUser?.passwordHash) {
    return { ok: false, error: "Esta conta ja possui senha. Use a alteracao de senha." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) }
  });

  revalidatePath("/perfil");
  return { ok: true };
}

export async function createPlayerAccount(formData: FormData) {
  const parsed = signupSchema.safeParse({
    name: value(formData, "name").trim(),
    email: value(formData, "email").trim().toLowerCase(),
    password: value(formData, "password")
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Dados invalidos." };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Ja existe uma conta com este e-mail." };
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: UserRole.PLAYER,
      active: true,
      onboarded: false
    }
  });

  return { ok: true };
}

export async function toggleAdminRole(userId: string) {
  const current = await requireAdmin();
  if (current.id === userId) return;
  if (current.role !== "MASTER" && current.peladaRole !== "PRESIDENTE") return;

  const membership = await prisma.peladaMembership.findUnique({
    where: { userId_peladaId: { userId, peladaId: current.peladaId! } },
    include: { user: true }
  });
  if (!membership || membership.role === PeladaRole.PRESIDENTE || membership.user.role === "MASTER") return;

  const newRole = membership.role === PeladaRole.ADMIN ? PeladaRole.JOGADOR : PeladaRole.ADMIN;
  if (newRole === PeladaRole.ADMIN) {
    const activeMensalista = await prisma.player.findFirst({
      where: {
        userId,
        peladaId: current.peladaId!,
        active: true,
        membershipStatus: "MENSALISTA"
      },
      select: { id: true }
    });
    if (!activeMensalista) {
      redirect(`/admins?error=${encodeURIComponent("Somente mensalistas ativos podem ser administradores da pelada.")}`);
    }
  }

  await prisma.peladaMembership.update({
    where: { id: membership.id },
    data: { role: newRole }
  });

  await logAudit(current, newRole === PeladaRole.ADMIN ? "PELADA_ADMIN_PROMOTED" : "PELADA_ADMIN_DEMOTED", { type: "User", id: userId });
  revalidatePath("/admins");
}

export async function createPlayer(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = playerSchema.parse({
    nickname: value(formData, "nickname"),
    photoUrl: value(formData, "photoUrl"),
    position: value(formData, "position"),
    membershipStatus: value(formData, "membershipStatus") || "MENSALISTA",
    rating: Number(value(formData, "rating"))
  });

  if (parsed.membershipStatus === "MENSALISTA" && !(await canAddMensalista(admin.peladaId!))) {
    redirect(
      `/players/new?error=${encodeURIComponent(
        `Limite de ${MENSALISTA_FREE_LIMIT} mensalistas no plano Free. Faca upgrade para o Pro.`
      )}`
    );
  }

  const player = await prisma.player.create({ data: { ...parsed, peladaId: admin.peladaId!, ratingAssigned: true } });
  await logAudit(admin, "PLAYER_CREATED", { type: "Player", id: player.id }, { name: player.nickname });
  redirect("/players");
}

export async function updatePlayer(playerId: string, formData: FormData) {
  const admin = await requireAdmin();
  const parsed = playerSchema.parse({
    nickname: value(formData, "nickname"),
    photoUrl: value(formData, "photoUrl"),
    position: value(formData, "position"),
    membershipStatus: value(formData, "membershipStatus") || "MENSALISTA",
    rating: Number(value(formData, "rating"))
  });

  const existing = await prisma.player.findFirst({
    where: { id: playerId, peladaId: admin.peladaId! },
    select: { membershipStatus: true, userId: true }
  });
  if (!existing) redirect("/players");
  const becomingMensalista = parsed.membershipStatus === "MENSALISTA" && existing.membershipStatus !== "MENSALISTA";
  if (becomingMensalista && !(await canAddMensalista(admin.peladaId!))) {
    redirect(
      `/players/${playerId}/edit?error=${encodeURIComponent(
        `Limite de ${MENSALISTA_FREE_LIMIT} mensalistas no plano Free. Faca upgrade para o Pro.`
      )}`
    );
  }

  await prisma.player.update({ where: { id: playerId }, data: { ...parsed, ratingAssigned: true } });
  if (parsed.membershipStatus !== "MENSALISTA") {
    await demotePeladaAdminIfNotActiveMensalista(existing.userId, admin.peladaId!);
  }
  await logAudit(admin, "PLAYER_UPDATED", { type: "Player", id: playerId });
  redirect("/players");
}

export async function togglePlayer(playerId: string) {
  const admin = await requireAdmin();
  const player = await prisma.player.findFirst({ where: { id: playerId, peladaId: admin.peladaId! } });
  if (!player) return;
  const nextActive = !player.active;
  await prisma.player.update({ where: { id: playerId }, data: { active: nextActive } });
  if (!nextActive) {
    await demotePeladaAdminIfNotActiveMensalista(player.userId, admin.peladaId!);
  }
  await logAudit(admin, player.active ? "PLAYER_DEACTIVATED" : "PLAYER_ACTIVATED", { type: "Player", id: playerId });
  revalidatePath("/players");
}

export async function deletePlayer(playerId: string) {
  const admin = await requireAdmin();
  const player = await prisma.player.findFirst({ where: { id: playerId, peladaId: admin.peladaId! } });
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

  await prisma.$transaction(async (tx) => {
    if (player.userId) {
      await archiveUserPeladaStats(player.userId, admin.peladaId!, tx);
      await tx.peladaMembership.deleteMany({ where: { userId: player.userId, peladaId: admin.peladaId! } });
    }
    await tx.player.update({
      where: { id: playerId },
      data: { active: false, userId: null }
    });
  });
  await logAudit(admin, "PLAYER_REMOVED_FROM_PELADA", { type: "Player", id: playerId }, { name: player.nickname });
  revalidatePath("/players");
  revalidatePath("/admins");
  redirect("/players");
}

export async function leavePelada(peladaId: string) {
  const user = await requireUser();
  if (user.peladaId !== peladaId) {
    const membership = await prisma.peladaMembership.findUnique({
      where: { userId_peladaId: { userId: user.id, peladaId } }
    });
    if (!membership) redirect("/peladas");
  }

  const membership = await prisma.peladaMembership.findUnique({
    where: { userId_peladaId: { userId: user.id, peladaId } }
  });
  if (!membership) redirect("/peladas");
  if (membership.role === PeladaRole.PRESIDENTE || membership.role === PeladaRole.ADMIN) {
    const otherAdmins = await prisma.peladaMembership.count({
      where: { peladaId, userId: { not: user.id }, role: { in: [PeladaRole.PRESIDENTE, PeladaRole.ADMIN] } }
    });
    if (otherAdmins === 0) {
      redirect(`/peladas?error=${encodeURIComponent("Transfira ou adicione outro admin antes de sair desta pelada.")}`);
    }
  }

  await prisma.$transaction(async (tx) => {
    await archiveUserPeladaStats(user.id, peladaId, tx);
    await tx.player.updateMany({
      where: { userId: user.id, peladaId },
      data: { active: false, userId: null }
    });
    await tx.peladaMembership.delete({ where: { userId_peladaId: { userId: user.id, peladaId } } });
  });

  revalidatePath("/peladas");
  redirect("/peladas");
}

function combineDateAndTime(date: string, time: string) {
  return `${date}T${time || "19:00"}:00-03:00`;
}

function combineLocation(street: string, number: string) {
  const trimmedStreet = street.trim();
  const trimmedNumber = number.trim();
  if (!trimmedStreet) return trimmedNumber;

  const parts = trimmedStreet
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!trimmedNumber) return parts.join(", ");
  if (parts.length === 0) return trimmedNumber;
  if (parts.length === 1) return `${parts[0]}, ${trimmedNumber}`;

  const [streetPart, districtPart, ...rest] = parts;
  const cityPart = rest.at(-1);
  const remainingParts = rest.slice(0, -1);

  return [streetPart, districtPart, trimmedNumber, ...remainingParts, cityPart].filter(Boolean).join(", ");
}

function optionalInt(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 0) return null;
  return Math.floor(parsed);
}

async function getPeladaAdminUserIds(peladaId: string) {
  const [memberships, masters] = await Promise.all([
    prisma.peladaMembership.findMany({
      where: { peladaId, role: { in: ["PRESIDENTE", "ADMIN"] } },
      select: { userId: true }
    }),
    prisma.user.findMany({
      where: { role: "MASTER", active: true },
      select: { id: true }
    })
  ]);

  return [...new Set([...memberships.map((membership) => membership.userId), ...masters.map((master) => master.id)])];
}

async function getLatestClosedMatchId(peladaId: string) {
  const latest = await prisma.match.findFirst({
    where: { peladaId, status: MatchStatus.CLOSED },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    select: { id: true }
  });
  return latest?.id ?? null;
}

export async function createMatch(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = matchSchema.parse({
    title: value(formData, "title"),
    date: combineDateAndTime(value(formData, "date"), value(formData, "time")),
    kind: value(formData, "kind") || "PELADA",
    surface: value(formData, "surface") || "SOCIETY",
    location: combineLocation(value(formData, "locationStreet"), value(formData, "locationNumber")),
    opponentName: value(formData, "opponentName").trim()
  });

  if (parsed.kind === "AMISTOSO" && !(await isPeladaIdPro(admin.peladaId!))) {
    redirect("/matches?bloqueado=amistoso");
  }

  const match = await prisma.match.create({
    data: {
      peladaId: admin.peladaId!,
      title: parsed.title,
      date: parsed.date,
      kind: parsed.kind,
      surface: parsed.surface,
      location: parsed.location || null,
      opponentName: parsed.kind === "AMISTOSO" ? parsed.opponentName || null : null
    }
  });

  await sendPushToAll({
    title: parsed.kind === "AMISTOSO" ? "Novo amistoso criado" : "Nova pelada criada",
    body: `${match.title} ja esta aberta para confirmacao.`,
    url: `/matches/${match.id}/attendance`
  });

  redirect(`/matches/${match.id}/attendance`);
}

export async function updateMatch(matchId: string, formData: FormData) {
  const admin = await requireAdmin();
  const parsed = matchSchema.parse({
    title: value(formData, "title"),
    date: combineDateAndTime(value(formData, "date"), value(formData, "time")),
    kind: value(formData, "kind") || "PELADA",
    surface: value(formData, "surface") || "SOCIETY",
    location: combineLocation(value(formData, "locationStreet"), value(formData, "locationNumber")),
    opponentName: value(formData, "opponentName").trim()
  });

  await assertMatchInPelada(matchId, admin.peladaId!);
  if (parsed.kind === "AMISTOSO" && !(await isPeladaIdPro(admin.peladaId!))) {
    redirect(`/matches/${matchId}/edit?bloqueado=amistoso`);
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      title: parsed.title,
      date: parsed.date,
      kind: parsed.kind,
      surface: parsed.surface,
      location: parsed.location || null,
      opponentName: parsed.kind === "AMISTOSO" ? parsed.opponentName || null : null
    }
  });

  revalidatePath("/matches");
  revalidatePath(`/matches/${matchId}/attendance`);
  redirect("/matches");
}

export async function deleteMatch(matchId: string) {
  const admin = await requireAdmin();
  await assertMatchInPelada(matchId, admin.peladaId!);
  await prisma.match.delete({ where: { id: matchId } });
  await logAudit(admin, "MATCH_DELETED", { type: "Match", id: matchId });
  revalidatePath("/matches");
  revalidatePath("/dashboard");
  redirect("/matches");
}

export async function closeMatch(matchId: string) {
  const admin = await requireAdmin();
  await assertMatchInPelada(matchId, admin.peladaId!);
  const match = await prisma.match.update({
    where: { id: matchId },
    data: { status: MatchStatus.CLOSED },
    include: { polls: { where: { title: "Craque da pelada", status: PollStatus.OPEN } } }
  });

  if (!match.polls.length) {
    await prisma.poll.create({
      data: {
        matchId,
        title: "Craque da pelada"
      }
    });
  }

  await logAudit(admin, "MATCH_CLOSED", { type: "Match", id: matchId });

  await sendPushToUsers(await getEligibleMatchVoterUserIds(matchId), {
    title: "Pelada encerrada",
    body: `Informe seus gols, notas e vote no craque da ${match.title}. A janela fica aberta por 1 hora.`,
    url: `/matches/${matchId}/stats`
  });

  revalidatePath("/matches");
  revalidatePath(`/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}/stats`);
  redirect(`/matches/${matchId}/stats`);
}

export async function toggleAttendance(matchId: string, playerId: string, present: boolean) {
  const admin = await requireAdmin();
  const match = await prisma.match.findFirst({ where: { id: matchId, peladaId: admin.peladaId! } });
  const player = await prisma.player.findFirst({ where: { id: playerId, peladaId: admin.peladaId! } });
  if (!match || !player) return;

  if (!present) {
    await prisma.attendance.upsert({
      where: { matchId_playerId: { matchId, playerId } },
      update: { present: false, status: "OUT", confirmedAt: null },
      create: { matchId, playerId, present: false, status: "OUT" }
    });
    await promoteNextFromWaitlist(matchId);
    revalidatePath(`/matches/${matchId}/attendance`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    const status = await getAttendanceStatusForPlayer(matchId, player.position, match.date, tx);
    await tx.attendance.upsert({
      where: { matchId_playerId: { matchId, playerId } },
      update: { present: status === "CONFIRMED", status, confirmedAt: status === "CONFIRMED" ? new Date() : null },
      create: { matchId, playerId, present: status === "CONFIRMED", status, confirmedAt: status === "CONFIRMED" ? new Date() : null }
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  revalidatePath(`/matches/${matchId}/attendance`);
}

export async function toggleOwnAttendance(matchId: string, present: boolean) {
  const user = await requireUser();
  const match = await prisma.match.findFirst({ where: { id: matchId, peladaId: user.peladaId! } });
  const player = await prisma.player.findFirst({ where: { userId: user.id, peladaId: user.peladaId! } });
  if (!match || !player) return;
  if (match.status === MatchStatus.CLOSED) return;

  const isAdmin = isPeladaAdmin(user);
  if (!isAdmin && player.membershipStatus !== "MENSALISTA") return;

  if (!present) {
    await prisma.attendance.upsert({
      where: { matchId_playerId: { matchId, playerId: player.id } },
      update: { present: false, status: "OUT", confirmedAt: null },
      create: { matchId, playerId: player.id, present: false, status: "OUT" }
    });
    await promoteNextFromWaitlist(matchId);
    revalidatePath(`/matches/${matchId}/attendance`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    const status = await getAttendanceStatusForPlayer(matchId, player.position, match.date, tx);
    await tx.attendance.upsert({
      where: { matchId_playerId: { matchId, playerId: player.id } },
      update: { present: status === "CONFIRMED", status, confirmedAt: status === "CONFIRMED" ? new Date() : null },
      create: { matchId, playerId: player.id, present: status === "CONFIRMED", status, confirmedAt: status === "CONFIRMED" ? new Date() : null }
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  revalidatePath(`/matches/${matchId}/attendance`);
}

export async function createGuestForMatch(matchId: string, formData: FormData) {
  const user = await requireUser();
  const match = await prisma.match.findFirst({ where: { id: matchId, peladaId: user.peladaId! } });

  if (!match) {
    return { ok: false, error: "Pelada nao encontrada." };
  }

  const isAdmin = isPeladaAdmin(user);
  const linkedPlayer = await prisma.player.findFirst({ where: { userId: user.id, peladaId: user.peladaId! } });
  const isMonthlyPlayer = linkedPlayer?.membershipStatus === "MENSALISTA";
  const saoPauloNow = getSaoPauloParts();
  const canInviteByTime =
    isSameSaoPauloDate(new Date(), match.date) && saoPauloNow.hour >= 14;

  if (!isAdmin && (!isMonthlyPlayer || !canInviteByTime)) {
    return {
      ok: false,
      error: "Mensalistas so podem chamar convidados apos as 14h do dia da pelada."
    };
  }

  const parsed = playerSchema.parse({
    nickname: value(formData, "name"),
    photoUrl: "",
    position: value(formData, "position"),
    membershipStatus: "CONVIDADO",
    rating: Number(value(formData, "rating"))
  });

  const player = await prisma.player.create({
    data: { ...parsed, peladaId: user.peladaId!, ratingAssigned: true }
  });

  await prisma.$transaction(async (tx) => {
    const status = await getAttendanceStatusForPlayer(matchId, player.position, match.date, tx);
    await tx.attendance.create({
      data: {
        matchId,
        playerId: player.id,
        present: status === "CONFIRMED",
        status,
        confirmedAt: status === "CONFIRMED" ? new Date() : null,
        invitedByUserId: user.id
      }
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  revalidatePath(`/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}/draw`);
  return { ok: true };
}

export async function removeGuestFromMatch(matchId: string, attendanceId: string) {
  const user = await requireUser();
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: { player: true }
  });

  if (
    !attendance ||
    attendance.matchId !== matchId ||
    attendance.player.peladaId !== user.peladaId ||
    attendance.player.membershipStatus !== "CONVIDADO"
  ) {
    return { ok: false, error: "Convidado nao encontrado nesta pelada." };
  }

  const isAdmin = isPeladaAdmin(user);
  const isInviter = attendance.invitedByUserId === user.id;
  if (!isAdmin && !isInviter) {
    return { ok: false, error: "Voce nao pode remover este convidado." };
  }

  await prisma.attendance.delete({ where: { id: attendanceId } });
  await prisma.player.update({
    where: { id: attendance.playerId },
    data: { active: false }
  });

  await logAudit(user, "GUEST_REMOVED", { type: "Player", id: attendance.playerId }, { matchId });
  await promoteNextFromWaitlist(matchId);
  revalidatePath(`/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}/draw`);
  return { ok: true };
}

export async function drawTeams(matchId: string, formData: FormData) {
  const admin = await requireAdmin();
  await assertMatchInPelada(matchId, admin.peladaId!);
  const parsed = drawSchema.parse({
    numberOfTeams: value(formData, "numberOfTeams"),
    desiredPlayersPerTeam: value(formData, "desiredPlayersPerTeam")
  });

  const presentPlayers = await prisma.player.findMany({
    where: {
      peladaId: admin.peladaId!,
      active: true,
      attendances: { some: { matchId, status: "CONFIRMED" } }
    },
    select: {
      id: true,
      nickname: true,
      position: true,
      rating: true,
      membershipStatus: true,
      ratings: { include: { match: true } }
    }
  });

  if (presentPlayers.length < parsed.numberOfTeams) {
    redirect(
      `/matches/${matchId}/draw?error=${encodeURIComponent(
        `Marque pelo menos ${parsed.numberOfTeams} jogadores como presentes antes de sortear. Presentes agora: ${presentPlayers.length}.`
      )}`
    );
  }

  const totalCapacity = parsed.numberOfTeams * parsed.desiredPlayersPerTeam;
  const monthlyPlayers = presentPlayers.filter((player) => player.membershipStatus === "MENSALISTA");
  const guestPlayers = presentPlayers.filter((player) => player.membershipStatus === "CONVIDADO");
  const selectedPlayers = [...monthlyPlayers, ...guestPlayers]
    .slice(0, totalCapacity)
    .map(({ membershipStatus: _membershipStatus, ratings: _ratings, ...player }) => ({
      id: player.id,
      name: player.nickname,
      position: player.position,
      rating: playerBalanceRating({ rating: player.rating, ratings: _ratings })
    }));

  const teams = balanceTeams(selectedPlayers, parsed.numberOfTeams, parsed.desiredPlayersPerTeam);

  await prisma.team.deleteMany({ where: { matchId } });
  for (const team of teams) {
    await prisma.team.create({
      data: {
        matchId,
        name: team.name,
        totalRating: team.totalRating,
        players: {
          create: team.players.map((player) => ({
            playerId: player.id
          }))
        }
      }
    });
  }

  redirect(`/matches/${matchId}/teams`);
}

export async function drawTeamsForClient(matchId: string, formData: FormData) {
  try {
    const admin = await requireAdmin();
    await assertMatchInPelada(matchId, admin.peladaId!);
    const parsed = drawSchema.parse({
      numberOfTeams: value(formData, "numberOfTeams"),
      desiredPlayersPerTeam: value(formData, "desiredPlayersPerTeam")
    });

    const selectedPlayerIds = formData
      .getAll("playerId")
      .filter((id): id is string => typeof id === "string");

    if (selectedPlayerIds.length) {
      const presentPlayerIds = new Set(
        formData
          .getAll("presentPlayerId")
          .filter((id): id is string => typeof id === "string")
      );

      for (const playerId of selectedPlayerIds) {
        await assertPlayerInPelada(playerId, admin.peladaId!);
        const membershipStatus = value(formData, `membershipStatus-${playerId}`) || "MENSALISTA";
        await prisma.player.update({
          where: { id: playerId },
          data: { membershipStatus: membershipStatus === "CONVIDADO" ? "CONVIDADO" : "MENSALISTA" }
        });
        await prisma.attendance.upsert({
          where: { matchId_playerId: { matchId, playerId } },
          update: { present: false, status: "OUT", confirmedAt: null },
          create: { matchId, playerId, present: false, status: "OUT" }
        });
      }

      const match = await prisma.match.findFirst({ where: { id: matchId, peladaId: admin.peladaId! } });
      if (match) {
        for (const playerId of selectedPlayerIds.filter((id) => presentPlayerIds.has(id))) {
          const player = await prisma.player.findFirst({ where: { id: playerId, peladaId: admin.peladaId! } });
          if (!player) continue;
          const status = await getAttendanceStatusForPlayer(matchId, player.position, match.date);
          await prisma.attendance.update({
            where: { matchId_playerId: { matchId, playerId } },
            data: {
              present: status === "CONFIRMED",
              status,
              confirmedAt: status === "CONFIRMED" ? new Date() : null
            }
          });
        }
      }
    }

    const presentPlayers = await prisma.player.findMany({
      where: {
        peladaId: admin.peladaId!,
        active: true,
        attendances: { some: { matchId, status: "CONFIRMED" } }
      },
      select: {
        id: true,
        nickname: true,
        position: true,
        rating: true,
        membershipStatus: true,
        ratings: { include: { match: true } }
      }
    });

    if (presentPlayers.length < parsed.numberOfTeams) {
      return {
        ok: false,
        error: `Marque pelo menos ${parsed.numberOfTeams} jogadores como presentes antes de sortear. Presentes agora: ${presentPlayers.length}.`
      };
    }

    const totalCapacity = parsed.numberOfTeams * parsed.desiredPlayersPerTeam;
    const monthlyPlayers = presentPlayers.filter((player) => player.membershipStatus === "MENSALISTA");
    const guestPlayers = presentPlayers.filter((player) => player.membershipStatus === "CONVIDADO");
    const selectedPlayers = [...monthlyPlayers, ...guestPlayers]
      .slice(0, totalCapacity)
      .map(({ membershipStatus: _membershipStatus, ratings: _ratings, ...player }) => ({
        id: player.id,
        name: player.nickname,
        position: player.position,
        rating: playerBalanceRating({ rating: player.rating, ratings: _ratings })
      }));

    const teams = balanceTeams(selectedPlayers, parsed.numberOfTeams, parsed.desiredPlayersPerTeam);

    await prisma.team.deleteMany({ where: { matchId } });
    for (const team of teams) {
      await prisma.team.create({
        data: {
          matchId,
          name: team.name,
          totalRating: team.totalRating,
          players: {
            create: team.players.map((player) => ({
              playerId: player.id
            }))
          }
        }
      });
    }

    revalidatePath(`/matches/${matchId}/teams`);
    return { ok: true, url: `/matches/${matchId}/teams` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel sortear os times.";
    return { ok: false, error: message };
  }
}

export async function updateStats(matchId: string, formData: FormData) {
  const admin = await requireAdmin();
  await assertMatchInPelada(matchId, admin.peladaId!);
  if ((await getLatestClosedMatchId(admin.peladaId!)) !== matchId) return;
  const playerIds = formData.getAll("playerId").filter((id): id is string => typeof id === "string");

  for (const playerId of playerIds) {
    const goals = Number(value(formData, `goals-${playerId}`) || 0);
    const defenses = Number(value(formData, `defenses-${playerId}`) || 0);
    if (!Number.isFinite(goals) || goals < 0 || !Number.isFinite(defenses) || defenses < 0) continue;

    await prisma.goal.upsert({
      where: { matchId_playerId: { matchId, playerId } },
      update: { quantity: goals },
      create: { matchId, playerId, quantity: goals }
    });
    await prisma.difficultSave.upsert({
      where: { matchId_playerId: { matchId, playerId } },
      update: { quantity: defenses },
      create: { matchId, playerId, quantity: defenses }
    });
  }

  revalidatePath(`/matches/${matchId}/stats`);
  revalidatePath("/rankings");
  revalidatePath("/dashboard");
}

export async function updateMatchScore(matchId: string, formData: FormData) {
  const admin = await requireAdmin();
  await assertMatchInPelada(matchId, admin.peladaId!);
  if ((await getLatestClosedMatchId(admin.peladaId!)) !== matchId) return;
  const match = await prisma.match.findUnique({ where: { id: matchId }, select: { kind: true } });
  if (!match || match.kind !== "AMISTOSO") return;

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore: optionalInt(value(formData, "homeScore")),
      awayScore: optionalInt(value(formData, "awayScore"))
    }
  });

  revalidatePath(`/matches/${matchId}/stats`);
  revalidatePath("/rankings");
}

export async function submitOwnMatchStats(matchId: string, formData: FormData) {
  const user = await requireUser();
  await assertMatchInPelada(matchId, user.peladaId!);
  const poll = await prisma.poll.findFirst({
    where: { matchId, title: "Craque da pelada", status: PollStatus.OPEN },
    orderBy: { createdAt: "desc" }
  });

  if (!poll || !isWithinVotingWindow(poll.createdAt)) return;

  const linkedPlayer = await prisma.player.findFirst({
    where: { userId: user.id, peladaId: user.peladaId!, active: true, membershipStatus: "MENSALISTA" }
  });
  if (!linkedPlayer) return;

  const attendance = await prisma.attendance.findUnique({
    where: { matchId_playerId: { matchId, playerId: linkedPlayer.id } }
  });
  if (attendance?.status !== "CONFIRMED") return;

  const existingSubmission = await prisma.playerMatchSubmission.findUnique({
    where: { matchId_playerId_userId: { matchId, playerId: linkedPlayer.id, userId: user.id } }
  });
  if (existingSubmission) return;

  const goals = Number(value(formData, "goals") || 0);
  const defenses = Number(value(formData, "defenses") || 0);
  if (!Number.isFinite(goals) || goals < 0 || !Number.isFinite(defenses) || defenses < 0) return;

  await prisma.$transaction([
    prisma.goal.upsert({
      where: { matchId_playerId: { matchId, playerId: linkedPlayer.id } },
      update: { quantity: goals },
      create: { matchId, playerId: linkedPlayer.id, quantity: goals }
    }),
    prisma.difficultSave.upsert({
      where: { matchId_playerId: { matchId, playerId: linkedPlayer.id } },
      update: { quantity: defenses },
      create: { matchId, playerId: linkedPlayer.id, quantity: defenses }
    }),
    prisma.playerMatchSubmission.create({
      data: { matchId, playerId: linkedPlayer.id, userId: user.id }
    })
  ]);

  revalidatePath(`/matches/${matchId}/stats`);
  revalidatePath("/rankings");
  revalidatePath(`/players/${linkedPlayer.id}`);
  await closeCraquePollIfComplete(poll.id);
}

export async function createCraquePoll(matchId: string) {
  const admin = await requireAdmin();
  await assertMatchInPelada(matchId, admin.peladaId!);
  const existing = await prisma.poll.findFirst({
    where: { matchId, title: "Craque da pelada", status: PollStatus.OPEN }
  });

  if (existing) {
    revalidatePath(`/matches/${matchId}/stats`);
    return;
  }

  const poll = await prisma.poll.create({
    data: {
      matchId,
      title: "Craque da pelada"
    },
    include: { match: true }
  });

  await sendPushToUsers(await getEligibleMatchVoterUserIds(matchId), {
    title: "Votacao aberta",
    body: `Vote no craque da ${poll.match.title}.`,
    url: `/matches/${matchId}/stats`
  });

  revalidatePath(`/matches/${matchId}/stats`);
}

export async function notifyStatsEntryOpen(matchId: string) {
  const admin = await requireAdmin();
  const match = await prisma.match.findFirst({ where: { id: matchId, peladaId: admin.peladaId! } });
  if (!match) return;

  await sendPushToUsers(await getEligibleMatchVoterUserIds(matchId), {
    title: "Lancamento de stats aberto",
    body: `Hora de conferir gols, participacoes e defesas da ${match.title}.`,
    url: `/matches/${matchId}/stats`
  });

  revalidatePath(`/matches/${matchId}/stats`);
}

export async function voteCraque(pollId: string, playerId: string) {
  const user = await requireUser();
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { match: true }
  });

  if (!poll || poll.status !== PollStatus.OPEN || !isWithinVotingWindow(poll.createdAt)) {
    return { ok: false, error: "A votacao para craque nao esta mais aberta." };
  }

  const canVote = await canUserVoteInMatch(user.id, poll.matchId);
  if (!canVote) {
    return { ok: false, error: "Voce nao pode votar nesta pelada." };
  }
  const linkedPlayer = await prisma.player.findFirst({ where: { userId: user.id, peladaId: user.peladaId! } });
  if (linkedPlayer?.id === playerId) {
    return { ok: false, error: "Voce nao pode votar em si mesmo." };
  }
  const existingVote = await prisma.pollVote.findUnique({
    where: { pollId_userId: { pollId, userId: user.id } }
  });
  if (existingVote) {
    return { ok: false, error: "Voce ja votou no craque desta pelada." };
  }
  const candidate = await prisma.player.findFirst({
    where: {
      id: playerId,
      peladaId: poll.match.peladaId,
      active: true,
      membershipStatus: "MENSALISTA",
      attendances: { some: { matchId: poll.matchId, status: "CONFIRMED" } }
    }
  });
  if (!candidate) {
    return { ok: false, error: "Jogador nao encontrado nesta pelada." };
  }

  await prisma.pollVote.create({
    data: { pollId, userId: user.id, playerId }
  });
  await closeCraquePollIfComplete(pollId);
  revalidatePath(`/matches/${poll.matchId}/stats`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function ratePlayerPerformance(matchId: string, playerId: string, formData: FormData) {
  const user = await requireUser();
  const poll = await prisma.poll.findFirst({
    where: { matchId, title: "Craque da pelada", status: PollStatus.OPEN }
  });

  if (!poll || !isWithinVotingWindow(poll.createdAt)) {
    return { ok: false, error: "A janela para dar notas ja foi encerrada." };
  }

  const canVote = await canUserVoteInMatch(user.id, matchId);
  if (!canVote) {
    return { ok: false, error: "Voce nao pode dar nota nesta pelada." };
  }

  const linkedPlayer = await prisma.player.findFirst({ where: { userId: user.id, peladaId: user.peladaId! } });
  if (linkedPlayer?.id === playerId) {
    return { ok: false, error: "Voce nao pode dar nota para si mesmo." };
  }
  const candidate = await prisma.player.findFirst({
    where: {
      id: playerId,
      peladaId: user.peladaId!,
      active: true,
      membershipStatus: "MENSALISTA",
      attendances: { some: { matchId, status: "CONFIRMED" } }
    }
  });
  if (!candidate) {
    return { ok: false, error: "Jogador nao encontrado nesta pelada." };
  }

  const raw = Number(value(formData, "rating"));
  if (!Number.isFinite(raw) || raw < 0) {
    return { ok: false, error: "Escolha uma nota valida." };
  }

  const rating = Math.max(0, Math.min(10, raw));
  await prisma.playerRating.upsert({
    where: { matchId_playerId_userId: { matchId, playerId, userId: user.id } },
    update: { value: rating },
    create: { matchId, playerId, userId: user.id, value: rating }
  });

  await closeCraquePollIfComplete(poll.id);
  revalidatePath(`/matches/${matchId}/stats`);
  revalidatePath(`/players/${playerId}`);
  return { ok: true };
}

async function getCraquePollProgress(pollId: string) {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      match: {
        include: {
          attendances: {
            where: { status: "CONFIRMED" },
            include: { player: true }
          }
        }
      },
      votes: true
    }
  });
  if (!poll) return null;

  const eligiblePlayers = poll.match.attendances
    .map((attendance) => attendance.player)
    .filter((player) => player.userId && player.active && player.membershipStatus === "MENSALISTA");
  const eligibleUserIds = [...new Set(eligiblePlayers.map((player) => player.userId!).filter(Boolean))];
  const eligiblePlayerIds = eligiblePlayers.map((player) => player.id);

  const [submissions, ratings] = await Promise.all([
    prisma.playerMatchSubmission.findMany({
      where: { matchId: poll.matchId, userId: { in: eligibleUserIds } },
      select: { userId: true }
    }),
    prisma.playerRating.findMany({
      where: { matchId: poll.matchId, userId: { in: eligibleUserIds }, playerId: { in: eligiblePlayerIds } },
      select: { userId: true, playerId: true }
    })
  ]);

  const submittedUsers = new Set(submissions.map((submission) => submission.userId));
  const votedUsers = new Set(poll.votes.map((vote) => vote.userId));
  const ratingsByUser = new Map<string, Set<string>>();
  for (const rating of ratings) {
    ratingsByUser.set(rating.userId, new Set([...(ratingsByUser.get(rating.userId) ?? []), rating.playerId]));
  }

  const completedUsers = eligiblePlayers
    .filter((player) => {
      const userId = player.userId!;
      const expectedRatings = eligiblePlayerIds.filter((playerId) => playerId !== player.id);
      const userRatings = ratingsByUser.get(userId) ?? new Set<string>();
      return (
        submittedUsers.has(userId) &&
        votedUsers.has(userId) &&
        expectedRatings.every((playerId) => userRatings.has(playerId))
      );
    })
    .map((player) => player.userId!);

  return {
    poll,
    total: eligibleUserIds.length,
    completed: new Set(completedUsers).size
  };
}

async function closeCraquePollIfComplete(pollId: string) {
  const progress = await getCraquePollProgress(pollId);
  if (!progress || progress.poll.status !== PollStatus.OPEN) return;
  if (progress.total === 0 || progress.completed < progress.total) return;
  await publishCraquePoll(progress.poll.id);
}

async function publishCraquePoll(pollId: string) {
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll || poll.status === PollStatus.CLOSED) return;
  const votes = await prisma.pollVote.groupBy({
    by: ["playerId"],
    where: { pollId },
    _count: { playerId: true },
    orderBy: { _count: { playerId: "desc" } },
    take: 1
  });

  await prisma.poll.update({
    where: { id: pollId },
    data: {
      status: PollStatus.CLOSED,
      winnerId: votes[0]?.playerId
    }
  });

  revalidatePath(`/matches/${poll.matchId}/stats`);
  revalidatePath("/rankings");
  revalidatePath("/dashboard");
}

export async function closeCraquePoll(pollId: string) {
  const admin = await requireAdmin();
  await assertPollInPelada(pollId, admin.peladaId!);
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  await publishCraquePoll(pollId);

  await logAudit(admin, "POLL_CLOSED", { type: "Poll", id: pollId });

  if (poll) {
    revalidatePath(`/matches/${poll.matchId}/stats`);
  }
  revalidatePath("/rankings");
  revalidatePath("/dashboard");
}

export async function closeExpiredCraquePolls(peladaId: string) {
  const polls = await prisma.poll.findMany({
    where: {
      title: "Craque da pelada",
      status: PollStatus.OPEN,
      match: { peladaId }
    },
    select: { id: true, createdAt: true }
  });

  for (const poll of polls) {
    if (isWithinVotingWindow(poll.createdAt)) continue;

    await publishCraquePoll(poll.id);
  }
}

export async function sendCloseMatchReminders(now = new Date()) {
  const reminderDate = new Date(now.getTime() - 90 * 60 * 1000);
  const matches = await prisma.match.findMany({
    where: {
      status: MatchStatus.OPEN,
      date: { lte: reminderDate },
      closeReminderSentAt: null
    },
    select: {
      id: true,
      title: true,
      kind: true,
      peladaId: true
    }
  });

  for (const match of matches) {
    const adminUserIds = await getPeladaAdminUserIds(match.peladaId);
    await sendPushToUsers(adminUserIds, {
      title: match.kind === "AMISTOSO" ? "Fechar amistoso" : "Fechar pelada",
      body: `${match.title} comecou ha 1h30. Feche a partida para liberar gols, notas e craque.`,
      url: `/matches/${match.id}/attendance`
    });
    await prisma.match.update({
      where: { id: match.id },
      data: { closeReminderSentAt: now }
    });
  }

  return { processed: matches.length };
}
