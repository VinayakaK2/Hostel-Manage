/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card:
          "0 1px 2px rgba(15, 23, 42, 0.06), 0 10px 30px rgba(30, 64, 175, 0.08)",
        soft: "0 8px 30px rgba(15, 23, 42, 0.08)",
        insetGlass: "inset 0 1px 0 rgba(255,255,255,0.55)",
      },
      backgroundImage: {
        "admin-gradient":
          "radial-gradient(1200px 600px at 10% -10%, rgba(59,130,246,0.22), transparent 55%), radial-gradient(900px 500px at 100% 0%, rgba(37,99,235,0.18), transparent 50%)",
      },
    },
  },
  plugins: [],
};
