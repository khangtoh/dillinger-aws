"use client";

import { ReactNode, useEffect } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { StoreProvider } from "./StoreProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { useStore } from "@/stores/store";

export function Providers({ children }: { children: ReactNode }) {
  const theme = useStore((state) => state.settings.theme);

  // Drive Tailwind's darkMode: "class" utilities from the same setting
  // that controls Astryx's <Theme mode>, so there's one source of truth
  // instead of two independent theming systems (Phase 14 finding).
  useEffect(() => {
    const root = document.documentElement;
    const apply = (isDark: boolean) => root.classList.toggle("dark", isDark);

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      apply(media.matches);
      const handler = (e: MediaQueryListEvent) => apply(e.matches);
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }

    apply(theme === "dark");
  }, [theme]);

  return (
    <Theme theme={neutralTheme} mode={theme}>
      <StoreProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </StoreProvider>
    </Theme>
  );
}
