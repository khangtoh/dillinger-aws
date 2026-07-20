// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { dillingerTheme } from "@/lib/theme/dillingerTheme";
import {
  getDillingerThemeSelection,
  syncTailwindThemeClass,
  type ThemeMediaQuery,
} from "@/components/providers/themeMode";

function createRoot() {
  const classes = new Set<string>();
  return {
    classes,
    root: {
      classList: {
        toggle(name: string, force?: boolean) {
          if (force) classes.add(name);
          else classes.delete(name);
          return force ?? false;
        },
      },
    },
  };
}

function createMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const addEventListener = vi.fn(
    (_type: "change", listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    }
  );
  const removeEventListener = vi.fn(
    (_type: "change", listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    }
  );

  const media = {
    get matches() {
      return matches;
    },
    addEventListener,
    removeEventListener,
  } as ThemeMediaQuery;

  return {
    media,
    removeEventListener,
    setMatches(next: boolean) {
      matches = next;
      const event = { matches: next } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
}

describe("owned theme selection", () => {
  it.each(["light", "dark", "system"] as const)(
    "passes the Dillinger theme to Astryx in %s mode",
    (mode) => {
      expect(getDillingerThemeSelection(mode)).toEqual({
        mode,
        theme: dillingerTheme,
      });
    }
  );
});

describe("Tailwind theme class synchronization", () => {
  it.each([
    ["light", false],
    ["dark", true],
  ] as const)("sets the dark class for %s mode", (mode, expected) => {
    const { root, classes } = createRoot();
    const resolveMedia = vi.fn(() => createMedia(false).media);

    syncTailwindThemeClass(mode, root, resolveMedia);

    expect(classes.has("dark")).toBe(expected);
    expect(resolveMedia).not.toHaveBeenCalled();
  });

  it("reacts to system preference changes and removes the listener", () => {
    const { root, classes } = createRoot();
    const query = createMedia(false);
    const resolveMedia = vi.fn(() => query.media);

    const cleanup = syncTailwindThemeClass("system", root, resolveMedia);

    expect(resolveMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
    expect(classes.has("dark")).toBe(false);
    query.setMatches(true);
    expect(classes.has("dark")).toBe(true);
    query.setMatches(false);
    expect(classes.has("dark")).toBe(false);

    cleanup();
    expect(query.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
  });
});
