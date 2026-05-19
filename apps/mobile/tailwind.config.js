/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        surface: "#111111",
        card: "#161616",
        border: "#222222",
        positive: "#10B981", // emerald-500
        negative: "#EF4444", // red-500
        brand: "#6366F1",    // indigo-500
        textPrimary: "#F3F4F6",
        textSecondary: "#9CA3AF",
        textMuted: "#6B7280",
      },
    },
  },
  plugins: [],
}
