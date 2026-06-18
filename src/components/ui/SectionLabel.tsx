import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function SectionLabel({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo", className)}
      {...props}
    />
  );
}
