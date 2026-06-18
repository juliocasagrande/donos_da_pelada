import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { approveJoinRequest, rejectJoinRequest } from "@/lib/peladaOnboardingActions";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function SolicitacoesPage() {
  const admin = await requireAdmin();
  const requests = await prisma.peladaJoinRequest.findMany({
    where: { peladaId: admin.peladaId!, status: "PENDING" },
    include: { user: true },
    orderBy: { createdAt: "asc" }
  });

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Acesso restrito</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Solicitacoes</h1>
        <p className="mt-1 text-sm text-musgo">Pessoas que pediram para entrar na sua pelada pela busca.</p>
      </div>

      <div className="space-y-2">
        {requests.map((request) => (
          <Card key={request.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <h2 className="truncate font-bold">{request.user.name || request.user.email}</h2>
              <p className="truncate text-xs text-musgo">{request.user.email}</p>
            </div>
            <div className="flex gap-2">
              <form action={approveJoinRequest.bind(null, request.id)}>
                <Button type="submit" className="py-2 text-xs">Aprovar</Button>
              </form>
              <form action={rejectJoinRequest.bind(null, request.id)}>
                <Button type="submit" variant="danger" className="py-2 text-xs">Rejeitar</Button>
              </form>
            </div>
          </Card>
        ))}
        {!requests.length ? (
          <Card>
            <p className="text-sm text-musgo">Nenhuma solicitacao pendente.</p>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
