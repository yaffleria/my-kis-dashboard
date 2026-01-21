import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#191F28",
        surface: "#202632",
        foreground: "#FFFFFF",
        primary: "#3182F6",
        secondary: "#B0B8C1",
        accent: "#F04452",
        muted: "#4E5968",
        border: "#333D4B",
        success: "#4ADE80",
        positive: "#34C759",
        negative: "#FF3B30",
      },
      fontFamily: {
        sans: ["Pretendard Variable", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
