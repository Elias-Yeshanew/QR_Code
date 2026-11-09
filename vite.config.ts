import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/** Serves the real /api backend inside the Vite dev server. Not used by `vite build`. */
function devApi(): Plugin {
  return {
    name: 'card-dev-api',
    apply: 'serve',
    async configureServer(server) {
      await import('dotenv/config');
      const { createStore } = await import('./server/store.ts');
      const { createApi } = await import('./server/backend.ts');
      const store = createStore(import.meta.dirname);
      await store.init();
      const api = createApi(store);
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/api')) {
          api(req as never, res as never, next);
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devApi()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
