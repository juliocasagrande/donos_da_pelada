"use client";

import { Trash2 } from "lucide-react";
import { deleteTransaction } from "@/lib/financeActions";

export function DeleteTransactionForm({ transactionId, description }: { transactionId: string; description: string }) {
  return (
    <form
      action={deleteTransaction.bind(null, transactionId)}
      onSubmit={(event) => {
        if (!window.confirm(`Excluir o lancamento "${description}"?`)) {
          event.preventDefault();
        }
      }}
    >
      <button type="submit" className="rounded-[10px] bg-areia p-2 text-musgo" aria-label="Excluir lancamento">
        <Trash2 size={15} />
      </button>
    </form>
  );
}
