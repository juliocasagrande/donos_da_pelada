import Link from "next/link";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function ProLockedCard({ feature }: { feature: string }) {
  return (
    <Card className="mb-4 border border-craque/30 bg-[#FFF7E6] text-center">
      <Lock className="mx-auto mb-2 text-craque" size={28} />
      <h2 className="font-display text-lg font-extrabold">{feature} e exclusivo do plano Pro</h2>
      <p className="mt-1 text-sm text-musgo">
        Assine o Pro para liberar {feature.toLowerCase()} e outras funcionalidades da sua pelada.
      </p>
      <Link href="/pagamento" className="mt-4 block">
        <Button type="button" className="w-full">Ver planos Pro</Button>
      </Link>
    </Card>
  );
}
