import { cn } from "@/lib/utils";

export function Switch({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  return (
    <button
      type="submit"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40",
        checked ? "bg-campo" : "bg-areia"
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "left-6" : "left-1"
        )}
      />
    </button>
  );
}
