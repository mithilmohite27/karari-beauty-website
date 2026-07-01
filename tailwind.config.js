/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./data/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        charcoal: "#181614",
        ink: "#28231e",
        karariGold: "#9b6a24",
        antiqueGold: "#c8a05a",
        cream: "#fbf7ef",
        blush: "#f8dbe1",
        rose: "#cf5266",
        wine: "#7c2635",
        silk: "#fffaf4"
      },
      boxShadow: {
        boutique: "0 18px 50px rgba(37, 24, 16, 0.12)",
        soft: "0 12px 30px rgba(37, 24, 16, 0.08)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"]
      }
    }
  },
  plugins: []
};
