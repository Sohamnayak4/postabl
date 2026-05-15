/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#f7f5f0",
        "bg-alt": "#efece5",
        panel: "#ffffff",
        ink: {
          DEFAULT: "#1a1a1a",
          soft: "#555555",
          faint: "#8a8680",
        },
        line: {
          DEFAULT: "#d9d4c7",
          strong: "#d0cabb",
        },
        accent: "#d94f2e",
      },
      fontFamily: {
        sans: ['"Geist"', "-apple-system", "sans-serif"],
        serif: ['"Fraunces"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      fontSize: {
        base: ["15px", "1.55"],
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
      },
      boxShadow: {
        "demo-screenshot":
          "0 40px 80px -20px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)",
        "canvas-screenshot":
          "0 50px 100px -20px rgba(0,0,0,0.35), 0 30px 60px -30px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)",
        canvas: "0 20px 60px -20px rgba(0,0,0,0.15)",
        tools: "0 4px 16px rgba(0,0,0,0.04)",
      },
    },
  },
  plugins: [],
};
