import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GuestForm } from "@/components/forms/GuestForm";
import { GuestRemoveForm } from "@/components/matches/GuestRemoveForm";
import { LocationLinks } from "@/components/matches/LocationLinks";
import { toggleAttendance, toggleOwnAttendance } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
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

export default async function AttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [match, players] = await Promise.all([
    prisma.match.findUnique({ where: { id } }),
    prisma.player.findMany({
      where: { active: true },
      include: { attendances: { where: { matchId: id }, include: { invitedByUser: true } } },
      orderBy: { name: "asc" }
    })
  ]);

  const isAdmin = user.role === "MASTER" || user.role === "ADMIN";
  const linkedPlayer = await prisma.player.findUnique({ where: { userId: user.id } });
  const canInviteGuest =
    isAdmin ||
    Boolean(
      linkedPlayer?.membershipStatus === "MENSALISTA" &&
        match &&
        getSaoPauloDate(new Date()) === getSaoPauloDate(match.date) &&
        getSaoPauloHour(new Date()) >= 14
    );

  const presentCount = players.filter((player) => player.attendances[0]?.status === "CONFIRMED").length;
  const waitlistCount = players.filter((player) => player.attendances[0]?.status === "WAITLIST").length;

  return (
    <AppShell>
      <div className="field-hero -mx-1 mb-5 rounded-card px-5 py-6 text-white">
        <div className="relative">
          <h1 className="font-display text-2xl font-extrabold">{match?.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-4 text-sm text-green-100">
            <span className="flex items-center gap-1">
              <Clock size={14} /> {match ? `${formatDate(match.date)} as ${formatTime(match.date)}` : ""}
            </span>
            {match ? <LocationLinks location={match.location} /> : null}
            {match ? (
              <span className="rounded-[7px] bg-white/15 px-2 py-0.5 text-xs font-bold">{surfaceLabel(match.surface)}</span>
            ) : null}
          </p>
        </div>
      </div>

      <Card className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Confirmados</h2>
            <p className="text-sm text-musgo">
              {presentCount} confirmados · {waitlistCount} na espera
            </p>
          </div>
          <div key={presentCount} className="pop-scale font-jersey text-3xl font-bold text-campo">{presentCount}</div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-areia">
          <div className="grow-bar h-full rounded-full bg-campo" style={{ width: `${Math.min(100, presentCount * 5)}%` }} />
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Voce vai jogar?</h2>
        <div key={presentCount} className="pop-scale rounded-lg bg-white px-3 py-2 font-jersey text-xl font-bold text-campo shadow-card">{presentCount}</div>
      </div>

      {canInviteGuest ? (
        <Card className="mb-4">
          <h2 className="mb-1 font-display text-lg font-bold">Chamar convidado</h2>
          <p className="mb-3 text-sm text-musgo">Mensalistas podem adicionar convidados apos as 14h no dia da pelada.</p>
          <GuestForm matchId={id} />
        </Card>
      ) : null}

      <div className="stagger space-y-3">
        {players.map((player) => {
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
                "animate-card",
                status === "CONFIRMED"
                  ? "border border-campo/20 bg-[#EAF5EC]"
                  : status === "WAITLIST"
                    ? "border border-craque/30 bg-[#FCEFD6]"
                    : "border border-linha bg-white/60 opacity-70"
              )}
            >
              <div className="flex items-center gap-3">
                <PlayerAvatar src={player.photoUrl} name={player.name} position={player.position} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-black">{player.nickname || player.name}</h2>
                  <p className="text-sm text-musgo">
                    {player.position} · {player.rating} ·{" "}
                    {player.membershipStatus === "MENSALISTA" ? "mensalista" : "convidado"} ·{" "}
                    {status === "CONFIRMED" ? "confirmado" : status === "WAITLIST" ? "espera" : "fora"}
                  </p>
                </div>
                {canToggleAttendance ? (
                  <form action={attendanceAction}>
                    <Button
                      variant={status === "CONFIRMED" ? "danger" : status === "WAITLIST" ? "ghost" : "primary"}
                      className={status === "WAITLIST" ? "border-craque/40 text-mata" : ""}
                    >
                      {status === "CONFIRMED" ? (
                        "Faltou"
                      ) : status === "WAITLIST" ? (
                        "Cancelar"
                      ) : (
                        <>
                          <Check size={16} /> Vou
                        </>
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
        })}
      </div>

      {isAdmin ? (
        <Link href={`/matches/${id}/draw`} className="mt-4 block">
          <Button className="w-full">Ir para sorteio</Button>
        </Link>
      ) : null}
      <Link href={`/matches/${id}/stats`} className="mt-3 block">
        <Button className="w-full" variant="secondary">Votar no craque e dar notas</Button>
      </Link>
    </AppShell>
  );
}
