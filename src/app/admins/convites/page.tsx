import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { CopyInviteLink } from "@/components/forms/CopyInviteLink";
import { InviteExternalPlayerLink } from "@/components/forms/InviteExternalPlayerLink";
import { createInvite, revokeInvite } from "@/lib/peladaOnboardingActions";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function ConvitesPage() {
  const admin = await requireAdmin();
  const invites = await prisma.peladaInvite.findMany({
    where: { peladaId: admin.peladaId!, revokedAt: null },
    orderBy: { createdAt: "desc" }
  });
  const pelada = await prisma.pelada.findUnique({
    where: { id: admin.peladaId! },
    select: { name: true }
  });
  const usableInvite = invites.find((invite) => {
    const notExpired = !invite.expiresAt || invite.expiresAt > new Date();
    const hasUses = invite.maxUses == null || invite.usedCount < invite.maxUses;
    return notExpired && hasUses;
  });
  const externalPlayers = await prisma.player.findMany({
    where: {
      peladaId: { not: admin.peladaId! },
      active: true,
      userId: { not: null },
      user: {
        active: true,
        whatsapp: { not: null },
        whatsappChatEnabled: true,
        peladaMemberships: { none: { peladaId: admin.peladaId! } }
      }
    },
    include: {
      pelada: { select: { name: true } },
      user: { select: { whatsapp: true } }
    },
    distinct: ["userId"],
    orderBy: [{ nickname: "asc" }]
  });

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Acesso restrito</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Convites</h1>
        <p className="mt-1 text-sm text-musgo">Gere um link para convidar jogadores para a sua pelada.</p>
      </div>

      <Card className="mb-4">
        <h2 className="mb-3 font-display text-lg font-extrabold">Novo convite</h2>
        <form action={createInvite} className="space-y-3">
          <div>
            <Label>Tipo de acesso</Label>
            <div className="rounded-[13px] border-[1.5px] border-linha bg-areia px-3 py-2 text-sm font-bold text-mata">
              Jogador
            </div>
            <p className="mt-1 text-xs text-musgo">Links de convite adicionam apenas jogadores. Promova admins pela tela de administradores.</p>
          </div>
          <div>
            <Label>Limite de usos (opcional)</Label>
            <Input name="maxUses" type="number" min={1} placeholder="Sem limite" />
          </div>
          <Button type="submit" className="w-full">Gerar convite</Button>
        </form>
      </Card>

      <h2 className="mb-2 font-display text-lg font-extrabold">Convites ativos</h2>
      <div className="space-y-2">
        {invites.map((invite) => (
          <Card key={invite.id} className="space-y-2 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold">JOGADOR</p>
                <p className="text-xs text-musgo">
                  {invite.usedCount}/{invite.maxUses ?? "∞"} usos · criado em {formatDate(invite.createdAt)}
                </p>
              </div>
              <form action={revokeInvite.bind(null, invite.id)}>
                <Button type="submit" variant="danger" className="py-2 text-xs">Revogar</Button>
              </form>
            </div>
            <CopyInviteLink code={invite.code} peladaName={pelada?.name || "sua pelada"} />
          </Card>
        ))}
        {!invites.length ? (
          <Card>
            <p className="text-sm text-musgo">Nenhum convite ativo. Gere um acima.</p>
          </Card>
        ) : null}
      </div>

      <h2 className="mb-2 mt-5 font-display text-lg font-extrabold">Convidar jogadores de outras peladas</h2>
      <div className="space-y-2">
        {!usableInvite ? (
          <Card>
            <p className="text-sm text-musgo">Gere um convite ativo para enviar pelo chat.</p>
          </Card>
        ) : externalPlayers.length ? (
          externalPlayers.map((player) => (
            <Card key={player.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{player.nickname}</p>
                <p className="truncate text-xs text-musgo">{player.pelada.name}</p>
              </div>
              {player.user?.whatsapp ? (
                <InviteExternalPlayerLink
                  code={usableInvite.code}
                  peladaName={pelada?.name || "sua pelada"}
                  playerName={player.nickname}
                  whatsapp={player.user.whatsapp}
                />
              ) : null}
            </Card>
          ))
        ) : (
          <Card>
            <p className="text-sm text-musgo">Nenhum jogador externo com chat habilitado por enquanto.</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
