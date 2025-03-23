/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./views/**/*.{html,js,ejs}"
  ],
  theme: {
    extend: {
      colors: {
        'chess-primary': '#4a6fa5',
        'chess-secondary': '#2c3e50',
        'board-light': '#f0d9b5',
        'board-dark': '#b58863',
        'accent': '#e6b35a',
        'success': '#48bb78',
        'error': '#f56565',
        'warning': '#ed8936',
      },
      spacing: {
        'square': '12.5%',
      },
      boxShadow: {
        'piece': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'selected': '0 0 0 4px rgba(74, 111, 165, 0.5)',
        'hover': '0 8px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'card': '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse': 'pulse 2s infinite',
        'bounce-soft': 'bounceSoft 1s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
    },
  },
  plugins: [],
} 