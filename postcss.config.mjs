// Tailwind v4 rides through PostCSS: Next's CSS pipeline is
// PostCSS, so the PostCSS plugin is the integration that fits
// (the Vite plugin only exists for Vite pipelines). Tailwind is
// plumbing here, never the look: globals.css stays the design
// system, and utilities are adopted surface by surface.
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
