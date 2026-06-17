import type { HTMLAttributes } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  active?: boolean;
  variant?: "default" | "craque";
};

export function Chip({ active, variant = "default", className, children, ...props }: ChipProps) {
  if (variant === "craque") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg bg-[#FCEFD6] px-2.5 py-1.5 text-xs font-bold text-[#8a5a06]",
          className
        )}
        {...props}
      >
        <Star size={13} fill="#F4A11A" className="text-craque" />
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[9px] px-3.5 py-1.5 text-sm font-semibold",
        active ? "bg-campo text-white" : "bg-white text-musgo",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
