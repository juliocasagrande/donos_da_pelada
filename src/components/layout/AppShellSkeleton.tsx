import { BottomNav } from "@/components/layout/BottomNav";

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

        <main className="relative z-10 mx-auto max-w-md px-5 py-5">
          <Pulse className="h-6 w-40" />
          <Pulse className="mt-4 h-28 w-full" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Pulse className="h-20" />
            <Pulse className="h-20" />
            <Pulse className="h-20" />
            <Pulse className="h-20" />
          </div>
          <Pulse className="mt-4 h-24 w-full" />
          <Pulse className="mt-3 h-24 w-full" />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
