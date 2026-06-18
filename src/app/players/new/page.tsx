import { AppShell } from "@/components/layout/AppShell";
import { PlayerForm } from "@/components/forms/PlayerForm";
import { Card } from "@/components/ui/Card";
import { createPlayer } from "@/lib/actions";
import { requireAdmin } from "@/lib/session";

export default async function NewPlayerPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;
  return (
    <AppShell>
      <div className="mb-5"><p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Cadastro</p><h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Novo jogador</h1></div>
      <Card className="mx-auto max-w-md">
        {error ? <p className="mb-3 rounded-[11px] bg-[#FBE9E6] p-3 text-sm font-semibold text-ausente">{error}</p> : null}
        <PlayerForm action={createPlayer} canEditMembershipStatus />
      </Card>
    </AppShell>
  );
}
