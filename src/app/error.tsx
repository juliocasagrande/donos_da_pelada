"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-areia p-6">
      <div className="w-full max-w-sm rounded-card bg-white p-6 text-center shadow-card">
        <p className="text-lg font-bold text-tinta">Algo deu errado</p>
        <p className="mt-2 text-sm text-musgo">
          Nao foi possivel carregar esta pagina agora. Verifique sua conexao e tente novamente em alguns instantes.
        </p>
        <Button type="button" className="mt-4 w-full" onClick={reset}>
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}
