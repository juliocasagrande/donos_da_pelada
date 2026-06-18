import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PeladaCrest } from "@/components/ui/PeladaCrest";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { requestJoinPelada } from "@/lib/peladaOnboardingActions";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function BuscarPeladaPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !user.active) redirect("/login");
  const { q } = await searchParams;
  const query = (q || "").trim();

  const [results, memberships, pendingRequests] = await Promise.all([
    query
      ? prisma.pelada.findMany({
          where: { name: { contains: query, mode: "insensitive" } },
          take: 20,
          orderBy: { name: "asc" },
          include: { _count: { select: { memberships: true } } }
        })
      : Promise.resolve([]),
    prisma.peladaMembership.findMany({ where: { userId: user.id }, select: { peladaId: true } }),
    prisma.peladaJoinRequest.findMany({ where: { userId: user.id, status: "PENDING" }, select: { peladaId: true } })
  ]);

  const memberPeladaIds = new Set(memberships.map((membership) => membership.peladaId));
  const pendingPeladaIds = new Set(pendingRequests.map((request) => request.peladaId));

  return (
    <AppShell>
      <div className="mb-5 flex items-center gap-3">
        <Link href="/peladas" className="text-tinta">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-display text-2xl font-extrabold tracking-[-.02em]">Entrar numa pelada</h1>
      </div>

      <Card className="mb-1 p-0">
        <form className="flex items-center gap-2 rounded-card border-[1.5px] border-linha bg-white px-3.5 py-1 focus-within:border-campo">
          <Search size={18} className="text-musgo" />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Society do Zé"
            className="min-h-0 border-0 bg-transparent p-0 py-2 focus:border-0"
          />
        </form>
      </Card>

      {query ? (
        <p className="mb-3 mt-2 px-1 text-xs text-musgo">
          {results.length} {results.length === 1 ? "pelada encontrada" : "peladas encontradas"}
        </p>
      ) : null}

      <div className="mt-3 space-y-2">
        {results.map((pelada) => {
          const isMember = memberPeladaIds.has(pelada.id);
          const isPending = pendingPeladaIds.has(pelada.id);
          return (
            <Card key={pelada.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <PeladaCrest size={46} />
                <div className="min-w-0">
                  <h2 className="truncate font-bold">{pelada.name}</h2>
                  <p className="text-xs text-musgo">{pelada._count.memberships} jogadores</p>
                </div>
              </div>
              {isMember ? (
                <span className="shrink-0 rounded-[10px] bg-[#EAF5EC] px-3 py-2 text-xs font-bold text-campo">Você é membro</span>
              ) : isPending ? (
                <span className="flex shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-bold text-[#C58207]">
                  <Clock size={14} /> Pendente
                </span>
              ) : (
                <form action={requestJoinPelada.bind(null, pelada.id)}>
                  <SubmitButton className="py-2 text-xs" pendingLabel="Enviando...">
                    Pedir entrada
                  </SubmitButton>
                </form>
              )}
            </Card>
          );
        })}
        {query && !results.length ? (
          <Card className="border border-dashed border-[#C7CDC0] bg-[#F6F8F3] text-center">
            <p className="text-sm text-musgo">Não achou seu grupo?</p>
            <Link href="/peladas/criar" className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-mata">
              <Plus size={14} /> Criar uma pelada nova
            </Link>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
