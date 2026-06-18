import { ShieldCheck, User } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { toggleAdminRole } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/session";

export default async function AdminsPage() {
  const current = await requireMaster();
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }]
  });

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Acesso restrito</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Administradores</h1>
        <p className="mt-1 text-sm text-musgo">Ative o botao para tornar um usuario administrador.</p>
      </div>

      <div className="space-y-3">
        {users.map((user) => {
          const isAdmin = user.role === "ADMIN" || user.role === "MASTER";
          const isMaster = user.role === "MASTER";
          const isSelf = user.id === current.id;

          return (
            <Card key={user.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {isAdmin ? (
                    <ShieldCheck size={18} className={isMaster ? "text-craque" : "text-campo"} />
                  ) : (
                    <User size={18} className="text-musgo" />
                  )}
                  <h2 className="truncate font-bold">{user.name || user.email}</h2>
                </div>
                <p className="truncate text-sm text-musgo">{user.email}</p>
                <p className="text-xs text-musgo/70">
                  {isMaster ? "Master" : isAdmin ? "Administrador" : "Jogador"}
                  {isSelf ? " · voce" : ""}
                </p>
              </div>
              {isMaster || isSelf ? (
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
