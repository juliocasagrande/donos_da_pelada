import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { approveMatchGuestRequest, rejectMatchGuestRequest } from "@/lib/radarActions";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { formatDate, formatTime } from "@/lib/utils";

export default async function AdminsRadarPage({
  searchParams
}: {
  searchParams: Promise<{ radarErro?: string }>;
}) {
  const admin = await requireAdmin();
  const { radarErro } = await searchParams;
  const requests = await prisma.matchGuestRequest.findMany({
    where: { status: "PENDING", match: { peladaId: admin.peladaId!, deletedAt: null } },
    include: { user: true, match: true },
    orderBy: { createdAt: "asc" }
  });

  const approvedCounts = await prisma.matchGuestRequest.groupBy({
    by: ["matchId", "position"],
    where: { status: "APPROVED", matchId: { in: [...new Set(requests.map((request) => request.matchId))] } },
    _count: true
  });
  const approvedCountByKey = new Map(approvedCounts.map((row) => [`${row.matchId}:${row.position}`, row._count]));

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Radar</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Pedidos para jogar</h1>
        <p className="mt-1 text-sm text-musgo">Jogadores de fora que pediram vaga nas suas peladas abertas.</p>
      </div>

      {radarErro ? (
        <div className="animate-card mb-4 rounded-[13px] border border-ausente/30 bg-[#FBE9E6] p-3 text-sm font-semibold text-ausente">
          {radarErro}
        </div>
      ) : null}

      <div className="space-y-2">
        {requests.map((request) => {
          const slotLimit = request.position === "GOLEIRO" ? request.match.guestGoalkeeperSlots : request.match.guestLineSlots;
          const approvedCount = approvedCountByKey.get(`${request.matchId}:${request.position}`) ?? 0;
          const full = slotLimit != null && approvedCount >= slotLimit;
          return (
            <Card key={request.id} className="space-y-2 p-3">
              <div className="min-w-0">
                <h2 className="truncate font-bold">{request.user.name || request.user.email}</h2>
                <p className="truncate text-xs text-musgo">{request.user.email}</p>
                <p className="mt-1 text-xs text-musgo">
                  {request.match.title} - {formatDate(request.match.date)} as {formatTime(request.match.date)} -{" "}
                  {request.position === "GOLEIRO" ? "Goleiro" : "Linha"}
                </p>
                {slotLimit != null ? (
                  <p className={`mt-0.5 text-xs font-bold ${full ? "text-ausente" : "text-musgo"}`}>
                    {approvedCount}/{slotLimit} vagas preenchidas {full ? "- vagas esgotadas" : ""}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <form action={approveMatchGuestRequest.bind(null, request.id)} className="flex-1">
                  <Button type="submit" className="w-full py-2 text-xs" disabled={full}>Aprovar</Button>
                </form>
                <form action={rejectMatchGuestRequest.bind(null, request.id)} className="flex-1">
                  <Button type="submit" variant="danger" className="w-full py-2 text-xs">Rejeitar</Button>
                </form>
              </div>
            </Card>
          );
        })}
        {!requests.length ? (
          <Card>
            <p className="text-sm text-musgo">Nenhum pedido pendente.</p>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
