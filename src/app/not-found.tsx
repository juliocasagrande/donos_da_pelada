import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <main className="light-field-lines flex min-h-screen items-center bg-areia px-4 text-tinta">
      <Card className="mx-auto max-w-md text-center">
        <h1 className="font-display text-3xl font-extrabold">Pagina nao encontrada</h1>
        <p className="mt-2 text-musgo">O lance saiu pela lateral.</p>
        <Link href="/dashboard" className="mt-4 block"><Button>Voltar ao inicio</Button></Link>
      </Card>
    </main>
  );
}
