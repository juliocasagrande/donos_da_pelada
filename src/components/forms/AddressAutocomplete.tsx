"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";

type Suggestion = { label: string; lat: number; lon: number };

export function AddressAutocomplete({
  defaultValue = "",
  defaultLat,
  defaultLon
}: {
  defaultValue?: string;
  defaultLat?: number | null;
  defaultLon?: number | null;
}) {
  const [value, setValue] = useState(defaultValue);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    defaultLat != null && defaultLon != null ? { lat: defaultLat, lon: defaultLon } : null
  );
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const skipNextFetch = useRef(true);
  const focused = useRef(false);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }

    setCoords(null);

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
        name="address"
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
        placeholder="Rua, bairro, cidade"
        autoComplete="off"
      />
      <input type="hidden" name="latitude" value={coords?.lat ?? ""} />
      <input type="hidden" name="longitude" value={coords?.lon ?? ""} />
      {open && suggestions.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-[13px] border-[1.5px] border-linha bg-white shadow-card">
          {suggestions.map((suggestion) => (
            <li key={suggestion.label}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-areia"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  skipNextFetch.current = true;
                  setValue(suggestion.label);
                  setCoords({ lat: suggestion.lat, lon: suggestion.lon });
                  setSuggestions([]);
                  setOpen(false);
                }}
              >
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {!coords && value.trim().length >= 3 ? (
        <p className="text-xs text-musgo">Escolha um endereco da lista para o radar calcular a distancia.</p>
      ) : null}
    </div>
  );
}
