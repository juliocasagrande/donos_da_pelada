import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { setPeladaPlanManually } from "@/lib/peladaAdminActions";
import { requestPeladaDeletion } from "@/lib/deletionVotingActions";
import { isPeladaPro } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function PeladasAdminPage() {
  await requireMaster();
  const peladas = await prisma.pelada.findMany({
    include: { _count: { select: { players: true, matches: true } } },
    orderBy: { createdAt: "asc" }
  });

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Acesso restrito</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Peladas</h1>
        <p className="mt-1 text-sm text-musgo">Gerencie o plano de cada pelada cadastrada no sistema.</p>
      </div>

      <div className="space-y-3">
        {peladas.map((pelada) => {
          const pro = isPeladaPro(pelada);
          return (
            <Card key={pelada.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {pro ? <ShieldCheck size={18} className="text-craque" /> : null}
                    <h2 className="truncate font-bold">{pelada.name}</h2>
                  </div>
                  <p className="text-xs text-musgo">
                    {pelada._count.players} jogadores · {pelada._count.matches} partidas
                  </p>
                  <p className="text-xs text-musgo/70">
                    Plano: {pelada.plan}
                    {pelada.trialEndsAt ? ` · Trial ate ${formatDate(pelada.trialEndsAt)}` : ""}
                    {pelada.proRenewsAt ? ` · Valido ate ${formatDate(pelada.proRenewsAt)}` : ""}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <form action={setPeladaPlanManually.bind(null, pelada.id, "PRO")}>
                  <Button type="submit" variant="secondary" className="w-full py-2 text-xs">Promover Pro</Button>
                </form>
                <form action={setPeladaPlanManually.bind(null, pelada.id, "FREE")}>
                  <Button type="submit" variant="secondary" className="w-full py-2 text-xs">Rebaixar Free</Button>
                </form>
                <form action={requestPeladaDeletion.bind(null, pelada.id)}>
                  <Button type="submit" variant="danger" className="w-full py-2 text-xs">Excluir</Button>
                </form>
              </div>
            </Card>
          );
        })}
        {!peladas.length ? (
          <Card>
            <p className="text-sm text-musgo">Nenhuma pelada cadastrada ainda.</p>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
