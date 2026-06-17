import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { deleteMatch, updateMatch } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

function dateInputValue(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(date);
}

export default async function EditMatchPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match) notFound();

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Editar</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">{match.title}</h1>
      </div>
      <Card className="mx-auto max-w-md">
        <form action={updateMatch.bind(null, match.id)} className="space-y-3">
          <div>
            <Label>Nome da pelada</Label>
            <Input name="title" defaultValue={match.title} required />
          </div>
          <div>
            <Label>Data</Label>
            <Input name="date" type="date" defaultValue={dateInputValue(match.date)} required />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="rounded-[11px] bg-campo px-3 py-3 text-center text-sm font-semibold text-white">Society</span>
            <span className="rounded-[11px] border-[1.5px] border-linha bg-white px-3 py-3 text-center text-sm font-semibold text-musgo">Campo</span>
            <span className="rounded-[11px] border-[1.5px] border-linha bg-white px-3 py-3 text-center text-sm font-semibold text-musgo">Quadra</span>
          </div>
          <Button className="w-full" type="submit">Salvar pelada</Button>
        </form>
        <form action={deleteMatch.bind(null, match.id)} className="mt-3">
          <Button variant="danger" className="w-full" type="submit">Excluir pelada</Button>
        </form>
        <p className="mt-3 text-xs text-musgo">
          Encerrar uma pelada preserva presencas, gols, notas e craque. Excluir remove a pelada e seus dados vinculados.
        </p>
      </Card>
    </AppShell>
  );
}
