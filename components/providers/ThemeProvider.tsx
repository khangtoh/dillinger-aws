"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useStore } from "@/stores/store";

type ResolvedTheme = "light" | "dark";

const ThemeContext = createContext<ResolvedTheme>("light");

export function useResolvedTheme(): ResolvedTheme {
  return useContext(ThemeContext);
}

function resolveTheme(preference: "light" | "dark" | "system", prefersDark: boolean): ResolvedTheme {
  if (preference === "system") return prefersDark ? "dark" : "light";
  return preference;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themePreference = useStore((state) => state.settings.themePreference);
  const [prefersDark, setPrefersDark] = useState(false);
  const [resolved, setResolved] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    setPrefersDark(query.matches);

    const handleChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const next = resolveTheme(themePreference, prefersDark);
    setResolved(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, [themePreference, prefersDark]);

  return <ThemeContext.Provider value={resolved}>{children}</ThemeContext.Provider>;
}
