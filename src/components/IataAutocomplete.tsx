"use client";

import { useEffect, useRef, useState } from "react";
import { searchAirports, type Airport } from "@/lib/airports";

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}

export function IataAutocomplete({ value, onChange, className, required }: Props) {
  const [results, setResults] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
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
    const val = e.target.value.toUpperCase().slice(0, 3);
    onChange(val);
    const hits = searchAirports(val);
    setResults(hits);
    setOpen(hits.length > 0);
  }

  function handleSelect(airport: Airport) {
    onChange(airport.iata);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        maxLength={3}
        className={className}
        required={required}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute z-[200] mt-1 w-full min-w-[280px] rounded-lg border border-taupe-200 bg-white py-1 shadow-lg dark:border-taupe-700 dark:bg-taupe-800">
          {results.map((a) => (
            <li key={a.iata}>
              <button
                type="button"
                onMouseDown={() => handleSelect(a)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-taupe-50 dark:hover:bg-taupe-700"
              >
                <span className="w-10 shrink-0 font-mono text-sm font-semibold text-[var(--accent-11)]">
                  {a.iata}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-taupe-800 dark:text-taupe-200">{a.city}</span>
                  <span className="block truncate text-xs text-taupe-400 dark:text-taupe-500">{a.name}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
