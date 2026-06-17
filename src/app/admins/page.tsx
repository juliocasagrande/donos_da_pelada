import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { createAdmin, toggleAdmin } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/session";

export default async function AdminsPage() {
  const current = await requireMaster();
  const admins = await prisma.user.findMany({
    where: { role: { in: ["MASTER", "ADMIN"] } },
    orderBy: [{ role: "asc" }, { name: "asc" }]
  });

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Acesso restrito</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Administradores</h1>
      </div>
      <div className="grid gap-4">
        <Card>
          <h2 className="mb-3 font-display text-xl font-extrabold">Novo administrador</h2>
          <form action={createAdmin} className="space-y-3">
            <div><Label>Nome</Label><Input name="name" required /></div>
            <div><Label>Email</Label><Input name="email" type="email" required /></div>
            <div><Label>Senha inicial</Label><Input name="password" type="password" minLength={6} required /></div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input name="active" type="checkbox" defaultChecked /> Ativo
            </label>
            <Button className="w-full" type="submit">Criar admin</Button>
          </form>
        </Card>
        <div className="space-y-3">
          {admins.map((admin) => (
            <Card key={admin.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className={admin.role === "MASTER" ? "text-craque" : "text-musgo"} />
                  <h2 className="truncate font-bold">{admin.name}</h2>
                </div>
                <p className="truncate text-sm text-musgo">{admin.email}</p>
                <p className="text-xs text-musgo/70">{admin.role} · {admin.active ? "ativo" : "inativo"}</p>
              </div>
              {admin.role !== "MASTER" && admin.id !== current.id ? (
                <form action={toggleAdmin.bind(null, admin.id)}>
                  <Button type="submit" variant={admin.active ? "danger" : "secondary"}>
                    {admin.active ? "Desativar" : "Ativar"}
                  </Button>
                </form>
              ) : null}
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
