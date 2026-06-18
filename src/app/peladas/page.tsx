import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Plus, Search, Ticket } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PeladaCrest } from "@/components/ui/PeladaCrest";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { leavePelada } from "@/lib/actions";
import { requestPeladaDeletion } from "@/lib/deletionVotingActions";
import { GoToInviteForm } from "@/components/forms/GoToInviteForm";
import { setActivePelada } from "@/lib/peladaActions";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function PeladasHubPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !user.active) redirect("/login");
  const query = await searchParams;

  const memberships = await prisma.peladaMembership.findMany({
    where: { userId: user.id },
    include: {
      pelada: {
        select: {
          id: true,
          name: true,
          memberships: { where: { role: { in: ["PRESIDENTE", "ADMIN"] } }, select: { userId: true } }
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  if (!memberships.length) redirect("/onboarding");

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Minhas peladas</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Peladas</h1>
      </div>
      {query?.error ? (
        <p className="mb-3 rounded-[11px] bg-[#FBE9E6] p-3 text-sm font-semibold text-ausente">{query.error}</p>
      ) : null}

      <div className="mb-4 space-y-2">
        {memberships.map((membership) => {
          const active = membership.peladaId === user.peladaId;
          const onlyAdmin =
            membership.pelada.memberships.length === 1 &&
            membership.pelada.memberships[0]?.userId === user.id &&
            (membership.role === "PRESIDENTE" || membership.role === "ADMIN");
          const canDeletePelada = membership.role === "PRESIDENTE" || membership.role === "ADMIN" || user.role === "MASTER";
          return (
            <Card key={membership.id} className="space-y-3 p-3">
              <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <PeladaCrest size={40} />
                <div className="min-w-0">
                  <h2 className="truncate font-bold">{membership.pelada.name}</h2>
                  <RoleBadge role={membership.role} />
                </div>
              </div>
              {active ? (
                <span className="flex items-center gap-1 rounded-[10px] bg-[#EAF5EC] px-3 py-2 text-xs font-bold text-campo">
                  <Check size={14} /> Ativa
                </span>
              ) : (
                <form action={setActivePelada.bind(null, membership.peladaId)}>
                  <Button type="submit" variant="secondary" className="py-2 text-xs">Trocar</Button>
                </form>
              )}
              </div>
              <form action={leavePelada.bind(null, membership.peladaId)}>
                <Button type="submit" variant="danger" className="w-full py-2 text-xs" disabled={onlyAdmin}>
                  {onlyAdmin ? "Adicione outro admin antes de sair" : "Sair desta pelada"}
                </Button>
              </form>
              {canDeletePelada ? (
                <form action={requestPeladaDeletion.bind(null, membership.peladaId)}>
                  <Button type="submit" variant="danger" className="w-full py-2 text-xs">
                    Solicitar exclusao da pelada
                  </Button>
                </form>
              ) : null}
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Link href="/peladas/criar">
          <Card className="flex items-center gap-3 p-3 transition hover:-translate-y-0.5">
            <Plus className="text-campo" size={20} />
            <div>
              <h2 className="font-bold">Criar minha pelada</h2>
              <p className="text-xs text-musgo">Voce se torna o presidente, com 14 dias de Pro gratis.</p>
            </div>
          </Card>
        </Link>
        <Link href="/peladas/buscar">
          <Card className="flex items-center gap-3 p-3 transition hover:-translate-y-0.5">
            <Search className="text-campo" size={20} />
            <div>
              <h2 className="font-bold">Buscar uma pelada</h2>
              <p className="text-xs text-musgo">Encontre pelo nome e solicite entrada ao admin.</p>
            </div>
          </Card>
        </Link>
        <Card className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <Ticket className="text-campo" size={20} />
            <h2 className="font-bold">Tenho um codigo de convite</h2>
          </div>
          <GoToInviteForm />
        </Card>
      </div>
    </AppShell>
  );
}
