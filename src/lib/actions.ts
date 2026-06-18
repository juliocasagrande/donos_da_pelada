"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MatchStatus, PollStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdmin, requireMaster, requireUser } from "@/lib/session";
import { drawSchema, matchSchema, playerSchema, signupSchema } from "@/lib/validations";
import { balanceTeams } from "@/lib/balanceTeams";
import { sendPushToAll, sendPushToUsers } from "@/lib/push";
import { canConfirmPlayer, isWithinVotingWindow } from "@/lib/attendance";
import { logAudit } from "@/lib/audit";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw : "";
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { player: true }
  });
  if (!user?.player) return false;
  const isAdmin = user.role === "MASTER" || user.role === "ADMIN";
  if (!isAdmin && user.player.membershipStatus !== "MENSALISTA") return false;

  const attendance = await prisma.attendance.findUnique({
    where: { matchId_playerId: { matchId, playerId: user.player.id } }
  });

  return attendance?.status === "CONFIRMED";
}

async function getAttendanceStatusForPlayer(matchId: string, position: string, matchDate: Date, db: DbClient = prisma) {
  const counts = await getConfirmedCounts(matchId, db);
  return canConfirmPlayer(position, counts, areGoalkeeperSlotsReleased(matchDate)) ? "CONFIRMED" : "WAITLIST";
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
  const currentPlayer = await prisma.player.findUnique({ where: { userId: user.id } });
  const parsed = playerSchema.parse({
    name: value(formData, "name"),
    nickname: value(formData, "nickname"),
    photoUrl: value(formData, "photoUrl"),
    position: value(formData, "position"),
    membershipStatus: currentPlayer?.membershipStatus || "CONVIDADO",
    rating: currentPlayer?.rating ?? 0
  });

  await prisma.player.upsert({
    where: { userId: user.id },
    update: parsed,
    create: { ...parsed, userId: user.id, ratingAssigned: false }
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.nickname || parsed.name,
      image: parsed.photoUrl || undefined,
      onboarded: true
    }
  });

  redirect("/dashboard");
}

export async function updateOwnProfile(formData: FormData) {
  const user = await requireUser();
  const currentPlayer = await prisma.player.findUnique({ where: { userId: user.id } });
  const parsed = playerSchema.parse({
    name: value(formData, "name"),
    nickname: value(formData, "nickname"),
    photoUrl: value(formData, "photoUrl"),
    position: value(formData, "position"),
    membershipStatus: currentPlayer?.membershipStatus || "CONVIDADO",
    rating: currentPlayer?.rating ?? 0
  });

  await prisma.player.upsert({
    where: { userId: user.id },
    update: parsed,
    create: { ...parsed, userId: user.id }
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.nickname || parsed.name,
      image: parsed.photoUrl || undefined
    }
  });

  revalidatePath("/perfil");
  redirect("/perfil?salvo=1");
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
  const current = await requireMaster();
  if (current.id === userId) return;
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser || targetUser.role === "MASTER") return;

  const newRole = targetUser.role === "ADMIN" ? UserRole.PLAYER : UserRole.ADMIN;
  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole }
  });

  await logAudit(current, newRole === "ADMIN" ? "ADMIN_PROMOTED" : "ADMIN_DEMOTED", { type: "User", id: userId });
  revalidatePath("/admins");
}

export async function createPlayer(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = playerSchema.parse({
    name: value(formData, "name"),
    nickname: value(formData, "nickname"),
    photoUrl: value(formData, "photoUrl"),
    position: value(formData, "position"),
    membershipStatus: value(formData, "membershipStatus") || "MENSALISTA",
    rating: Number(value(formData, "rating"))
  });

  const player = await prisma.player.create({ data: { ...parsed, ratingAssigned: true } });
  await logAudit(admin, "PLAYER_CREATED", { type: "Player", id: player.id }, { name: player.name });
  redirect("/players");
}

export async function updatePlayer(playerId: string, formData: FormData) {
  const admin = await requireAdmin();
  const parsed = playerSchema.parse({
    name: value(formData, "name"),
    nickname: value(formData, "nickname"),
    photoUrl: value(formData, "photoUrl"),
    position: value(formData, "position"),
    membershipStatus: value(formData, "membershipStatus") || "MENSALISTA",
    rating: Number(value(formData, "rating"))
  });

  await prisma.player.update({ where: { id: playerId }, data: { ...parsed, ratingAssigned: true } });
  await logAudit(admin, "PLAYER_UPDATED", { type: "Player", id: playerId });
  redirect("/players");
}

