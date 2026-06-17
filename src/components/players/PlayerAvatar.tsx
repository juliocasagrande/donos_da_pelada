import Image from "next/image";
import { cn } from "@/lib/utils";

function numberFromName(name: string) {
  const total = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return String((total % 98) + 1).padStart(1, "0");
}

export function PlayerAvatar({
  src,
  name,
  position,
  number,
  size = "md",
  className
}: {
  src?: string | null;
  name: string;
  position?: string;
  number?: string | number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const isGoalkeeper = position === "GOLEIRO";
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl text-white shadow-sm",
        isGoalkeeper ? "bg-[#DC8A1A]" : "bg-mata",
        size === "sm" && "h-10 w-10 text-xl",
        size === "md" && "h-12 w-12 text-2xl",
        size === "lg" && "h-20 w-20 rounded-[22px] text-5xl ring-4 ring-white",
        className
      )}
      title={name}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          className="object-cover"
          sizes={size === "lg" ? "80px" : size === "sm" ? "40px" : "48px"}
        />
      ) : (
        <span className="font-jersey font-bold leading-none">{number ?? numberFromName(name)}</span>
      )}
    </div>
  );
}
