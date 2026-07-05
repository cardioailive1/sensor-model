import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Corverxis brand palette
        navy: {
          DEFAULT: "#0a1628",
          50: "#e8f0fc",
          100: "#c5d5f5",
          200: "#8fb0eb",
          300: "#5a8ae0",
          400: "#2563d4",
          500: "#0a1628",
          600: "#081220",
          700: "#060e19",
          800: "#040b12",
          900: "#02070b",
        },
        ocean: {
          DEFAULT: "#00c2e0",
          50: "#e0fbff",
          100: "#b3f5ff",
          200: "#66ebff",
          300: "#00deff",
          400: "#00c2e0",
          500: "#009db8",
          600: "#007a8f",
          700: "#005a69",
          800: "#003b44",
          900: "#001d22",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-in",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
