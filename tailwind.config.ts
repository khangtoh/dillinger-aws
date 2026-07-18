import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Phase 14 semantic tokens — backed by CSS custom properties in
        // app/globals.css (:root / :root.dark), so the same class name
        // resolves to the correct value for the active theme.
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        "accent-hover": "rgb(var(--color-accent-hover) / <alpha-value>)",
        "accent-emphasis": "rgb(var(--color-accent-emphasis) / <alpha-value>)",
        "bg-canvas": "rgb(var(--color-bg-canvas) / <alpha-value>)",
        "bg-surface": "rgb(var(--color-bg-surface) / <alpha-value>)",
        "bg-surface-raised": "rgb(var(--color-bg-surface-raised) / <alpha-value>)",
        "bg-surface-hover": "rgb(var(--color-bg-surface-hover) / <alpha-value>)",
        "bg-chrome": "rgb(var(--color-bg-chrome) / <alpha-value>)",
        "bg-selected": "rgb(var(--color-bg-selected) / <alpha-value>)",
        "text-primary": "rgb(var(--color-text-primary) / <alpha-value>)",
        "text-secondary": "rgb(var(--color-text-secondary) / <alpha-value>)",
        "text-inverse": "rgb(var(--color-text-inverse) / <alpha-value>)",
        "text-on-accent": "rgb(var(--color-text-on-accent) / <alpha-value>)",
        "border-subtle": "rgb(var(--color-border-subtle) / <alpha-value>)",
        "border-strong": "rgb(var(--color-border-strong) / <alpha-value>)",
        "focus-ring": "rgb(var(--color-focus-ring) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
      },
      fontFamily: {
        sans: ['"Source Sans Pro"', '"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
        serif: ["Georgia", "Cambria", "serif"],
        mono: ['"Ubuntu Mono"', "Monaco", "monospace"],
      },
      spacing: {
        sidebar: "270px",
        gutter: "32px",
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
        "in": "slide-in-from-right 0.2s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
      },
      transitionDuration: {
        "250": "250ms",
      },
    },
  },
  plugins: [],
};

export default config;
