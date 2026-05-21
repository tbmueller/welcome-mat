"use client";

import { useEffect, useRef, useState } from "react";
import { Theme } from "@radix-ui/themes";
import { ThemeContextProvider, useTheme } from "@/contexts/ThemeContext";
import { THEMES } from "@/lib/themes";

function makeFaviconHref(swatch: string): string {
  const n = parseInt(swatch.slice(1), 16);
  const r = Math.round(((n >> 16) & 0xff) * 0.45).toString(16).padStart(2, "0");
  const g = Math.round(((n >> 8) & 0xff) * 0.45).toString(16).padStart(2, "0");
  const b = Math.round((n & 0xff) * 0.45).toString(16).padStart(2, "0");
  const dark = `#${r}${g}${b}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect width="16" height="16" fill="${dark}"/><rect x="1" y="1" width="14" height="14" fill="${swatch}"/><rect x="7" y="3" width="2" height="1" fill="white" opacity="0.55"/><rect x="6" y="4" width="4" height="1" fill="white" opacity="0.55"/><rect x="5" y="5" width="6" height="1" fill="white" opacity="0.55"/><rect x="4" y="6" width="8" height="1" fill="white" opacity="0.55"/><rect x="3" y="7" width="10" height="2" fill="white" opacity="0.55"/><rect x="4" y="9" width="8" height="1" fill="white" opacity="0.55"/><rect x="5" y="10" width="6" height="1" fill="white" opacity="0.55"/><rect x="6" y="11" width="4" height="1" fill="white" opacity="0.55"/><rect x="7" y="12" width="2" height="1" fill="white" opacity="0.55"/><rect x="7" y="7" width="2" height="2" fill="white" opacity="0.85"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Pre-compute favicon data URLs once at module load time — one per theme swatch
const FAVICON_HREFS: Record<string, string> = Object.fromEntries(
  Object.values(THEMES).map(({ swatch }) => [swatch, makeFaviconHref(swatch)])
);

function ThemedApp({ children }: { children: React.ReactNode }) {
  const { themeName } = useTheme();
  const [appearance, setAppearance] = useState<"light" | "dark">("light");
  const { accent, gray, swatch } = THEMES[themeName];
  const faviconLinkRef = useRef<HTMLLinkElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setAppearance(mq.matches ? "dark" : "light");
    const handler = (e: MediaQueryListEvent) => setAppearance(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    // On first run, remove server-injected favicon links (Next.js SSR injects .ico / .svg)
    if (!faviconLinkRef.current) {
      document.head
        .querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]')
        .forEach((el) => el.remove());
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      document.head.appendChild(link);
      faviconLinkRef.current = link;
    }
    // Just swap href — no DOM add/remove, so the browser doesn't re-spin
    faviconLinkRef.current.href = FAVICON_HREFS[swatch];
  }, [swatch]);

  return (
    <Theme
      accentColor={accent as React.ComponentProps<typeof Theme>["accentColor"]}
      grayColor={gray as React.ComponentProps<typeof Theme>["grayColor"]}
      appearance={appearance}
      radius="medium"
    >
      {children}
    </Theme>
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContextProvider>
      <ThemedApp>{children}</ThemedApp>
    </ThemeContextProvider>
  );
}
