import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0B",
        pearl: "#F8F5F0",
        sand: "#EADBC8",
        gold: "#C8A96B",
        midnight: "#10131A",
        mist: "#98A2B3"
      },
      boxShadow: {
        luxe: "0 20px 60px rgba(200, 169, 107, 0.18)",
        soft: "0 8px 30px rgba(16, 19, 26, 0.08)"
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        rise: "rise .5s ease-out both"
      }
    }
  },
  plugins: []
};

export default config;
