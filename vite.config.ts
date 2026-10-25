import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/mail-primary': {
          target: 'https://api.mail.tm',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/mail-primary/, ''),
          headers: {
            Origin: 'https://mail.tm',
            Referer: 'https://mail.tm/'
          },
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              delete proxyRes.headers['access-control-allow-origin'];
              delete proxyRes.headers['access-control-allow-credentials'];
            });
          }
        },
        '/api/mail-fallback': {
          target: 'https://api.mail.gw',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/mail-fallback/, ''),
          headers: {
            Origin: 'https://mail.gw',
            Referer: 'https://mail.gw/'
          },
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              delete proxyRes.headers['access-control-allow-origin'];
              delete proxyRes.headers['access-control-allow-credentials'];
            });
          }
        }
      }
    },
  };
});
