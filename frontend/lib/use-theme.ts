"use client";

import { useEffect, useState } from "react";

export type ThemePreference = "dark" | "light" | "system";

const storageKey = "signal-clone-theme";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "dark" || value === "light" || value === "system";
}

function resolvedTheme(preference: ThemePreference) {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "dark";
    const storedTheme = window.localStorage.getItem(storageKey);
    return isThemePreference(storedTheme) ? storedTheme : "dark";
  });

  useEffect(() => {
    const applyTheme = () => {
      document.documentElement.dataset.theme = resolvedTheme(theme);
    };

    applyTheme();
    window.localStorage.setItem(storageKey, theme);
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    mediaQuery.addEventListener("change", applyTheme);
    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [theme]);

  return { theme: theme ?? "dark", setTheme };
}
