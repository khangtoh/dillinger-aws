import type { Config } from "tailwindcss";
import { tailwindColorBridge } from "./lib/theme/tokens";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: tailwindColorBridge,
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Arial", "sans-serif"],
        mono: ["var(--font-geist-mono)", "Consolas", "monospace"],
      },
      borderRadius: {
        control: "var(--radius-element)",
        panel: "var(--radius-container)",
      },
      boxShadow: {
        low: "var(--shadow-low)",
        medium: "var(--shadow-med)",
        high: "var(--shadow-high)",
      },
      spacing: {
        sidebar: "288px",
        gutter: "var(--spacing-8)",
      },
      zIndex: {
        sidebar: "1",
        page: "2",
        editor: "3",
        preview: "4",
        overlay: "5",
        navbar: "6",
        settings: "7",
        modal: "50",
        toast: "60",
      },
      keyframes: {
        "slide-in-from-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "in": "slide-in-from-right var(--duration-medium) var(--ease-standard)",
        "fade-in": "fade-in var(--duration-fast) var(--ease-standard)",
      },
      transitionTimingFunction: {
        "out-quart": "var(--ease-standard)",
      },
      transitionDuration: {
        "250": "var(--duration-medium)",
      },
    },
  },
  plugins: [],
};

export default config;
