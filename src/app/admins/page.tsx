import Link from "next/link";
import { ShieldCheck, User } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { toggleAdminRole } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function AdminsPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const current = await requireAdmin();
  const query = await searchParams;
  const canManageAdmins = current.role === "MASTER" || current.peladaRole === "PRESIDENTE";
  const [memberships, activeMensalistas] = await Promise.all([
    prisma.peladaMembership.findMany({
      where: { peladaId: current.peladaId! },
      include: { user: true },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }]
    }),
    prisma.player.findMany({
      where: { peladaId: current.peladaId!, active: true, membershipStatus: "MENSALISTA", userId: { not: null } },
      select: { userId: true }
    })
  ]);
  const activeMensalistaUserIds = new Set(activeMensalistas.map((player) => player.userId).filter(Boolean));

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Acesso restrito</p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Administradores</h1>
          <div className="flex items-center gap-2">
            <Link href="/admins/peladas" className="rounded-[11px] bg-white px-3 py-2 text-xs font-bold text-mata shadow-card">
              Peladas
            </Link>
            {current.role === "MASTER" ? (
              <Link href="/admins/usuarios" className="rounded-[11px] bg-white px-3 py-2 text-xs font-bold text-mata shadow-card">
                Usuarios
              </Link>
            ) : null}
          </div>
        </div>
        <p className="mt-1 text-sm text-musgo">Gerencie quem pode administrar esta pelada.</p>
      </div>

      {query?.error ? (
        <p className="mb-3 rounded-[11px] bg-[#FBE9E6] p-3 text-sm font-semibold text-ausente">{query.error}</p>
      ) : null}

      {!canManageAdmins ? (
        <Card className="mb-3 border border-craque/30 bg-[#FFF7E6]">
          <p className="text-sm font-semibold text-[#8a5a06]">
            Apenas o presidente da pelada pode alterar permissoes de admin.
          </p>
        </Card>
      ) : null}

      <Card className="mb-3 bg-[#EAF5EC]">
        <p className="text-sm font-semibold text-mata">
          Somente mensalistas ativos podem ser administradores. O criador da pelada permanece como presidente.
        </p>
      </Card>

      <div className="space-y-3">
        {memberships.map((membership) => {
          const user = membership.user;
          const isMaster = user.role === "MASTER";
          const isPresident = membership.role === "PRESIDENTE";
          const isAdmin = isMaster || isPresident || membership.role === "ADMIN";
          const isSelf = user.id === current.id;
          const activeMensalista = activeMensalistaUserIds.has(user.id);
          const canToggle =
            canManageAdmins &&
            !isMaster &&
            !isPresident &&
            !isSelf &&
            (membership.role === "ADMIN" || activeMensalista);

          return (
            <Card key={membership.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {isAdmin ? (
                    <ShieldCheck size={18} className={isPresident || isMaster ? "text-craque" : "text-campo"} />
                  ) : (
                    <User size={18} className="text-musgo" />
                  )}
                  <h2 className="truncate font-bold">{user.name || user.email}</h2>
                </div>
                <p className="truncate text-sm text-musgo">{user.email}</p>
                <p className="text-xs text-musgo/70">
                  {isMaster ? "Master" : isPresident ? "Presidente" : isAdmin ? "Administrador" : "Jogador"}
                  {isSelf ? " - voce" : ""}
                  {!activeMensalista && !isPresident ? " - nao e mensalista ativo" : ""}
                </p>
              </div>
              {!canToggle ? (
                <Switch checked={isAdmin} disabled />
              ) : (
                <form action={toggleAdminRole.bind(null, user.id)}>
                  <Switch checked={isAdmin} />
                </form>
              )}
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
