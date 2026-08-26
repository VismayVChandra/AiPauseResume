import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Colours point at the `-raw` channel variables (see app/globals.css)
      // rather than the complete `var(--x)` colours, so Tailwind has a slot
      // to inject alpha into. Without <alpha-value>, every opacity modifier
      // in the app (bg-brand/50, ring-brand/15, bg-destructive/10, …)
      // silently resolved to fully transparent.
      colors: {
        background: "oklch(var(--background-raw) / <alpha-value>)",
        foreground: "oklch(var(--foreground-raw) / <alpha-value>)",
        card: "oklch(var(--card-raw) / <alpha-value>)",
        "card-foreground": "oklch(var(--card-foreground-raw) / <alpha-value>)",
        primary: "oklch(var(--primary-raw) / <alpha-value>)",
        "primary-foreground": "oklch(var(--primary-foreground-raw) / <alpha-value>)",
        muted: "oklch(var(--muted-raw) / <alpha-value>)",
        "muted-foreground": "oklch(var(--muted-foreground-raw) / <alpha-value>)",
        destructive: "oklch(var(--destructive-raw) / <alpha-value>)",
        "destructive-foreground": "oklch(var(--destructive-foreground-raw) / <alpha-value>)",
        border: "oklch(var(--border-raw) / <alpha-value>)",
        ring: "oklch(var(--ring-raw) / <alpha-value>)",
        brand: "oklch(var(--brand-raw) / <alpha-value>)",
        "brand-foreground": "oklch(var(--brand-foreground-raw) / <alpha-value>)",
        "brand-muted": "oklch(var(--brand-muted-raw) / <alpha-value>)",
        paper: "oklch(var(--paper-raw) / <alpha-value>)",
        "paper-edge": "oklch(var(--paper-edge-raw) / <alpha-value>)",
        linkedin: "oklch(var(--linkedin-raw) / <alpha-value>)",
        "linkedin-muted": "oklch(var(--linkedin-muted-raw) / <alpha-value>)",
        // kept for any leftover references from the original scaffold
        ink: "oklch(var(--foreground-raw) / <alpha-value>)",
        accent: "oklch(var(--brand-raw) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
      },
    },
  },
  plugins: [],
};
export default config;
