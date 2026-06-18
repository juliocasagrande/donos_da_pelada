"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { PeladaCrest } from "@/components/ui/PeladaCrest";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { setActivePelada } from "@/lib/peladaActions";

type PeladaOption = { id: string; name: string; role: string; memberCount: number };

export function PeladaSwitcher({ peladas, activePeladaId }: { peladas: PeladaOption[]; activePeladaId: string }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const active = peladas.find((pelada) => pelada.id === activePeladaId);

  if (peladas.length <= 1) {
    return (
      <span className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-[13px] border-[1.5px] border-linha bg-white px-3 py-1.5 shadow-card">
        <PeladaCrest size={28} />
        <span className="max-w-36 truncate font-display text-[15px] font-bold text-tinta">{active?.name}</span>
      </span>
    );
  }

  return (
    <div className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full min-w-0 items-center justify-center gap-2 rounded-[13px] border-[1.5px] border-linha bg-white px-3 py-1.5 shadow-card transition active:scale-[.98]"
      >
        <PeladaCrest size={28} />
        <span className="min-w-0 text-left leading-tight">
          <span className="block text-[9px] font-semibold uppercase tracking-[.1em] text-[#A7AFA1]">Pelada ativa</span>
          <span className="block max-w-32 truncate font-display text-[15px] font-bold text-tinta">{active?.name}</span>
        </span>
        <ChevronDown size={16} className="shrink-0 text-campo" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[72vh] overflow-y-auto rounded-[18px] border-[1.5px] border-linha bg-[#F6F8F3] p-3 shadow-[0_18px_40px_rgba(17,40,28,.18)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold tracking-[-.02em]">Suas peladas</h2>
              <span className="text-sm text-musgo">{peladas.length}</span>
            </div>
            <div className="space-y-2">
              {peladas.map((pelada) => {
                const isActive = pelada.id === activePeladaId;
                return (
                  <button
                    key={pelada.id}
                    type="button"
                    disabled={isActive}
                    onClick={() => {
                      startTransition(() => setActivePelada(pelada.id));
                      setOpen(false);
                    }}
                    className={
                      isActive
                        ? "flex w-full items-center gap-3 rounded-2xl border-2 border-campo bg-white p-3 text-left"
                        : "flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-linha bg-white p-3 text-left"
                    }
                  >
                    <PeladaCrest size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-tinta">{pelada.name}</span>
                      <span className="mt-1 flex items-center gap-1.5">
                        <RoleBadge role={pelada.role} />
                        <span className="text-xs text-musgo">{pelada.memberCount} jogadores</span>
                      </span>
                    </span>
                    {isActive ? (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-campo">
                        <Check size={14} className="text-white" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 h-px bg-linha" />
            <div className="mt-4 grid gap-2">
              <Link href="/peladas/criar" className="flex-1" onClick={() => setOpen(false)}>
                <span className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-campo px-4 py-3 text-sm font-bold text-white shadow-button">
                  <Plus size={16} /> Criar nova
                </span>
              </Link>
              <Link href="/peladas/buscar" className="flex-1" onClick={() => setOpen(false)}>
                <span className="flex w-full items-center justify-center gap-2 rounded-[13px] border-[1.5px] border-linha bg-white px-4 py-3 text-sm font-bold text-tinta">
                  <Search size={16} /> Entrar em outra
                </span>
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
