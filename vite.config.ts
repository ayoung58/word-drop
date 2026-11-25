import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the build works from any folder or address: a sub-path on a web
  // host, an itch.io upload, or inside a Capacitor app, none of which serve from the site root.
  base: './',
});
