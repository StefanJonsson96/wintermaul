import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const SERVER_PORT = Number(process.env.PORT ?? 8787);

// `vite build --mode artifact` builds the stand-alone single-player page (see scripts/build-artifact.mjs).
export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact';
  return {
    root: 'src/client',
    publicDir: false,
    base: artifact ? './' : '/',
    resolve: artifact ? { alias: [{ find: /^@fontsource\/.*\.css$/, replacement: fileURLToPath(new URL('./src/client/ui/no-fonts.css', import.meta.url)) }] } : undefined,
    build: {
      outDir: artifact ? '../../dist/artifact' : '../../dist/client',
      emptyOutDir: true,
      target: 'es2022',
      chunkSizeWarningLimit: 2000,
      modulePreload: artifact ? { polyfill: false } : undefined,
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/ws': { target: `ws://localhost:${SERVER_PORT}`, ws: true },
      },
    },
  };
});
