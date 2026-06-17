"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

export function SubmitButton({
  children,
  pendingLabel = "Salvando...",
  className
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button className={className} type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
