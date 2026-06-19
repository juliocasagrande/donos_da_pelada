import Link from "next/link";
import { Check, Clock, Radar as RadarIcon, UserCheck, UserMinus, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { GuestForm } from "@/components/forms/GuestForm";
import { GuestRemoveForm } from "@/components/matches/GuestRemoveForm";
import { LocationLinks } from "@/components/matches/LocationLinks";
import { OpenToGuestsForm } from "@/components/forms/OpenToGuestsForm";
import { toggleAttendance, toggleOwnAttendance } from "@/lib/actions";
import { TOTAL_CAPACITY } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";
import { isPeladaAdmin, requireUser } from "@/lib/session";
import { cn, formatDate, formatTime, surfaceLabel } from "@/lib/utils";

function getSaoPauloDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
}

function getSaoPauloHour(date: Date) {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false
    })
      .formatToParts(date)
      .find((part) => part.type === "hour")?.value || 0
  );
}

export default async function AttendancePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ radarErro?: string; radarAberto?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { radarErro, radarAberto } = await searchParams;
  const [match, players] = await Promise.all([
    prisma.match.findFirst({ where: { id, peladaId: user.peladaId!, deletedAt: null } }),
    prisma.player.findMany({
      where: { peladaId: user.peladaId!, active: true },
      include: { attendances: { where: { matchId: id }, include: { invitedByUser: true } } },
      orderBy: { nickname: "asc" }
    })
  ]);

  const isAdmin = isPeladaAdmin(user);
  const linkedPlayer = await prisma.player.findFirst({
    where: { userId: user.id, peladaId: user.peladaId! },
    include: { attendances: { where: { matchId: id } } }
  });
  const canInviteGuest =
    isAdmin ||
    Boolean(
      linkedPlayer?.membershipStatus === "MENSALISTA" &&
        match &&
        getSaoPauloDate(new Date()) === getSaoPauloDate(match.date) &&
        getSaoPauloHour(new Date()) >= 14
    );

  const approvedCounts =
    isAdmin && match?.openToGuests
      ? await prisma.matchGuestRequest.groupBy({
          by: ["position"],
          where: { matchId: id, status: "APPROVED" },
          _count: true
        })
      : [];
  const approvedLineCount = approvedCounts.find((row) => row.position === "LINHA")?._count ?? 0;
  const approvedGoalkeeperCount = approvedCounts.find((row) => row.position === "GOLEIRO")?._count ?? 0;

  const groupedPlayers = {
    CONFIRMED: players.filter((player) => player.attendances[0]?.status === "CONFIRMED"),
    WAITLIST: players.filter((player) => player.attendances[0]?.status === "WAITLIST"),
    OUT: players.filter((player) => (player.attendances[0]?.status || "OUT") === "OUT")
  };
  const presentCount = groupedPlayers.CONFIRMED.length;
  const waitlistCount = groupedPlayers.WAITLIST.length;
  const ownAttendanceStatus = linkedPlayer?.attendances[0]?.status || "OUT";
  const ownAttendanceAction = linkedPlayer
    ? toggleOwnAttendance.bind(null, id, ownAttendanceStatus === "OUT")
    : null;
  const sections = [
    {
      key: "CONFIRMED",
      title: "Presentes",
      description: "Jogadores confirmados para esta partida.",
      icon: UserCheck,
      players: groupedPlayers.CONFIRMED
    },
    {
      key: "WAITLIST",
      title: "Na espera",
      description: "Entram se abrir vaga.",
      icon: Clock,
      players: groupedPlayers.WAITLIST
    },
    {
      key: "OUT",
      title: "Fora",
      description: "Ainda nao confirmaram presenca.",
      icon: UserMinus,
      players: groupedPlayers.OUT
    }
  ] as const;

  return (
    <AppShell>
      <div className="field-hero -mx-1 mb-4 rounded-card px-5 py-6 text-white">
        <div className="relative">
          <h1 className="font-display text-2xl font-extrabold">{match?.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-green-100">
            <span className="flex items-center gap-1">
              <Clock size={14} /> {match ? `${formatDate(match.date)} as ${formatTime(match.date)}` : ""}
            </span>
            {match ? <LocationLinks location={match.location} /> : null}
            {match ? (
              <span className="rounded-[7px] bg-white/15 px-2 py-0.5 text-xs font-bold">{surfaceLabel(match.surface)}</span>
            ) : null}
          </div>
        </div>
      </div>

      <Card className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-jersey text-xs font-semibold uppercase tracking-[.14em] text-musgo">Lista de presenca</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">{presentCount}/{TOTAL_CAPACITY}</h2>
            <p className="mt-1 text-sm text-musgo">{waitlistCount ? `${waitlistCount} na espera` : "Sem jogadores na espera"}</p>
          </div>
          <div key={presentCount} className="pop-scale rounded-[13px] bg-[#EAF5EC] px-4 py-3 text-center text-campo">
            <Users size={18} className="mx-auto" />
            <p className="font-jersey text-2xl font-bold leading-none">{presentCount}</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-areia">
          <div className="grow-bar h-full rounded-full bg-campo" style={{ width: `${Math.min(100, (presentCount / TOTAL_CAPACITY) * 100)}%` }} />
        </div>
      </Card>

      {linkedPlayer && linkedPlayer.membershipStatus === "MENSALISTA" && ownAttendanceAction ? (
        <Card className="mb-4">
          <div className="flex items-center gap-3">
            <PlayerAvatar src={linkedPlayer.photoUrl} name={linkedPlayer.nickname} position={linkedPlayer.position} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold">Voce vai jogar?</p>
              <p className="text-sm text-musgo">
                {ownAttendanceStatus === "CONFIRMED"
                  ? "Sua presenca esta confirmada."
                  : ownAttendanceStatus === "WAITLIST"
                    ? "Voce esta na lista de espera."
                    : "Confirme para entrar na lista."}
              </p>
            </div>
            <form action={ownAttendanceAction}>
              <Button variant={ownAttendanceStatus === "OUT" ? "primary" : "secondary"} className="min-w-28">
                {ownAttendanceStatus === "OUT" ? (
                  <>
                    <Check size={16} /> Vou
                  </>
                ) : (
                  "Cancelar"
                )}
              </Button>
            </form>
          </div>
        </Card>
      ) : null}

      <div className="stagger space-y-5">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.key}>
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Icon size={17} className="text-campo" />
                  <div>
                    <h2 className="text-sm font-extrabold uppercase tracking-[.08em] text-musgo">{section.title}</h2>
                    <p className="text-xs text-musgo/80">{section.description}</p>
                  </div>
                </div>
                <span className="rounded-[10px] bg-white px-3 py-1 text-sm font-black text-campo shadow-sm">
                  {section.players.length}
                </span>
              </div>

              <div className="space-y-2">
                {section.players.length ? (
                  section.players.map((player) => {
                    const attendance = player.attendances[0];
                    const status = attendance?.status || "OUT";
                    const canRemoveGuest =
                      player.membershipStatus === "CONVIDADO" &&
                      attendance &&
                      (isAdmin || attendance.invitedByUserId === user.id);
                    const canToggleOwnAttendance =
                      linkedPlayer?.id === player.id && player.membershipStatus === "MENSALISTA";
                    const canToggleAttendance = isAdmin || canToggleOwnAttendance;
                    const attendanceAction = isAdmin
                      ? toggleAttendance.bind(null, id, player.id, status === "OUT")
                      : toggleOwnAttendance.bind(null, id, status === "OUT");

                    return (
                      <Card
                        key={player.id}
                        className={cn(
                          "animate-card p-3",
                          status === "CONFIRMED"
                            ? "border border-campo/20 bg-[#EAF5EC]"
                            : status === "WAITLIST"
                              ? "border border-craque/30 bg-[#FCEFD6]"
                              : "border border-linha bg-white/75"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <PlayerAvatar src={player.photoUrl} name={player.nickname} position={player.position} />
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <h3 className="truncate font-black">{player.nickname}</h3>
                              <span
                                className={cn(
                                  "shrink-0 rounded-[7px] px-2 py-0.5 text-[11px] font-black",
                                  status === "CONFIRMED"
                                    ? "bg-campo text-white"
                                    : status === "WAITLIST"
                                      ? "bg-craque/30 text-[#8a5a06]"
                                      : "bg-linha text-musgo"
                                )}
                              >
                                {status === "CONFIRMED" ? "Presente" : status === "WAITLIST" ? "Espera" : "Fora"}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-musgo">
                              {player.position} - nota {player.rating} -{" "}
                              {player.membershipStatus === "MENSALISTA" ? "mensalista" : "convidado"}
                            </p>
                          </div>
                          {canToggleAttendance ? (
                            <form action={attendanceAction}>
                              <Button
                                variant={status === "OUT" ? "primary" : "secondary"}
                                className={cn("min-w-24 px-3", status === "CONFIRMED" && "border-campo/30")}
                              >
                                {status === "OUT" ? (
                                  <>
                                    <Check size={16} /> Vai
                                  </>
                                ) : (
                                  "Cancelar"
                                )}
                              </Button>
                            </form>
                          ) : null}
                          {canRemoveGuest ? (
                            <GuestRemoveForm matchId={id} attendanceId={attendance.id} />
                          ) : null}
                        </div>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="border border-dashed border-linha bg-white/50 p-3">
                    <p className="text-sm text-musgo">Nenhum jogador aqui.</p>
                  </Card>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {canInviteGuest ? (
        <CollapsibleCard
          className="mt-5"
          icon={UserPlus}
          title="Chamar convidado"
          description="Mensalistas podem adicionar convidados apos as 14h no dia da pelada."
        >
          <GuestForm matchId={id} />
        </CollapsibleCard>
      ) : null}

      {isAdmin && match ? (
        <CollapsibleCard
          className="mt-3"
          icon={RadarIcon}
          title="Radar: abrir para externos"
          description="Defina vagas, cobranca e nota minima para jogadores de fora encontrarem essa pelada."
          defaultOpen={Boolean(radarAberto || radarErro)}
        >
          {radarAberto ? (
            <div className="mb-3 rounded-[13px] border border-campo/30 bg-[#EAF5EC] p-3 text-sm font-semibold text-campo">
              Pelada aberta para externos.
            </div>
          ) : null}
          {radarErro ? (
            <div className="mb-3 rounded-[13px] border border-ausente/30 bg-[#FBE9E6] p-3 text-sm font-semibold text-ausente">
              {radarErro}
            </div>
          ) : null}
          <OpenToGuestsForm
            matchId={id}
            openToGuests={match.openToGuests}
            guestLineSlots={match.guestLineSlots}
            guestGoalkeeperSlots={match.guestGoalkeeperSlots}
            guestLineFeeMode={match.guestLineFeeMode}
            guestGoalkeeperFeeMode={match.guestGoalkeeperFeeMode}
            guestLineFeeAmount={match.guestLineFeeAmount}
            guestGoalkeeperFeeAmount={match.guestGoalkeeperFeeAmount}
            guestMinRating={match.guestMinRating}
            guestMaxRating={match.guestMaxRating}
            approvedLineCount={approvedLineCount}
            approvedGoalkeeperCount={approvedGoalkeeperCount}
          />
        </CollapsibleCard>
      ) : null}

      {isAdmin ? (
        <Link href={`/matches/${id}/draw`} className="mt-4 block">
          <Button className="w-full">Ir para sorteio</Button>
        </Link>
      ) : null}
    </AppShell>
  );
}
