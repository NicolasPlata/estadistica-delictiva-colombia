/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // maplibre-gl tiliza las fuentes GeoJSON en un Web Worker; el
  // pre-bundling de esbuild rompe ese worker (sirve un archivo que nunca
  // existe, `maplibre-gl-worker.mjs`) y las fuentes GeoJSON se quedan sin
  // cargar para siempre sin ningún error visible — excluirlo del
  // optimizador de dependencias lo resuelve.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
