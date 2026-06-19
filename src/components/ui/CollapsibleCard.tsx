"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Radar, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const icons = {
  radar: Radar,
  userPlus: UserPlus
} as const;

export function CollapsibleCard({
  title,
  description,
  icon,
  badge,
  defaultOpen = false,
  className,
  children
}: {
  title: string;
  description?: string;
  icon?: keyof typeof icons;
  badge?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = icon ? icons[icon] : null;

  return (
    <Card className={cn("p-0", className)}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-3 p-4 text-left">
        {Icon ? <Icon size={18} className="shrink-0 text-campo" /> : null}
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <p className="text-sm text-musgo">{open ? description : "Clique para expandir informacoes."}</p>
        </div>
        {badge}
        <ChevronDown size={18} className={cn("shrink-0 text-musgo transition", open && "rotate-180")} />
      </button>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </Card>
  );
}
