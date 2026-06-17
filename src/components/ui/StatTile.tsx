import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatTileProps = {
  icon: LucideIcon;
  value: string | number;
  label: string;
  accent?: "green" | "yellow";
  className?: string;
};

export function StatTile({ icon: Icon, value, label, accent = "green", className }: StatTileProps) {
  return (
    <div className={cn("animate-card rounded-card bg-white p-3.5 shadow-card", className)}>
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-[9px]",
          accent === "green" ? "bg-[#EAF5EC] text-campo" : "bg-[#FCEFD6] text-craque"
        )}
      >
        <Icon size={16} />
      </div>
      <div className="mt-2 font-jersey text-3xl font-bold leading-none text-tinta">{value}</div>
      <div className="mt-0.5 text-xs text-musgo">{label}</div>
    </div>
  );
}
