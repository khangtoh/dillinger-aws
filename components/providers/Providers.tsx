"use client";

import { ReactNode, useEffect } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { StoreProvider } from "./StoreProvider";
import {
  getDillingerThemeSelection,
  syncTailwindThemeClass,
} from "./themeMode";
import { ToastProvider } from "@/components/ui/Toast";
import { useStore } from "@/stores/store";
import type { ThemeMode } from "@/lib/types";

export function Providers({ children, initialTheme }: {
  children: ReactNode;
  initialTheme: ThemeMode;
}) {
  const theme = useStore((state) => state.settings.theme);
  const hasHydrated = useStore((state) => state.hasHydrated);
  const renderedTheme = hasHydrated ? theme : initialTheme;

  // Tailwind's class-based dark utilities and Astryx read the same persisted
  // setting. System mode stays live as the OS preference changes.
  useEffect(() => {
    document.cookie = `dillinger-theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
    return syncTailwindThemeClass(
      theme,
      document.documentElement,
      (query) => window.matchMedia(query)
    );
  }, [theme]);

  return (
    <Theme {...getDillingerThemeSelection(renderedTheme)}>
      <StoreProvider>
        <ToastProvider>{children}</ToastProvider>
      </StoreProvider>
    </Theme>
  );
}
