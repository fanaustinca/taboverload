import { defineConfig } from 'vite';

export default defineConfig({
  base: './',          // relative paths so the build works on GitHub Pages / any subfolder
  server: { port: 5173, open: true },
});
