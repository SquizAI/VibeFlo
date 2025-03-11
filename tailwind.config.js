/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Main background
        'app-bg': 'var(--app-bg)',
        'card-bg': 'var(--card-bg)',
        'card-hover': 'var(--card-hover)',
        'node-bg': 'var(--node-bg)',
        
        // Accent colors
        'accent-blue': 'var(--accent-blue)',
        'accent-green': 'var(--accent-green)',
        'accent-pink': 'var(--accent-pink)',
        'accent-yellow': 'var(--accent-yellow)',
        'accent-purple': 'var(--accent-purple)',
        'accent-orange': 'var(--accent-orange)',
        'accent-teal': 'var(--accent-teal)',
        'accent-red': 'var(--accent-red)',
        'accent-indigo': 'var(--accent-indigo)',
        'accent-amber': 'var(--accent-amber)',
        'accent-emerald': 'var(--accent-emerald)',
        'accent-rose': 'var(--accent-rose)',
        
        // Text colors
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        
        // UI element colors
        'border-light': 'var(--border-light)',
      },
      boxShadow: {
        'card': '0 4px 20px 0 rgba(0, 0, 0, 0.25)',
        'glow-blue': '0 0 15px var(--accent-blue-glow)',
        'glow-green': '0 0 15px var(--accent-green-glow)',
        'glow-pink': '0 0 15px var(--accent-pink-glow)',
        'glow-yellow': '0 0 15px var(--accent-yellow-glow)',
        'glow-purple': '0 0 15px var(--accent-purple-glow)',
        'glow-orange': '0 0 15px var(--accent-orange-glow)',
        'glow-teal': '0 0 15px var(--accent-teal-glow)',
        'glow-red': '0 0 15px var(--accent-red-glow)',
        'glow-indigo': '0 0 15px var(--accent-indigo-glow)',
        'glow-amber': '0 0 15px var(--accent-amber-glow)',
        'glow-emerald': '0 0 15px var(--accent-emerald-glow)',
        'glow-rose': '0 0 15px var(--accent-rose-glow)',
      },
    },
  },
  plugins: [],
};
