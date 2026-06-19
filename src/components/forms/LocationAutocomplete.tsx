"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";

export function LocationAutocomplete({
  defaultValue = "",
  name = "location",
  quickSuggestions = []
}: {
  defaultValue?: string;
  name?: string;
  quickSuggestions?: string[];
}) {
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const skipNextFetch = useRef(true);
  const focused = useRef(false);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }

    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/geocode?q=${encodeURIComponent(value)}`)
        .then((response) => response.json())
        .then((data) => {
          setSuggestions(data.results || []);
          if (focused.current) setOpen(true);
        })
        .catch(() => setSuggestions([]));
    }, 450);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  return (
    <div className="relative space-y-2">
      <Input
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => {
          focused.current = true;
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => {
          focused.current = false;
          setTimeout(() => setOpen(false), 150);
        }}
        placeholder="Society do Ze - Rua das Quadras"
        autoComplete="off"
      />
      {quickSuggestions.length ? (
        <div className="flex flex-wrap gap-1.5">
          {quickSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="rounded-[9px] border border-linha bg-white px-2.5 py-1.5 text-left text-[11px] font-bold text-musgo shadow-sm"
              onClick={() => {
                skipNextFetch.current = true;
                setValue(suggestion);
                setSuggestions([]);
                setOpen(false);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
      {open && suggestions.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-[13px] border-[1.5px] border-linha bg-white shadow-card">
          {suggestions.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-areia"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  skipNextFetch.current = true;
                  setValue(suggestion);
                  setSuggestions([]);
                  setOpen(false);
                }}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
