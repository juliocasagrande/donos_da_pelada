"use client";

import { Trash2 } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/forms/ConfirmSubmitButton";
import { deleteTransaction } from "@/lib/financeActions";

export function DeleteTransactionForm({ transactionId, description }: { transactionId: string; description: string }) {
  return (
    <form action={deleteTransaction.bind(null, transactionId)}>
      <ConfirmSubmitButton
        className="min-h-0 rounded-[10px] bg-areia p-2 text-musgo"
        aria-label="Excluir lancamento"
        title="Excluir lancamento"
        confirmLabel="Excluir"
        confirmVariant="danger"
        pendingLabel="Excluindo..."
        message={`Excluir o lancamento "${description}"? Esta acao nao pode ser desfeita.`}
      >
        <Trash2 size={15} />
      </ConfirmSubmitButton>
    </form>
  );
}