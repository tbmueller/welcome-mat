"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/apiClient";

interface Prediction {
  description: string;
  placeId: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function AddressAutocomplete({ value, onChange, onSelect, placeholder, required, className }: Props) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 2) {
      setPredictions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get<{ predictions: Prediction[] }>(
          `/api/places/autocomplete?input=${encodeURIComponent(val)}`
        );
        setPredictions(res.predictions);
        setOpen(res.predictions.length > 0);
      } catch {
        setPredictions([]);
        setOpen(false);
      }
    }, 300);
  }

  function handleSelect(description: string) {
    onSelect(description);
    setPredictions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => predictions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute z-[200] mt-1 w-full rounded-lg border border-taupe-200 bg-white py-1 shadow-lg dark:border-taupe-700 dark:bg-taupe-800">
          {predictions.map((p) => (
            <li key={p.placeId}>
              <button
                type="button"
                onMouseDown={() => handleSelect(p.description)}
                className="w-full px-3 py-2 text-left text-sm text-taupe-700 hover:bg-taupe-50 dark:text-taupe-300 dark:hover:bg-taupe-700"
              >
                {p.description}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
