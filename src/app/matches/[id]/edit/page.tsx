import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MatchForm } from "@/components/forms/MatchForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { deleteMatch, updateMatch } from "@/lib/actions";
import { isPeladaIdPro } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function EditMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const match = await prisma.match.findFirst({ where: { id, peladaId: admin.peladaId!, deletedAt: null } });
  if (!match) notFound();
  const allowAmistoso = await isPeladaIdPro(admin.peladaId!);

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
    </AppShell>
  );
}
