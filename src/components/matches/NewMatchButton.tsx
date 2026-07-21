"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { MatchForm } from "@/components/forms/MatchForm";
import type { MatchDefaults } from "@/lib/matchDefaults";

type NewMatchButtonProps = {
  action: (formData: FormData) => void | Promise<void>;
  defaults: MatchDefaults | null;
  allowAmistoso: boolean;
  recentLocations: string[];
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
};

export function NewMatchButton({ action, defaults, allowAmistoso, recentLocations, className, ariaLabel, children }: NewMatchButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} aria-label={ariaLabel}>
        {children}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova pelada">
        <MatchForm
          action={action}
          defaults={defaults ?? undefined}
          submitLabel="Criar pelada"
          allowAmistoso={allowAmistoso}
          recentLocations={recentLocations}
        />
      </Modal>
    </>
  );
}