export async function togglePlayer(playerId: string) {
  const admin = await requireAdmin();
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return;
  await prisma.player.update({ where: { id: playerId }, data: { active: !player.active } });
  await logAudit(admin, player.active ? "PLAYER_DEACTIVATED" : "PLAYER_ACTIVATED", { type: "Player", id: playerId });
  revalidatePath("/players");
}

function combineDateAndTime(date: string, time: string) {
  return `${date}T${time || "19:00"}:00-03:00`;
}

function combineLocation(street: string, number: string) {
  const trimmedStreet = street.trim();
  const trimmedNumber = number.trim();
  if (!trimmedNumber) return trimmedStreet;
  if (!trimmedStreet) return trimmedNumber;

  const commaIndex = trimmedStreet.indexOf(",");
  if (commaIndex === -1) return `${trimmedStreet}, ${trimmedNumber}`;
  return `${trimmedStreet.slice(0, commaIndex)}, ${trimmedNumber}${trimmedStreet.slice(commaIndex)}`;
}

export async function createMatch(formData: FormData) {
  await requireAdmin();
  const parsed = matchSchema.parse({
    title: value(formData, "title"),
    date: combineDateAndTime(value(formData, "date"), value(formData, "time")),
    surface: value(formData, "surface") || "SOCIETY",
    location: combineLocation(value(formData, "locationStreet"), value(formData, "locationNumber"))
  });

  const match = await prisma.match.create({
    data: {
      title: parsed.title,
      date: parsed.date,
      surface: parsed.surface,
      location: parsed.location || null
    }
  });

  await sendPushToAll({
    title: "Nova pelada criada",
    body: `${match.title} ja esta aberta para confirmacao.`,
    url: `/matches/${match.id}/attendance`
  });

  redirect(`/matches/${match.id}/attendance`);
}

export async function updateMatch(matchId: string, formData: FormData) {
  await requireAdmin();
  const parsed = matchSchema.parse({
    title: value(formData, "title"),
    date: combineDateAndTime(value(formData, "date"), value(formData, "time")),
    surface: value(formData, "surface") || "SOCIETY",
    location: combineLocation(value(formData, "locationStreet"), value(formData, "locationNumber"))
  });

  await prisma.match.update({
    where: { id: matchId },
    data: {
      title: parsed.title,
      date: parsed.date,
      surface: parsed.surface,
      location: parsed.location || null
    }
  });

  revalidatePath("/matches");
  revalidatePath(`/matches/${matchId}/attendance`);
  redirect("/matches");
}

export async function deleteMatch(matchId: string) {
  const admin = await requireAdmin();
  await prisma.match.delete({ where: { id: matchId } });
  await logAudit(admin, "MATCH_DELETED", { type: "Match", id: matchId });
  revalidatePath("/matches");
  revalidatePath("/dashboard");
  redirect("/matches");
}

export async function closeMatch(matchId: string) {
  const admin = await requireAdmin();
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

  await sendPushToAll({
    title: "Pelada encerrada",
    body: `Informe seus gols, notas e vote no craque da ${match.title}. A janela fica aberta por 6 horas.`,
    url: `/matches/${matchId}/stats`
  });

  revalidatePath("/matches");
  revalidatePath(`/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}/stats`);
  redirect(`/matches/${matchId}/stats`);
}

