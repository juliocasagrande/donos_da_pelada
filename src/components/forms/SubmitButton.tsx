"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

export function SubmitButton({
  children,
  pendingLabel = "Salvando...",
  className,
  disabled = false
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button className={className} type="submit" disabled={pending || disabled}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
