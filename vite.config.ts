import { defineConfig } from 'vite';

const SERVER_PORT = Number(process.env.PORT ?? 8787);

export default defineConfig({
  root: 'src/client',
  publicDir: false,
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/ws': { target: `ws://localhost:${SERVER_PORT}`, ws: true },
    },
  },
});
