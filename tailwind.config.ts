import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: "#171717",
        steel: "#6b7280",
        weld: "#f97316",
      },
      boxShadow: {
        panel: "0 18px 55px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
