import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requestPeladaDeletion } from "@/lib/deletionVotingActions";
import { isPeladaIdPro } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function PeladasAdminPage() {
  await requireMaster();
  const peladas = await prisma.pelada.findMany({
    include: { _count: { select: { players: true, matches: true } } },
    orderBy: { createdAt: "asc" }
  });

  const owners = await prisma.user.findMany({
    where: { id: { in: Array.from(new Set(peladas.map((p) => p.createdByUserId).filter((id): id is string => Boolean(id)))) } },
    select: { id: true, email: true }
  });
  const ownerEmailById = new Map(owners.map((owner) => [owner.id, owner.email]));

  const peladasWithPro = await Promise.all(
    peladas.map(async (pelada) => ({ pelada, pro: await isPeladaIdPro(pelada.id) }))
  );

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Acesso restrito</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Peladas</h1>
        <p className="mt-1 text-sm text-musgo">
          O plano Pro pertence ao usuario dono da pelada.{" "}
          <Link href="/admins/usuarios" className="font-semibold text-campo underline">
            Gerencie o plano dos usuarios aqui.
          </Link>
        </p>
      </div>

      <div className="space-y-3">
        {peladasWithPro.map(({ pelada, pro }) => (
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
                  {pro ? "Pro" : "Free"}
                  {pelada.trialEndsAt ? ` · Trial ate ${formatDate(pelada.trialEndsAt)}` : ""}
                  {pelada.createdByUserId
                    ? ` · Dono: ${ownerEmailById.get(pelada.createdByUserId) || pelada.createdByUserId}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <form action={requestPeladaDeletion.bind(null, pelada.id)}>
                <Button type="submit" variant="danger" className="w-full py-2 text-xs">Excluir</Button>
              </form>
            </div>
          </Card>
        ))}
        {!peladas.length ? (
          <Card>
            <p className="text-sm text-musgo">Nenhuma pelada cadastrada ainda.</p>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
