import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-10 w-full rounded-[13px] border-[1.5px] border-linha bg-[#F6F8F3] px-3.5 py-2 text-tinta outline-none placeholder:text-musgo/60 focus:border-campo",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-h-10 w-full rounded-[13px] border-[1.5px] border-linha bg-[#F6F8F3] px-3.5 py-2 text-tinta outline-none focus:border-campo",
        className
      )}
      {...props}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-sm font-semibold text-tinta">{children}</label>;
}
