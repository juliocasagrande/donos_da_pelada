import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-[13px] px-5 py-2.5 text-sm font-semibold transition active:scale-[.98] disabled:opacity-50",
        variant === "primary" && "bg-campo text-white shadow-button",
        variant === "secondary" && "border-[1.5px] border-linha bg-white text-tinta",
        variant === "danger" && "bg-ausente text-white",
        variant === "ghost" && "border-[1.5px] border-linha bg-white/70 text-tinta",
        className
      )}
      {...props}
    />
  );
}
