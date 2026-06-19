"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type RatingSliderProps = {
  name: string;
  defaultValue?: number;
  label?: string;
  className?: string;
};

export function RatingSlider({ name, defaultValue = 3, label = "Nota", className }: RatingSliderProps) {
  const [rating, setRating] = useState(defaultValue);

  return (
    <div className={cn("rounded-[13px] border-[1.5px] border-linha bg-[#F6F8F3] p-3", className)}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase text-musgo">{label}</span>
        <span className="font-jersey text-2xl font-bold text-campo">{rating.toFixed(1)}</span>
      </div>
      <input type="hidden" name={name} value={rating} />
      <input
        type="range"
        min={0}
        max={5}
        step={0.5}
        value={rating}
        onChange={(event) => setRating(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-campo"
      />
      <div className="mt-2 flex justify-between text-[10px] font-bold text-musgo/70">
        <span>0</span>
        <span>2.5</span>
        <span>5</span>
      </div>
    </div>
  );
}
