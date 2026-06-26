import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { setUserPlanManually } from "@/lib/peladaAdminActions";
import { isUserPro, MAX_PRO_PELADAS_PER_USER } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/session";
import { formatDate } from "@/lib/utils";

async function UserRow({ user, peladasCount }: { user: { id: string; name: string | null; email: string | null; plan: string; proRenewsAt: Date | null }; peladasCount: number }) {
  const pro = isUserPro(user);
  return (
    <Card className="space-y-2">
      <div className="flex items-center gap-2">
        {pro ? <ShieldCheck size={18} className="text-craque" /> : null}
        <h2 className="truncate font-bold">{user.name || user.email}</h2>
      </div>
      <p className="text-xs text-musgo">{user.email}</p>
      <p className="text-xs text-musgo/70">
        {pro ? "Pro" : "Free"}
        {user.plan === "PRO_IN_PROGRESS" ? " (em andamento)" : ""}
        {user.proRenewsAt ? ` · Valido ate ${formatDate(user.proRenewsAt)}` : ""}
        {` · ${peladasCount} pelada(s) criada(s)`}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <form action={setUserPlanManually.bind(null, user.id, "PRO")}>
          <Button type="submit" variant="secondary" className="w-full py-2 text-xs">Promover Pro</Button>
        </form>
        <form action={setUserPlanManually.bind(null, user.id, "FREE")}>
          <Button type="submit" variant="secondary" className="w-full py-2 text-xs">Rebaixar Free</Button>
        </form>
      </div>
    </Card>
  );
}

export default async function UsuariosAdminPage({
  searchParams
}: {
  searchParams?: Promise<{ email?: string }>;
}) {
  await requireMaster();
  const query = await searchParams;
  const email = query?.email?.trim();

  const [searchResult, proUsers] = await Promise.all([
    email
      ? prisma.user.findMany({ where: { email: { contains: email, mode: "insensitive" } }, orderBy: { createdAt: "asc" }, take: 10 })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: { OR: [{ plan: { not: "FREE" } }, { mpPaymentId: { not: null } }] },
      orderBy: { createdAt: "asc" }
    })
  ]);

  const allUsers = [...searchResult, ...proUsers.filter((proUser) => !searchResult.some((found) => found.id === proUser.id))];
  const peladaCounts = await prisma.pelada.groupBy({
    by: ["createdByUserId"],
    where: { createdByUserId: { in: allUsers.map((user) => user.id) } },
    _count: { id: true }
  });
  const peladaCountByUserId = new Map(peladaCounts.map((row) => [row.createdByUserId, row._count.id]));

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Acesso restrito</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Usuarios</h1>
        <p className="mt-1 text-sm text-musgo">
          O Pro pertence ao usuario e cobre ate {MAX_PRO_PELADAS_PER_USER} peladas que ele criou.
        </p>
      </div>

      <form action="/admins/usuarios" className="mb-4 flex gap-2">
        <input
          type="text"
          name="email"
          defaultValue={email}
          placeholder="Buscar por e-mail"
          className="w-full rounded-[11px] border border-linha bg-white px-3 py-2 text-sm"
        />
        <Button type="submit" className="px-4 py-2 text-xs">Buscar</Button>
      </form>

      <div className="space-y-3">
        {allUsers.map((user) => (
          <UserRow key={user.id} user={user} peladasCount={peladaCountByUserId.get(user.id) || 0} />
        ))}
        {!allUsers.length ? (
          <Card>
            <p className="text-sm text-musgo">
              {email ? "Nenhum usuario encontrado para esse e-mail." : "Nenhum usuario com plano Pro ou pagamento registrado ainda."}
            </p>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
