import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { PeladaGuestSettingsForm } from "@/components/forms/PeladaGuestSettingsForm";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function PeladaConfiguracoesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const admin = await requireAdmin();
  const { error, success } = await searchParams;

  const pelada = await prisma.pelada.findUnique({
    where: { id: admin.peladaId! },
    select: { restrictGuestInviteTime: true, guestInviteHour: true, deprioritizeGuestsInDraw: true }
  });

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Pelada</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Configuracoes</h1>
        <p className="mt-1 text-sm text-musgo">Regras para convidados nesta pelada.</p>
      </div>

      {error ? <p className="mb-3 rounded-[11px] bg-[#FBE9E6] p-3 text-sm font-semibold text-ausente">{error}</p> : null}
      {success ? (
        <p className="mb-3 rounded-[11px] bg-[#EAF5EC] p-3 text-sm font-semibold text-campo">Configuracoes salvas.</p>
      ) : null}

      <Card className="mx-auto max-w-md">
        <PeladaGuestSettingsForm
          initialRestrictGuestInviteTime={pelada?.restrictGuestInviteTime ?? true}
          initialGuestInviteHour={pelada?.guestInviteHour ?? 14}
          initialDeprioritizeGuestsInDraw={pelada?.deprioritizeGuestsInDraw ?? true}
        />
      </Card>
    </AppShell>
  );
}
