function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-[13px] bg-linha/70 ${className ?? ""}`} />;
}

export function AppShellSkeleton() {
  return (
    <div className="light-field-lines relative min-h-screen bg-areia pb-32 text-tinta">
      <div className="relative overflow-hidden">
        <header className="sticky top-0 z-20 bg-areia/95 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center gap-2.5 px-5 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-craque shadow-[0_6px_14px_rgba(244,161,26,.3)]">
              <span className="relative h-[18px] w-[18px] rounded-full border-2 border-mata">
                <span className="absolute left-[-2px] right-[-2px] top-1/2 h-[2px] -translate-y-1/2 bg-mata" />
              </span>
            </div>
            <Pulse className="h-9 flex-1 rounded-[11px]" />
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-[11px] bg-mata/40" />
          </div>
        </header>

      </div>

      <div className="fixed inset-0 z-10 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="soccer-ball pulse-dot h-14 w-14" />
        <p className="mt-4 font-jersey text-xs font-semibold uppercase tracking-[.16em] text-musgo">
          Carregando...
        </p>
      </div>

      <nav className="fixed inset-x-0 bottom-4 z-30 px-5" aria-hidden="true">
        <div className="mx-auto grid max-w-md grid-cols-4 rounded-full border border-linha bg-white/90 px-3 py-2 shadow-[0_14px_36px_rgba(27,158,75,.28)] backdrop-blur">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex min-h-12 flex-col items-center justify-center gap-1">
              <div className="h-[22px] w-[22px] animate-pulse rounded-full bg-linha" />
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
