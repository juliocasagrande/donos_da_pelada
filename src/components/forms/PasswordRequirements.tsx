"use client";

import { Check, X } from "lucide-react";
import { passwordRequirements } from "@/lib/validations";

export function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="space-y-1 text-xs">
      {passwordRequirements.map((requirement) => {
        const met = requirement.test(password);
        return (
          <li key={requirement.id} className={met ? "flex items-center gap-1.5 text-campo" : "flex items-center gap-1.5 text-musgo"}>
            {met ? <Check size={14} /> : <X size={14} />}
            {requirement.label}
          </li>
        );
      })}
    </ul>
  );
}
