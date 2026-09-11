import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'

import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import vuetify from 'vite-plugin-vuetify'

import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),

    vuetify({
      autoImport: true,
    }),

    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],

      manifest: {
        name: 'Nivela',
        short_name: 'Nivela',

        description:
          'Planificador financiero personal para organizar gastos, ahorro y decisiones diarias.',

        theme_color: '#F7F9FC',
        background_color: '#F7F9FC',

        display: 'standalone',

        start_url: '/',
        scope: '/',

        icons: [
          {
            src: '/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },

          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },

          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },

          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        cleanupOutdatedCaches: true,

        navigateFallback: '/index.html',

        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },
    }),

    vueDevTools(),
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})