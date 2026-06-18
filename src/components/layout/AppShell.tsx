import Link from "next/link";
import { LogOut, Shield } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { PushNotificationsMount } from "@/components/layout/PushNotificationsMount";
import { getCurrentUser } from "@/lib/session";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "MASTER" || user?.role === "ADMIN";

  return (
    <div className="light-field-lines relative min-h-screen overflow-hidden bg-areia pb-32 text-tinta">
      <span className="soccer-ball app-ball-bg" aria-hidden="true" />
      <span className="soccer-ball app-ball-bg" aria-hidden="true" />
      <header className="sticky top-0 z-20 bg-gradient-to-r from-mata to-campo text-white shadow-[0_8px_24px_rgba(11,74,41,.18)]">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <Link href="/dashboard" className="font-display text-xl font-extrabold tracking-[-.02em] text-white">
            Dono da <span className="text-craque">Pelada</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-white/80">
            {user?.role === "MASTER" ? <Shield size={16} className="text-craque" /> : null}
            <Link href="/perfil" className="max-w-28 truncate transition hover:text-white" title="Meu perfil">
              {user?.name || user?.email}
            </Link>
            <Link href="/logout" className="rounded-[12px] bg-white/95 p-2 text-mata shadow-card" title="Sair">
              <LogOut size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-md px-5 py-5">
        <PushNotificationsMount />
        {children}
      </main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
