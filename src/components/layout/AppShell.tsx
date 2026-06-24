import Link from "next/link";
import { Clock } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { PeladaSwitcher } from "@/components/layout/PeladaSwitcher";
import { PushNotificationsMount } from "@/components/layout/PushNotificationsMount";
import { enforceFreeTierMensalistaLimit } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isPeladaAdmin } from "@/lib/session";

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isAdmin = isPeladaAdmin(user);
  if (user?.peladaId) {
    await enforceFreeTierMensalistaLimit(user.peladaId);
  }
  const memberships = user
    ? await prisma.peladaMembership.findMany({
        where: { userId: user.id },
        include: {
          pelada: { select: { id: true, name: true, _count: { select: { memberships: true } } } }
        },
        orderBy: { createdAt: "asc" }
      })
    : [];
  const activePelada = user?.peladaId
    ? await prisma.pelada.findUnique({
        where: { id: user.peladaId },
        select: { plan: true, proRenewsAt: true }
      })
    : null;
  const proDaysLeft = activePelada?.plan === "PRO" && activePelada.proRenewsAt ? daysUntil(activePelada.proRenewsAt) : null;
  const showProExpiryNotice = isAdmin && proDaysLeft !== null && proDaysLeft >= 0 && proDaysLeft <= 15;
  const displayName = user?.name || user?.email || "";

  return (
    <div className="light-field-lines relative min-h-screen overflow-hidden bg-areia pb-32 text-tinta">
      <span className="soccer-ball app-ball-bg" aria-hidden="true" />
      <span className="soccer-ball app-ball-bg" aria-hidden="true" />
      <header className="sticky top-0 z-20 bg-areia/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-2.5 px-5 py-3">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-craque shadow-[0_6px_14px_rgba(244,161,26,.3)]"
            title="Donos da Pelada"
          >
            <span className="relative h-[18px] w-[18px] rounded-full border-2 border-mata">
              <span className="absolute left-[-2px] right-[-2px] top-1/2 h-[2px] -translate-y-1/2 bg-mata" />
            </span>
          </Link>

          {user?.peladaId && memberships.length ? (
            <PeladaSwitcher
              peladas={memberships.map((membership) => ({
                id: membership.pelada.id,
                name: membership.pelada.name,
                role: membership.role,
                memberCount: membership.pelada._count.memberships
              }))}
              activePeladaId={user.peladaId}
            />
          ) : (
            <span className="flex-1" />
          )}

          <Link
            href="/perfil"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-mata font-jersey text-base font-bold text-white"
            title={displayName || "Meu perfil"}
          >
            {(displayName || "?").charAt(0).toUpperCase()}
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-md px-5 py-5">
        <PushNotificationsMount
          promptDismissed={Boolean(user?.pushPromptDismissed)}
          notificationsEnabled={Boolean(user?.pushNotificationsEnabled)}
        />
        {showProExpiryNotice ? (
          <Link
            href="/pagamento"
            className="mb-4 flex items-center gap-2 rounded-[13px] border border-craque/30 bg-[#FFF7E6] px-3 py-2 text-xs font-semibold text-[#8a5a06] shadow-card"
          >
            <Clock size={15} className="shrink-0" />
            <span className="flex-1">
              Pro vence {proDaysLeft === 0 ? "hoje" : `em ${proDaysLeft} dias`}. Toque para renovar o periodo.
            </span>
          </Link>
        ) : null}
        {children}
      </main>
      <BottomNav isAdmin={isAdmin} showRadar={Boolean(user?.radarEnabled)} />
    </div>
  );
}
