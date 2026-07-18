import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider, useResolvedTheme } from "@/components/providers/ThemeProvider";
import { useStore } from "@/stores/store";

const initialState = useStore.getState();

function resetStore() {
  useStore.setState(
    {
      ...initialState,
      settings: { ...initialState.settings, themePreference: "system" },
    },
    true
  );
}

function ResolvedThemeProbe() {
  const resolved = useResolvedTheme();
  return <span data-testid="resolved-theme">{resolved}</span>;
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    resetStore();
    document.documentElement.classList.remove("dark");
  });

  it("applies the dark class when themePreference is 'dark'", () => {
    useStore.setState({
      settings: { ...useStore.getState().settings, themePreference: "dark" },
    });

    render(
      <ThemeProvider>
        <ResolvedThemeProbe />
      </ThemeProvider>
    );

    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
  });

  it("removes the dark class when themePreference is 'light'", () => {
    document.documentElement.classList.add("dark");
    useStore.setState({
      settings: { ...useStore.getState().settings, themePreference: "light" },
    });

    render(
      <ThemeProvider>
        <ResolvedThemeProbe />
      </ThemeProvider>
    );

    expect(document.documentElement).not.toHaveClass("dark");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
  });

  it("falls back to the OS preference (mocked as light) when themePreference is 'system'", () => {
    render(
      <ThemeProvider>
        <ResolvedThemeProbe />
      </ThemeProvider>
    );

    expect(document.documentElement).not.toHaveClass("dark");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
  });
});
