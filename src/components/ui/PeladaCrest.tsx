import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export function PeladaCrest({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-mata to-campo", className)}
      style={{ width: size, height: size }}
    >
      <Shield className="text-white" size={Math.round(size * 0.55)} strokeWidth={2} />
    </div>
  );
}