export async function toggleAttendance(matchId: string, playerId: string, present: boolean) {
  await requireAdmin();
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  const player = await prisma.player.findUnique({ where: { id: playerId } });
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
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  const player = await prisma.player.findUnique({ where: { userId: user.id } });
  if (!match || !player) return;
  if (match.status === MatchStatus.CLOSED) return;

  const isAdmin = user.role === "MASTER" || user.role === "ADMIN";
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
  const match = await prisma.match.findUnique({ where: { id: matchId } });

  if (!match) {
    return { ok: false, error: "Pelada nao encontrada." };
  }

  const isAdmin = user.role === "MASTER" || user.role === "ADMIN";
  const linkedPlayer = await prisma.player.findUnique({ where: { userId: user.id } });
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
    name: value(formData, "name"),
    nickname: "",
    photoUrl: "",
    position: value(formData, "position"),
    membershipStatus: "CONVIDADO",
    rating: Number(value(formData, "rating"))
  });

  const player = await prisma.player.create({
    data: { ...parsed, ratingAssigned: true }
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

  if (!attendance || attendance.matchId !== matchId || attendance.player.membershipStatus !== "CONVIDADO") {
    return { ok: false, error: "Convidado nao encontrado nesta pelada." };
  }

  const isAdmin = user.role === "MASTER" || user.role === "ADMIN";
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
  await requireAdmin();
  const parsed = drawSchema.parse({
    numberOfTeams: value(formData, "numberOfTeams"),
    desiredPlayersPerTeam: value(formData, "desiredPlayersPerTeam")
  });

  const presentPlayers = await prisma.player.findMany({
    where: {
      active: true,
      attendances: { some: { matchId, status: "CONFIRMED" } }
    },
    select: {
      id: true,
      name: true,
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
      ...player,
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
    await requireAdmin();
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

      const match = await prisma.match.findUnique({ where: { id: matchId } });
      if (match) {
        for (const playerId of selectedPlayerIds.filter((id) => presentPlayerIds.has(id))) {
          const player = await prisma.player.findUnique({ where: { id: playerId } });
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
        active: true,
        attendances: { some: { matchId, status: "CONFIRMED" } }
      },
      select: {
        id: true,
        name: true,
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
        ...player,
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
  await requireAdmin();
  const playerIds = formData.getAll("playerId").filter((id): id is string => typeof id === "string");

  for (const playerId of playerIds) {
    const goals = Number(value(formData, `goals-${playerId}`) || 0);
    const defenses = Number(value(formData, `defenses-${playerId}`) || 0);

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

export async function submitOwnMatchStats(matchId: string, formData: FormData) {
  const user = await requireUser();
  const poll = await prisma.poll.findFirst({
    where: { matchId, title: "Craque da pelada", status: PollStatus.OPEN },
    orderBy: { createdAt: "desc" }
  });

  if (!poll || !isWithinVotingWindow(poll.createdAt)) return;

  const linkedPlayer = await prisma.player.findUnique({ where: { userId: user.id } });
  if (!linkedPlayer) return;
  const isAdmin = user.role === "MASTER" || user.role === "ADMIN";
  if (!isAdmin && linkedPlayer.membershipStatus !== "MENSALISTA") return;

  const attendance = await prisma.attendance.findUnique({
    where: { matchId_playerId: { matchId, playerId: linkedPlayer.id } }
  });
  if (attendance?.status !== "CONFIRMED") return;

  const existingSubmission = await prisma.playerMatchSubmission.findUnique({
    where: { matchId_playerId_userId: { matchId, playerId: linkedPlayer.id, userId: user.id } }
  });
  if (existingSubmission) return;

  const goals = Math.max(0, Number(value(formData, "goals") || 0));
  const defenses = Math.max(0, Number(value(formData, "defenses") || 0));

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
}

export async function createCraquePoll(matchId: string) {
  await requireAdmin();
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

  await sendPushToAll({
    title: "Votacao aberta",
    body: `Vote no craque da ${poll.match.title}.`,
    url: `/matches/${matchId}/stats`
  });

  revalidatePath(`/matches/${matchId}/stats`);
}

export async function notifyStatsEntryOpen(matchId: string) {
  await requireAdmin();
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return;

  await sendPushToAll({
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
  const linkedPlayer = await prisma.player.findUnique({ where: { userId: user.id } });
  if (linkedPlayer?.id === playerId) {
    return { ok: false, error: "Voce nao pode votar em si mesmo." };
  }
  const existingVote = await prisma.pollVote.findUnique({
    where: { pollId_userId: { pollId, userId: user.id } }
  });
  if (existingVote) {
    return { ok: false, error: "Voce ja votou no craque desta pelada." };
  }

  await prisma.pollVote.create({
    data: { pollId, userId: user.id, playerId }
  });
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

  const linkedPlayer = await prisma.player.findUnique({ where: { userId: user.id } });
  if (linkedPlayer?.id === playerId) {
    return { ok: false, error: "Voce nao pode dar nota para si mesmo." };
  }

  const raw = Number(value(formData, "rating"));
  if (!Number.isFinite(raw)) {
    return { ok: false, error: "Escolha uma nota valida." };
  }

  const rating = Math.max(1, Math.min(10, raw));
  await prisma.playerRating.upsert({
    where: { matchId_playerId_userId: { matchId, playerId, userId: user.id } },
    update: { value: rating },
    create: { matchId, playerId, userId: user.id, value: rating }
  });

  revalidatePath(`/matches/${matchId}/stats`);
  revalidatePath(`/players/${playerId}`);
  return { ok: true };
}

export async function closeCraquePoll(pollId: string) {
  const admin = await requireAdmin();
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
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

  await logAudit(admin, "POLL_CLOSED", { type: "Poll", id: pollId }, { winnerId: votes[0]?.playerId });

  if (poll) {
    revalidatePath(`/matches/${poll.matchId}/stats`);
  }
  revalidatePath("/rankings");
  revalidatePath("/dashboard");
}
