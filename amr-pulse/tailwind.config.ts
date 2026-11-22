import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F9FC",
        ink: "#172033",
        muted: "#64748B",
        line: { DEFAULT: "#E5EAF0", strong: "#D3DCE7" },
        brand: { 50: "#EFF5FF", 100: "#DBE8FE", 600: "#2563EB", 700: "#1D4ED8" },
        sci: { cyan: "#0891B2", teal: "#0F9D8A" },
        warn: { 50: "#FFFBEB", 600: "#B45309" },
        danger: { 50: "#FEF2F2", 600: "#B91C1C" },
        ok: { 50: "#ECFDF5", 600: "#047857" },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.05)",
        pop: "0 8px 24px rgba(16, 24, 40, 0.10)",
      },
      borderRadius: { xl: "12px", lg: "10px" },
      keyframes: {
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: { "fade-in": "fade-in 180ms ease-out" },
    },
  },
  plugins: [],
};

export default config;
