"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Radar, Trophy, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const baseItems = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/players", label: "Jogadores", icon: Users },
  { href: "/matches", label: "Peladas", icon: CalendarDays },
  { href: "/rankings", label: "Rankings", icon: Trophy }
];

const financeItem = { href: "/financeiro", label: "Financeiro", icon: Wallet };
const radarItem = { href: "/radar", label: "Radar", icon: Radar };

export function BottomNav({ isAdmin = false, showRadar = false }: { isAdmin?: boolean; showRadar?: boolean }) {
  const pathname = usePathname();
  const items = [...baseItems, ...(showRadar ? [radarItem] : []), ...(isAdmin ? [financeItem] : [])];

  return (
    <nav className="fixed inset-x-0 bottom-4 z-30 px-5">
      <div
        className={cn(
          "mx-auto grid max-w-md rounded-full border border-linha bg-white/90 px-3 py-2 shadow-[0_14px_36px_rgba(27,158,75,.28)] backdrop-blur",
          items.length === 6 ? "grid-cols-6" : items.length === 5 ? "grid-cols-5" : "grid-cols-4"
        )}
      >
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-full text-[10px] transition",
                active ? "bg-[#EAF5EC] font-bold text-campo" : "font-medium text-[#A7AFA1]"
              )}
            >
              <item.icon size={22} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
