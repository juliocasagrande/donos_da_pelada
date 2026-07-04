"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SeasonDeleteSelectProps = {
  years: number[];
  defaultYear: number;
};

export function SeasonDeleteSelect({ years, defaultYear }: SeasonDeleteSelectProps) {
  const [open, setOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(years.includes(defaultYear) ? defaultYear : years[0]);

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <input type="hidden" name="year" value={selectedYear} />
      <span className="mb-1 block text-xs font-semibold text-musgo">Temporada para excluir</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-3 rounded-[13px] border-[1.5px] bg-white px-3.5 py-2 text-left text-sm font-bold text-tinta shadow-card outline-none transition",
          open ? "border-campo ring-2 ring-campo/15" : "border-linha"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selectedYear}</span>
        <ChevronDown size={17} className={cn("shrink-0 text-campo transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-[13px] border-[1.5px] border-campo bg-white p-1 shadow-card">
          <div className="max-h-64 overflow-auto" role="listbox">
            {years.map((year) => {
              const selected = year === selectedYear;
              return (
                <button
                  key={year}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSelectedYear(year);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex min-h-10 w-full items-center rounded-[10px] px-3 text-left text-sm font-bold transition",
                    selected ? "bg-campo text-white" : "text-tinta hover:bg-[#EAF5EC] hover:text-mata"
                  )}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}