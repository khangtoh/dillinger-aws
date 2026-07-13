"use client";

import { ReactNode } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { StoreProvider } from "./StoreProvider";
import { ToastProvider } from "@/components/ui/Toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Theme theme={neutralTheme}>
      <StoreProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </StoreProvider>
    </Theme>
  );
}
