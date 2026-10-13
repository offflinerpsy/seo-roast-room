import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'app',
  plugins: [react(), tailwindcss()],
  build: { outDir: '../skills/seo-roast/room', emptyOutDir: true, sourcemap: false },
  server: { proxy: { '/api': 'http://127.0.0.1:4740', '/portraits': 'http://127.0.0.1:4740' } },
});
