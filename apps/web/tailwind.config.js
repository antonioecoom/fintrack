/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
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
        brandHover: "#4F46E5",
        textPrimary: "#F3F4F6",
        textSecondary: "#9CA3AF",
        textMuted: "#6B7280",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      fontWeight: {
        normal: "400",
        medium: "500",
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
