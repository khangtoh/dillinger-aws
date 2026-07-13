import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import stylexPlugin from "@stylexjs/unplugin/vite";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    // Astryx (Phase 14 swizzle spike) ships components authored with
    // StyleX's stylex.create() — it throws at runtime unless compiled.
    stylexPlugin({
      useCSSLayers: true,
      unstable_moduleResolution: { type: "commonJS", rootDir: __dirname },
    }),
  ],
  // Astryx's package.json exports a "source" condition pointing at its
  // original .ts files (e.g. @astryxdesign/core/theme -> src/theme/index.ts)
  // specifically so the StyleX babel plugin can statically resolve
  // cross-file vars — the compiled "default" (dist/*.js) has already lost
  // the stylex.defineVars() call shape it needs. Without this, resolution
  // falls back to dist/theme/index.js and the babel plugin fails with
  // "Could not resolve the path to the imported file."
  resolve: {
    conditions: ["source", "module", "import", "browser", "default"],
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    css: true,
    restoreMocks: true,
    clearMocks: true,
  },
});
