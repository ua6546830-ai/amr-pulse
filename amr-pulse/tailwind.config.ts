import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F4F6FB",
        surface: "#FFFFFF",
        ink: "#10243A",
        muted: "#5B6B7F",
        faint: "#8A97A8",
        line: { DEFAULT: "#E4E9F1", strong: "#D2DAE6" },
        navy: {
          DEFAULT: "#10243A",
          950: "#081726",
          900: "#10243A",
          800: "#193B59",
          700: "#234E72",
          600: "#2F648F",
        },
        brand: {
          50: "#E8F8F3",
          100: "#CDF0E6",
          200: "#9FE3D2",
          500: "#17B491",
          600: "#12A985",
          700: "#0B8A6C",
          800: "#086650",
        },
        sci: { cyan: "#42B8D5", teal: "#12A985" },
        ai: { DEFAULT: "#7665E8", soft: "#EFECFE", deep: "#5B4BD1" },
        warn: { 50: "#FEF7EC", 100: "#FBE9CC", 600: "#A9651A", 700: "#8A4F12" },
        danger: { 50: "#FDF1F2", 100: "#F9D9DC", 600: "#C2414A" },
        ok: { 50: "#EBFAF3", 100: "#CFEFE0", 600: "#0E8B62" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        "2xs": ["10.5px", "1.45"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 36, 58, 0.04), 0 10px 30px -18px rgba(16, 36, 58, 0.18)",
        lift: "0 2px 4px rgba(16, 36, 58, 0.05), 0 18px 46px -20px rgba(16, 36, 58, 0.28)",
        pop: "0 12px 40px -12px rgba(16, 36, 58, 0.28)",
        glass: "inset 0 1px 0 rgba(255,255,255,0.65), 0 18px 50px -24px rgba(16,36,58,0.35)",
        ring: "0 0 0 1px rgba(18,169,133,0.18)",
      },
      borderRadius: { xl: "16px", lg: "12px", "2xl": "20px", "3xl": "26px" },
      backgroundImage: {
        "hero-aurora":
          "radial-gradient(1100px 520px at 12% -10%, rgba(66,184,213,0.20), transparent 60%), radial-gradient(900px 480px at 88% 0%, rgba(118,101,232,0.16), transparent 62%), radial-gradient(800px 420px at 50% 110%, rgba(18,169,133,0.14), transparent 65%)",
        "grid-faint":
          "linear-gradient(to right, rgba(16,36,58,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,36,58,0.05) 1px, transparent 1px)",
      },
      backgroundSize: { grid: "32px 32px" },
      keyframes: {
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "none" } },
        "rise": { from: { opacity: "0", transform: "translateY(14px)" }, to: { opacity: "1", transform: "none" } },
        "float": { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        "pulse-soft": { "0%,100%": { opacity: "0.55" }, "50%": { opacity: "1" } },
        "dash": { to: { strokeDashoffset: "0" } },
        "shimmer": { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
      },
      animation: {
        "fade-in": "fade-in 220ms ease-out",
        rise: "rise 520ms cubic-bezier(0.22, 1, 0.36, 1) both",
        float: "float 7s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2.8s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
