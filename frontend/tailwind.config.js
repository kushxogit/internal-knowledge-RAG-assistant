/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3b82f6", // Clean, premium blue-500
        secondary: "#0ea5e9", // Sky-500
        background: "#030712", // Zinc-950 (Dark background)
        surface: "rgba(15, 23, 42, 0.45)", // Semi-transparent slate
        "surface-variant": "rgba(30, 41, 59, 0.3)", // Even more transparent slate
        "on-background": "#f8fafc", // White slate-50
        "on-surface": "#f1f5f9", // Slate-100
        "on-surface-variant": "#94a3b8", // Slate-400
        outline: "rgba(255, 255, 255, 0.08)", // Fine white border
        "outline-variant": "rgba(255, 255, 255, 0.04)",
      },
      fontFamily: {
        sans: ['"Neue Montreal"', '"Helvetica Neue"', '"Neue Helvetica"', "Helvetica", "Arial", "sans-serif"],
        heading: ['"Neue Montreal"', '"Helvetica Neue"', '"Neue Helvetica"', "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        'noise': 'noiseShift 0.5s steps(5) infinite',
      },
      keyframes: {
        noiseShift: {
          '0%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-2%, -2%)' },
          '20%': { transform: 'translate(-4%, 2%)' },
          '30%': { transform: 'translate(2%, -4%)' },
          '40%': { transform: 'translate(-2%, 6%)' },
          '50%': { transform: 'translate(-4%, 2%)' },
          '60%': { transform: 'translate(6%, 0)' },
          '70%': { transform: 'translate(0, 4%)' },
          '80%': { transform: 'translate(-6%, 0)' },
          '90%': { transform: 'translate(4%, 2%)' },
          '100%': { transform: 'translate(2%, 0)' },
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}
