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
  build: {
    // maplibre-gl es ~970KB sin comprimir (~250KB gzip) — es el tamaño
    // real de una librería de mapas WebGL completa, ya vive en su propio
    // chunk lazy-loaded (Hito 5.2, App.tsx) y nunca bloquea el bundle
    // crítico inicial, así que la advertencia por defecto (500KB) es
    // ruido, no una señal de que falte dividir algo más.
    chunkSizeWarningLimit: 1100,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
