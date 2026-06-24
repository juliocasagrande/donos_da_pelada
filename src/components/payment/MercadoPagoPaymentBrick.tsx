"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CreditCard } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/financeUtils";
import { PLAN_PRICES, type PlanInterval } from "@/lib/plan";
import { useToast } from "@/components/ui/ToastProvider";

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => {
      bricks: () => {
        create: (type: string, container: string, settings: Record<string, unknown>) => Promise<{ unmount: () => void }>;
      };
    };
  }
}

function loadMercadoPagoSdk() {
  return new Promise<void>((resolve, reject) => {
    if (window.MercadoPago) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src="https://sdk.mercadopago.com/js/v2"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export function MercadoPagoPaymentBrick({ interval }: { interval: PlanInterval }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const brickRef = useRef<{ unmount: () => void } | null>(null);
  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
  const plan = PLAN_PRICES[interval];

  useEffect(() => {
    let cancelled = false;

    async function mountBrick() {
      setError(null);
      setLoading(true);
      brickRef.current?.unmount();
      brickRef.current = null;

      if (!publicKey) {
        setError("Chave publica do Mercado Pago nao configurada.");
        setLoading(false);
        return;
      }

      try {
        await loadMercadoPagoSdk();
        if (cancelled || !window.MercadoPago) return;

        const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        const bricksBuilder = mp.bricks();
        brickRef.current = await bricksBuilder.create("payment", "paymentBrick_container", {
          initialization: {
            amount: plan.amount
          },
          customization: {
            paymentMethods: {
              creditCard: "all",
              debitCard: "none",
              ticket: "none",
              bankTransfer: "none",
              maxInstallments: 5
            },
            visual: {
              style: {
                theme: "default"
              }
            }
          },
          callbacks: {
            onReady: () => setLoading(false),
            onError: (brickError: unknown) => {
              console.error("Erro no Brick do Mercado Pago:", brickError);
              setError("Nao foi possivel carregar o pagamento. Tente novamente.");
              setLoading(false);
            },
            onSubmit: async ({ formData }: { formData: Record<string, unknown> }) => {
              setError(null);
              try {
                const response = await fetch("/api/mercadopago/authorize", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ interval, formData })
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok || !result.ok) {
                  const message = result.error || "Nao foi possivel validar o cartao. Revise os dados e tente novamente.";
                  setError(message);
                  toast.error(message);
                  return;
                }
                window.location.href = result.url || `/pagamento?flow=sucesso&plano=${interval}`;
              } catch {
                const message = "Nao foi possivel falar com o Mercado Pago. Verifique sua conexao e tente novamente.";
                setError(message);
                toast.error(message);
              }
            }
          }
        });
      } catch (sdkError) {
        console.error("Erro ao carregar SDK do Mercado Pago:", sdkError);
        if (!cancelled) {
          setError("Nao foi possivel carregar o Mercado Pago. Verifique sua conexao e tente novamente.");
          setLoading(false);
        }
      }
    }

    mountBrick();
    return () => {
      cancelled = true;
      brickRef.current?.unmount();
      brickRef.current = null;
    };
  }, [interval, plan.amount, publicKey, toast]);

  return (
    <div className="rounded-[18px] border-[1.5px] border-campo bg-white p-[15px] shadow-[0_8px_22px_rgba(27,158,75,.12)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-display text-base font-extrabold text-tinta">
            <CreditCard size={18} className="text-campo" /> Dados de pagamento
          </div>
          <p className="mt-1 text-xs text-musgo">Plano {plan.label} - ate 5x no cartao</p>
        </div>
        <div className="shrink-0 rounded-[10px] bg-[#EAF5EC] px-2.5 py-1 text-xs font-bold text-campo">
          {formatCurrencyBRL(plan.amount)}
        </div>
      </div>

      {loading ? (
        <div className="mb-3 rounded-[13px] bg-areia px-3 py-2 text-center text-xs font-semibold text-musgo">
          Carregando pagamento seguro...
        </div>
      ) : null}
      {error ? (
        <div className="mb-3 flex items-start gap-2 rounded-[13px] border border-ausente/20 bg-ausente/10 px-3 py-2 text-xs font-semibold text-ausente">
          <AlertTriangle size={15} className="mt-px shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      <div id="paymentBrick_container" />
    </div>
  );
}