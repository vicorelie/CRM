import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/onboarding/platforms/*.ts",
  ],
  // Classes dynamiques utilisées dans les configs platform — Tailwind JIT ne les détecte
  // pas toujours quand elles sont dans des template literals `${oauthButtonBg}`.
  safelist: [
    // Backgrounds couleurs marque
    "bg-[#1877F2]", "hover:bg-[#166eda]", // Facebook / Meta Ads
    "bg-[#0A66C2]", "hover:bg-[#0958a8]", // LinkedIn
    "bg-[#FF0000]", "hover:bg-[#cc0000]", // YouTube
    "bg-black", "hover:bg-slate-800", // TikTok
    "bg-white", "hover:bg-slate-100", "!text-slate-900", // Google Ads
    "bg-gradient-to-r", "from-pink-500", "via-fuchsia-500", "to-amber-500", "hover:opacity-90", // Instagram
    // Shadows colorées
    "shadow-blue-500/20", "shadow-pink-500/20", "shadow-red-500/20", "shadow-slate-200/40",
    // Borders
    "border", "border-pink-500/40",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        border: "var(--border)",
        brand: {
          DEFAULT: "#A020F0",
          50: "#FAF1FF",
          100: "#F3E0FF",
          200: "#E6BDFF",
          300: "#D08AFF",
          400: "#B855F4",
          500: "#A020F0",
          600: "#8B14D6",
          700: "#7012B0",
          800: "#56128A",
          900: "#3F0E66",
          950: "#260640",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.04)",
        lift: "0 6px 24px -8px rgb(0 0 0 / 0.10), 0 2px 6px -2px rgb(0 0 0 / 0.06)",
        brand: "0 10px 30px -10px rgb(160 32 240 / 0.45)",
      },
    },
  },
  plugins: [],
};
export default config;
