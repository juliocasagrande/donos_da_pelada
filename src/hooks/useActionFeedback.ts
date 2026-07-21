"use client";

import { useActionState, useEffect } from "react";
import { useToast } from "@/components/ui/ToastProvider";

type ActionState = { ok: boolean; error?: string };
type SuccessState<TState extends ActionState> = Extract<TState, { ok: true }>;

/**
 * Wraps useActionState with the toast-on-result pattern repeated across the
 * app's action forms: show an error toast on failure, optionally a success
 * toast and/or a side effect on success.
 */
export function useActionFeedback<TState extends ActionState>(
  action: (prevState: TState | null, formData: FormData) => TState | Promise<TState>,
  options: {
    successMessage?: string | ((state: SuccessState<TState>) => string);
    onSuccess?: (state: SuccessState<TState>) => void;
  } = {}
) {
  const toast = useToast();
  const [state, formAction, isPending] = useActionState<TState | null, FormData>(action, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      const successState = state as SuccessState<TState>;
      const message = typeof options.successMessage === "function" ? options.successMessage(successState) : options.successMessage;
      if (message) toast.success(message);
      options.onSuccess?.(successState);
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return [state, formAction, isPending] as const;
}
