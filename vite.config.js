import { defineConfig } from 'vite';

export default defineConfig({
  base: './',                       // chemins relatifs : le site marche aussi dans un sous-dossier
  build: {
    target: 'esnext',               // `await` au niveau des modules
    outDir: 'dist',
    chunkSizeWarningLimit: 1200,    // les données du monde pèsent environ 750 Ko
  },
  server: { port: 8080 },
  preview: { port: 8080 },
});
