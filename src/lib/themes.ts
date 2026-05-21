export type ThemeName = "indigo" | "emerald" | "violet" | "mauve";

interface ThemeDef {
  accent: string;
  gray: string;
  swatch: string;
  label: string;
}

export const THEMES: Record<ThemeName, ThemeDef> = {
  indigo:  { accent: "indigo",  gray: "slate", swatch: "#3e63dd", label: "Indigo"  },
  emerald: { accent: "green",   gray: "sage",  swatch: "#46a758", label: "Emerald" },
  violet:  { accent: "violet",  gray: "mauve", swatch: "#8e4ec6", label: "Violet"  },
  mauve:   { accent: "plum",    gray: "mauve", swatch: "#ab4aba", label: "Mauve"   },
};

export const DEFAULT_THEME: ThemeName = "indigo";
export const THEME_STORAGE_KEY = "welcomemat-theme";
