import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { createPeladaAction } from "@/lib/peladaOnboardingActions";
import { getCurrentUser } from "@/lib/session";

export default async function CriarPeladaPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !user.active) redirect("/login");
  const { error } = await searchParams;

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Nova pelada</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Criar pelada</h1>
        <p className="mt-1 text-sm text-musgo">Voce vira o presidente, com 14 dias de Pro gratis para testar tudo.</p>
      </div>
      <Card className="mx-auto max-w-md">
        {error ? <p className="mb-3 rounded-[11px] bg-[#FBE9E6] p-3 text-sm font-semibold text-ausente">{error}</p> : null}
        <form action={createPeladaAction} className="space-y-3">
          <div>
            <Label>Nome da pelada</Label>
            <Input name="name" placeholder="Pelada do Zico" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Jogadores de linha</Label>
              <Input name="maxLinePlayers" type="number" min={1} defaultValue={18} required />
            </div>
            <div>
              <Label>Goleiros</Label>
              <Input name="maxGoalkeepers" type="number" min={0} defaultValue={2} required />
            </div>
          </div>
          <p className="text-xs text-musgo">
            Esse limite define quantos jogadores entram como confirmados antes da lista de espera.
          </p>
          <Button type="submit" className="w-full">Criar pelada</Button>
        </form>
      </Card>
    </AppShell>
  );
}
