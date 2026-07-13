import { fileURLToPath } from "node:url";
import stylexPlugin from "@stylexjs/unplugin/webpack";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  experimental: {
    // Optimize barrel file imports for better tree-shaking
    // This transforms imports from lucide-react to direct icon imports
    optimizePackageImports: ["lucide-react"],
  },
  webpack: (config, { dev }) => {
    // Astryx (Phase 14 swizzle spike) ships components authored with
    // StyleX's stylex.create() — it throws at runtime unless compiled.
    // @stylexjs/nextjs-plugin/webpack-plugin are stale (last published
    // 2025-03, pinned to babel-plugin@0.11.1); unplugin@0.19.0 is the
    // current, version-matched integration path instead.
    config.plugins.push(
      stylexPlugin({
        dev,
        useCSSLayers: true,
        unstable_moduleResolution: { type: "commonJS", rootDir },
      })
    );
    return config;
  },
};

export default nextConfig;
