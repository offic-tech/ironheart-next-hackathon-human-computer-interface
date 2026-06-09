import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        iron: {
          black: "#050504",
          coal: "#10100d",
          green: "#00ff88",
          red: "#ff3636",
          paper: "#f4efe3",
          muted: "#a9a191",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"],
      },
    },
  },
  plugins: [],
};

export default config;
