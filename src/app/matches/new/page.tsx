import { AppShell } from "@/components/layout/AppShell";
import { MatchForm } from "@/components/forms/MatchForm";
import { Card } from "@/components/ui/Card";
import { createMatch } from "@/lib/actions";
import { isPeladaIdPro } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function NewMatchPage() {
  const admin = await requireAdmin();
  const allowAmistoso = await isPeladaIdPro(admin.peladaId!);
  const recentMatches = await prisma.match.findMany({
    where: { peladaId: admin.peladaId!, deletedAt: null, location: { not: null } },
    select: { location: true },
    orderBy: { date: "desc" },
    take: 12
  });
  const recentLocations = [...new Set(recentMatches.map((match) => match.location).filter((location): location is string => Boolean(location)))].slice(0, 3);

  return (
    <AppShell>
      <div className="mb-5"><p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Organizacao</p><h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Nova pelada</h1></div>
      <Card className="mx-auto max-w-md">
        <MatchForm action={createMatch} submitLabel="Criar pelada" allowAmistoso={allowAmistoso} recentLocations={recentLocations} />
      </Card>
    </AppShell>
  );
}
