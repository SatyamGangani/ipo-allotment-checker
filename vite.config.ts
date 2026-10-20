import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { apiMiddleware } from './server/middleware.ts';

function apiPlugin(): Plugin {
  return {
    name: 'ipo-api-plugin',
    configureServer(server) {
      server.middlewares.use(apiMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiMiddleware);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});
