"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = {
  id: string;
  name: string;
};

export function RankingPeladaSelect({
  options,
  activeValue
}: {
  options: Option[];
  activeValue: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pelada", value);
    router.push(`/rankings?${params.toString()}`);
  }

  return (
    <label className="mb-3 block">
      <span className="mb-1.5 block font-jersey text-xs font-semibold uppercase tracking-[.1em] text-[#8a857a]">
        Escopo
      </span>
      <select
        value={activeValue}
        onChange={(event) => handleChange(event.target.value)}
        className="h-11 w-full rounded-[13px] border-[1.5px] border-linha bg-white px-3 text-sm font-bold text-tinta shadow-card outline-none focus:border-campo"
      >
        <option value="todas">Todas as minhas peladas</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
