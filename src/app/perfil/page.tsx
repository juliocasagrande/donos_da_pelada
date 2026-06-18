import { AppShell } from "@/components/layout/AppShell";
import { PlayerForm } from "@/components/forms/PlayerForm";
import { Card } from "@/components/ui/Card";
import { updateOwnProfile } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function ProfilePage({
  searchParams
}: {
  searchParams: Promise<{ salvo?: string }>;
}) {
  const user = await requireUser();
  const { salvo } = await searchParams;
  const player = await prisma.player.findUnique({ where: { userId: user.id } });

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Minha conta</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Meu perfil</h1>
        <p className="text-musgo">{user.email}</p>
      </div>

      {salvo ? (
        <div className="animate-card mb-4 rounded-[13px] border border-campo/30 bg-[#EAF5EC] p-3 text-sm font-semibold text-campo">
          Perfil atualizado com sucesso.
        </div>
      ) : null}

      <Card className="mx-auto max-w-md">
        <PlayerForm
          action={updateOwnProfile}
          player={player ?? undefined}
          submitLabel="Salvar alteracoes"
          canEditRating={false}
        />
      </Card>
    </AppShell>
  );
}
