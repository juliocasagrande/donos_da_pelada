import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        campo: "#1B9E4B",
        mata: "#0B4A29",
        craque: "#F4A11A",
        tinta: "#16261D",
        musgo: "#69786D",
        linha: "#E6EADF",
        areia: "#F1F4ED",
        ausente: "#DC5B45",
        field: {
          950: "#04130a",
          900: "#062414",
          800: "#08351e",
          700: "#0b4a2b",
          500: "#16a34a",
          300: "#86efac"
        },
        gold: "#facc15"
      },
      borderRadius: {
        card: "16px",
        pill: "11px"
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        jersey: ["var(--font-jersey)", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,.05)",
        button: "0 10px 22px rgba(27,158,75,.3)",
        glow: "0 0 0 1px rgba(134,239,172,.14), 0 24px 80px rgba(0,0,0,.35)"
      }
    }
  },
  plugins: []
};

export default config;
