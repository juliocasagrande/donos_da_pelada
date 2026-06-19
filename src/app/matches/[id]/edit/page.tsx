import { notFound } from "next/navigation";
import { Radar } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MatchForm } from "@/components/forms/MatchForm";
import { OpenToGuestsForm } from "@/components/forms/OpenToGuestsForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { deleteMatch, updateMatch } from "@/lib/actions";
import { isPeladaIdPro } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function EditMatchPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ radarErro?: string; radarAberto?: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { radarErro, radarAberto } = await searchParams;
  const match = await prisma.match.findFirst({ where: { id, peladaId: admin.peladaId!, deletedAt: null } });
  if (!match) notFound();
  const allowAmistoso = await isPeladaIdPro(admin.peladaId!);
  const approvedCounts = match.openToGuests
    ? await prisma.matchGuestRequest.groupBy({
        by: ["position"],
        where: { matchId: match.id, status: "APPROVED" },
        _count: true
      })
    : [];
  const approvedLineCount = approvedCounts.find((row) => row.position === "LINHA")?._count ?? 0;
  const approvedGoalkeeperCount = approvedCounts.find((row) => row.position === "GOLEIRO")?._count ?? 0;

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Editar</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">{match.title}</h1>
      </div>
      <Card className="mx-auto max-w-md">
        <MatchForm
          action={updateMatch.bind(null, match.id)}
          match={match}
          submitLabel="Salvar pelada"
          allowAmistoso={allowAmistoso || match.kind === "AMISTOSO"}
        />
        <form action={deleteMatch.bind(null, match.id)} className="mt-3">
          <Button variant="danger" className="w-full" type="submit">Excluir pelada</Button>
        </form>
        <p className="mt-3 text-xs text-musgo">
          Encerrar uma pelada preserva presencas, gols, notas e craque. Excluir uma partida encerrada oculta a pelada, mas mantem as estatisticas dos jogadores.
        </p>
      </Card>

      <div className="mx-auto mt-5 max-w-md">
        <div className="mb-2 flex items-center gap-2 px-1">
          <Radar size={17} className="text-campo" />
          <h2 className="text-sm font-extrabold uppercase tracking-[.08em] text-musgo">Radar: abrir para externos</h2>
        </div>
        {radarAberto ? (
          <div className="animate-card mb-3 rounded-[13px] border border-campo/30 bg-[#EAF5EC] p-3 text-sm font-semibold text-campo">
            Pelada aberta para externos.
          </div>
        ) : null}
        {radarErro ? (
          <div className="animate-card mb-3 rounded-[13px] border border-ausente/30 bg-[#FBE9E6] p-3 text-sm font-semibold text-ausente">
            {radarErro}
          </div>
        ) : null}
        <Card>
          <OpenToGuestsForm
            matchId={match.id}
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
        </Card>
      </div>
    </AppShell>
  );
}
