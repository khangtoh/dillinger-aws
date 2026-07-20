import {
  defineTheme,
  type DefineThemeInput,
  type TokenValue,
} from "@astryxdesign/core/theme";
import { neutralIconRegistry } from "@astryxdesign/theme-neutral/built";
import {
  astryxColorTokens,
  elevationTokens,
  motionTokens,
  radiusTokens,
  spacingTokens,
  typographyTokens,
  type ThemePair,
} from "./tokens";

function mutablePair(value: ThemePair): [string, string] {
  return [value[0], value[1]];
}

function mutableToken(value: string | ThemePair): TokenValue {
  return typeof value === "string" ? value : mutablePair(value);
}

function toThemeTokens(
  values: Record<string, string | ThemePair>
): Record<string, TokenValue> {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      name,
      mutableToken(value),
    ])
  ) as Record<string, TokenValue>;
}

const tokens = {
  ...toThemeTokens(astryxColorTokens),
  ...toThemeTokens(spacingTokens),
  ...toThemeTokens(radiusTokens),
  ...toThemeTokens(elevationTokens),
  "--ease-standard": motionTokens.ease,
  "--transition-fast": `var(--duration-fast) ${motionTokens.ease}`,
  "--transition-normal": `var(--duration-medium) ${motionTokens.ease}`,
} as DefineThemeInput["tokens"];

/** The sole runtime visual identity for Dillinger's Astryx primitives. */
export const dillingerTheme = defineTheme({
  name: "dillinger",
  typography: {
    scale: typographyTokens.scale,
    body: {
      family: typographyTokens.bodyFamily,
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    heading: {
      family: typographyTokens.bodyFamily,
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      weight: "semibold",
      weights: { 1: "bold", 2: "semibold", 3: "semibold" },
    },
    code: {
      family: typographyTokens.codeFamily,
      fallbacks: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    },
  },
  motion: {
    fast: motionTokens.fast,
    medium: motionTokens.medium,
    slow: motionTokens.slow,
    ratio: motionTokens.ratio,
  },
  tokens,
  // Astryx owns semantic icon behavior; Dillinger owns every visual token.
  icons: neutralIconRegistry,
});
