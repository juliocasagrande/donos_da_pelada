import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  PRESIDENTE: "PRESIDENTE",
  ADMIN: "ADMIN",
  JOGADOR: "JOGADOR"
};

export function RoleBadge({ role, className }: { role: string; className?: string }) {
  const isPresidente = role === "PRESIDENTE";

  return (
    <span
      className={cn(
        "rounded-[5px] px-1.5 py-0.5 text-[10px] font-bold",
        isPresidente ? "bg-[#FCEFD6] text-[#8a5a06]" : "bg-[#EAF5EC] text-mata",
        className
      )}
    >
      {ROLE_LABELS[role] || role}
    </span>
  );
}
