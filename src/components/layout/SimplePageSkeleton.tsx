export function SimplePageSkeleton() {
  return (
    <main className="light-field-lines min-h-screen bg-areia px-5 py-6 text-tinta">
      <div className="mx-auto max-w-md">
        <div className="h-8 w-2/3 animate-pulse rounded-[11px] bg-linha/70" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-[8px] bg-linha/60" />
        <div className="mt-6 h-40 w-full animate-pulse rounded-card bg-linha/70" />
        <div className="mt-4 h-40 w-full animate-pulse rounded-card bg-linha/60" />
      </div>
    </main>
  );
}
