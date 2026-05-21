"use client";

import { CheckIcon } from "@radix-ui/react-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { THEMES, type ThemeName } from "@/lib/themes";

export function ThemeColorPicker() {
  const { themeName, setThemeName } = useTheme();

  return (
    <div className="px-2 py-1.5">
      <p className="mb-2 text-xs text-[var(--gray-11)]">Theme</p>
      <div className="flex gap-1.5">
        {(Object.entries(THEMES) as [ThemeName, (typeof THEMES)[ThemeName]][]).map(([name, def]) => (
          <button
            key={name}
            onClick={() => setThemeName(name)}
            title={def.label}
            className="relative h-6 w-6 rounded-full transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-9)]"
            style={{ backgroundColor: def.swatch }}
            aria-label={def.label}
            aria-pressed={themeName === name}
          >
            {themeName === name && (
              <CheckIcon
                className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
