"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

type ConfirmSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  message: string;
  pendingLabel?: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
};

export function ConfirmSubmitButton({
  children,
  message,
  pendingLabel = "Aguarde...",
  title = "Confirmar acao",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "primary",
  className,
  disabled,
  onClick,
  ...props
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<HTMLFormElement | null>(null);

  function close() {
    if (!pending) setOpen(false);
  }

  return (
    <>
      <button
        {...props}
        type="button"
        className={cn(
          "inline-flex min-h-10 items-center justify-center gap-2 rounded-[13px] px-5 py-2.5 text-sm font-semibold transition active:scale-[.98] disabled:opacity-50",
          className
        )}
        disabled={pending || disabled}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          setForm(event.currentTarget.form);
          setOpen(true);
        }}
      >
        {pending ? pendingLabel : children}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-tinta/45 px-4 py-6" role="presentation">
          <div
            className="w-full max-w-sm rounded-[18px] border-[1.5px] border-linha bg-[#F6F8F3] p-4 shadow-[0_24px_70px_rgba(17,40,28,.28)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
          >
            <div className="mb-3 flex items-start gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]",
                  confirmVariant === "danger" ? "bg-ausente text-white" : "bg-campo text-white"
                )}
              >
                <AlertTriangle size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="confirm-dialog-title" className="text-base font-extrabold text-tinta">
                  {title}
                </h2>
                <p className="mt-1 text-sm font-semibold leading-5 text-musgo">{message}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="inline-flex min-h-11 items-center justify-center rounded-[13px] border-[1.5px] border-linha bg-white px-4 text-sm font-bold text-tinta shadow-card transition active:scale-[.98] disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  form?.requestSubmit();
                }}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center rounded-[13px] px-4 text-sm font-bold text-white transition active:scale-[.98] disabled:opacity-50",
                  confirmVariant === "danger" ? "bg-ausente" : "bg-campo shadow-button"
                )}
              >
                {pending ? pendingLabel : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}