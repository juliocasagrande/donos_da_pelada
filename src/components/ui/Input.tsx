import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
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

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block w-full">
      <select
        className={cn(
          "min-h-11 w-full appearance-none rounded-[13px] border-[1.5px] border-linha bg-white px-3.5 py-2 pr-10 text-sm font-bold text-tinta shadow-card outline-none transition focus:border-campo focus:ring-2 focus:ring-campo/15 disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={17}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-campo"
      />
    </span>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-sm font-semibold text-tinta">{children}</label>;
}
