import { AppShell } from "@/components/layout/AppShell";
import { MatchForm } from "@/components/forms/MatchForm";
import { Card } from "@/components/ui/Card";
import { createMatch } from "@/lib/actions";
import { isPeladaIdPro } from "@/lib/plan";
import { requireAdmin } from "@/lib/session";

export default async function NewMatchPage() {
  const admin = await requireAdmin();
  const allowAmistoso = await isPeladaIdPro(admin.peladaId!);
  return (
    <AppShell>
      <div className="mb-5"><p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Organizacao</p><h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Nova pelada</h1></div>
      <Card className="mx-auto max-w-md">
        <MatchForm action={createMatch} submitLabel="Criar pelada" allowAmistoso={allowAmistoso} />
      </Card>
    </AppShell>
  );
}
