import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Passhopper',
        short_name: 'Passhopper',
        description: 'Plan your Interrail trip. Make the pass pay off.',
        theme_color: '#00A37A',
        background_color: '#F3F5F8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Chinese font subsets are large and only needed in the Chinese UI, so they are cached on use.
        globIgnores: ['**/noto-sans-sc*'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('noto-sans-sc'),
            handler: 'CacheFirst',
            options: { cacheName: 'fonts-zh', expiration: { maxEntries: 300 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
