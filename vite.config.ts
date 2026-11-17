/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Two pages, one build:
//   /            the landing page (index.html, src/landing/)
//   /app/        the app itself (app/index.html, src/main.tsx)
// On GitHub Pages everything is served under VITE_BASE=/earmark/.
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Only the app works offline; the landing page is always fetched fresh.
      scope: `${base}app/`,
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Earmark',
        short_name: 'Earmark',
        description: 'A to-listen list for albums that remembers who told you about them.',
        theme_color: '#121314',
        background_color: '#F7F7F5',
        display: 'standalone',
        start_url: `${base}app/`,
        scope: `${base}app/`,
        icons: [{ src: `${base}icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: ['index.html', 'assets/landing-*'],
        navigateFallback: `${base}app/index.html`,
        navigateFallbackAllowlist: [/\/app\/?(index\.html)?$/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname === 'coverartarchive.org' || url.hostname.endsWith('archive.org'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'covers',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        landing: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app/index.html'),
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
