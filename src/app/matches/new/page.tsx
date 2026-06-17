import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { createMatch } from "@/lib/actions";
import { requireAdmin } from "@/lib/session";

export default async function NewMatchPage() {
  await requireAdmin();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <AppShell>
      <div className="mb-5"><p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Organizacao</p><h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Nova pelada</h1></div>
      <Card className="mx-auto max-w-md">
        <form action={createMatch} className="space-y-3">
          <div><Label>Nome da pelada</Label><Input name="title" defaultValue="Pelada da semana" required /></div>
          <div><Label>Data</Label><Input name="date" type="date" defaultValue={today} required /></div>
          <div className="grid grid-cols-3 gap-2">
            <span className="rounded-[11px] bg-campo px-3 py-3 text-center text-sm font-semibold text-white">Society</span>
            <span className="rounded-[11px] border-[1.5px] border-linha bg-white px-3 py-3 text-center text-sm font-semibold text-musgo">Campo</span>
            <span className="rounded-[11px] border-[1.5px] border-linha bg-white px-3 py-3 text-center text-sm font-semibold text-musgo">Quadra</span>
          </div>
          <Button className="w-full" type="submit">Criar pelada</Button>
        </form>
      </Card>
    </AppShell>
  );
}
