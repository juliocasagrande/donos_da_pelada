import Link from "next/link";
import { Clock, MapPin, Radar as RadarIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RequestGuestSlotButton } from "@/components/matches/RequestGuestSlotButton";
import { Card } from "@/components/ui/Card";
import { PeladaCrest } from "@/components/ui/PeladaCrest";
import { haversineKm } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatCurrencyBRL } from "@/lib/financeUtils";
import { formatDate, formatTime, surfaceLabel } from "@/lib/utils";

const feeModeLabels: Record<string, string> = {
  FREE: "Gratis",
  CHARGE: "Jogador paga",
  PAY: "Pelada paga"
};

export default async function RadarPage({
  searchParams
}: {
  searchParams: Promise<{ solicitado?: string; radarErro?: string }>;
}) {
  const user = await requireUser();
  const { solicitado, radarErro } = await searchParams;

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { radarEnabled: true, radarRadiusKm: true, latitude: true, longitude: true }
  });

  if (!profile?.radarEnabled || profile.latitude == null || profile.longitude == null) {
    return (
      <AppShell>
        <div className="mb-5">
          <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Descubra</p>
          <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Radar de peladas</h1>
        </div>
        <Card className="border border-dashed border-[#C7CDC0] bg-[#F6F8F3] text-center">
          <RadarIcon className="mx-auto mb-2 text-campo" size={28} />
          <p className="text-sm text-musgo">Ative o radar no seu perfil e informe seu endereco para ver peladas abertas perto de voce.</p>
          <Link href="/perfil" className="mt-3 inline-flex rounded-[11px] bg-campo px-4 py-2 text-sm font-bold text-white">
            Ir para o perfil
          </Link>
        </Card>
      </AppShell>
    );
  }

  const [openMatches, myRequests] = await Promise.all([
    prisma.match.findMany({
      where: {
        deletedAt: null,
        status: "OPEN",
        openToGuests: true,
        peladaId: { not: user.peladaId! },
        guestLatitude: { not: null },
        guestLongitude: { not: null },
        date: { gte: new Date() }
      },
      include: { pelada: { select: { name: true } } },
      orderBy: { date: "asc" },
      take: 200
    }),
    prisma.matchGuestRequest.findMany({
      where: { userId: user.id },
      select: { matchId: true, status: true }
    })
  ]);

  const requestByMatchId = new Map(myRequests.map((request) => [request.matchId, request.status]));

  const approvedCounts = await prisma.matchGuestRequest.groupBy({
    by: ["matchId", "position"],
    where: { status: "APPROVED", matchId: { in: openMatches.map((match) => match.id) } },
    _count: true
  });
  const approvedCountByKey = new Map(approvedCounts.map((row) => [`${row.matchId}:${row.position}`, row._count]));

  const nearby = openMatches
    .map((match) => ({
      match,
      distanceKm: haversineKm(profile.latitude!, profile.longitude!, match.guestLatitude!, match.guestLongitude!)
    }))
    .filter(({ distanceKm }) => distanceKm <= profile.radarRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Descubra</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Radar de peladas</h1>
        <p className="mt-1 text-sm text-musgo">Peladas abertas para externos em um raio de {profile.radarRadiusKm} km.</p>
      </div>

      {solicitado ? (
        <div className="animate-card mb-4 rounded-[13px] border border-campo/30 bg-[#EAF5EC] p-3 text-sm font-semibold text-campo">
          Pedido enviado! Aguarde a aprovacao do admin.
        </div>
      ) : null}
      {radarErro ? (
        <div className="animate-card mb-4 rounded-[13px] border border-ausente/30 bg-[#FBE9E6] p-3 text-sm font-semibold text-ausente">
          {radarErro}
        </div>
      ) : null}

      <div className="space-y-2">
        {nearby.map(({ match, distanceKm }) => {
          const requestStatus = requestByMatchId.get(match.id);
          const approvedLine = approvedCountByKey.get(`${match.id}:LINHA`) ?? 0;
          const approvedGoalkeeper = approvedCountByKey.get(`${match.id}:GOLEIRO`) ?? 0;
          const remainingLine = Math.max(0, (match.guestLineSlots ?? 0) - approvedLine);
          const remainingGoalkeeper = Math.max(0, (match.guestGoalkeeperSlots ?? 0) - approvedGoalkeeper);
          return (
            <Card key={match.id} className="space-y-2 p-3">
              <div className="flex items-start gap-3">
                <PeladaCrest size={42} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-bold">{match.title}</h2>
                  <p className="text-xs text-musgo">{match.pelada.name}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-musgo">
                    <Clock size={13} /> {formatDate(match.date)} as {formatTime(match.date)} - {surfaceLabel(match.surface)}
                  </p>
                  {match.location ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-musgo">
                      <MapPin size={13} /> {match.location}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-[10px] bg-[#EAF5EC] px-2 py-1 text-[11px] font-bold text-campo">
                  {distanceKm.toFixed(1)} km
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                {match.guestLineSlots ? (
                  <span className="rounded-[8px] bg-areia px-2 py-1 text-musgo">
                    {remainingLine}/{match.guestLineSlots} vaga(s) linha - {feeModeLabels[match.guestLineFeeMode]}
                    {match.guestLineFeeAmount ? ` (${formatCurrencyBRL(match.guestLineFeeAmount)})` : ""}
                  </span>
                ) : null}
                {match.guestGoalkeeperSlots ? (
                  <span className="rounded-[8px] bg-areia px-2 py-1 text-musgo">
                    {remainingGoalkeeper}/{match.guestGoalkeeperSlots} vaga(s) goleiro - {feeModeLabels[match.guestGoalkeeperFeeMode]}
                    {match.guestGoalkeeperFeeAmount ? ` (${formatCurrencyBRL(match.guestGoalkeeperFeeAmount)})` : ""}
                  </span>
                ) : null}
                {match.guestMinRating || match.guestMaxRating ? (
                  <span className="rounded-[8px] bg-areia px-2 py-1 text-musgo">
                    Nota {match.guestMinRating ?? 0} - {match.guestMaxRating ?? 10}
                  </span>
                ) : null}
              </div>

              <RequestGuestSlotButton
                matchId={match.id}
                status={requestStatus}
                lineAvailable={remainingLine > 0}
                goalkeeperAvailable={remainingGoalkeeper > 0}
              />
            </Card>
          );
        })}
        {!nearby.length ? (
          <Card className="border border-dashed border-[#C7CDC0] bg-[#F6F8F3] text-center">
            <p className="text-sm text-musgo">Nenhuma pelada aberta no seu raio agora. Volte mais tarde.</p>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
