import type { ThemeMode } from "@/lib/types";
import { dillingerTheme } from "@/lib/theme/dillingerTheme";

const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export interface ThemeClassRoot {
  classList: Pick<DOMTokenList, "toggle">;
}

export interface ThemeMediaQuery {
  matches: boolean;
  addEventListener(
    type: "change",
    listener: (event: MediaQueryListEvent) => void
  ): void;
  removeEventListener(
    type: "change",
    listener: (event: MediaQueryListEvent) => void
  ): void;
}

export type ThemeMediaResolver = (query: string) => ThemeMediaQuery;

export function getDillingerThemeSelection(mode: ThemeMode) {
  return { theme: dillingerTheme, mode } as const;
}

export function syncTailwindThemeClass(
  mode: ThemeMode,
  root: ThemeClassRoot,
  resolveMedia: ThemeMediaResolver
): () => void {
  const apply = (isDark: boolean) => root.classList.toggle("dark", isDark);

  if (mode !== "system") {
    apply(mode === "dark");
    return () => undefined;
  }

  const media = resolveMedia(DARK_MEDIA_QUERY);
  apply(media.matches);
  const handler = (event: MediaQueryListEvent) => apply(event.matches);
  media.addEventListener("change", handler);

  return () => media.removeEventListener("change", handler);
}
