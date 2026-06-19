import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-areia p-6">
      <Card className="w-full max-w-sm p-6 text-center">
        <p className="text-lg font-bold text-tinta">Nao foi possivel entrar</p>
        <p className="mt-2 text-sm text-musgo">
          Verifique seu email e senha e tente novamente. Se o problema continuar, aguarde alguns instantes e tente
          de novo.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[13px] bg-campo px-5 py-2.5 text-sm font-semibold text-white shadow-button transition active:scale-[.98]"
        >
          Voltar ao login
        </Link>
      </Card>
    </main>
  );
}
