/// <reference types="vitest/config" />
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    // vendor-three (three.js + @react-three) é grande mas lazy — só carrega
    // quando o card do mapa 3D é exibido, então não pesa no chunk inicial.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('@react-three')) return 'vendor-three'
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-recharts'
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // O padrão do app é `api` (modelos reais), mas teste não fala com rede:
    // aqui a fonte é sempre o mock local, determinístico e offline. Quem
    // precisa exercitar o `ApiSource` mocka o `fetch` no próprio teste.
    env: { VITE_DATA_SOURCE: 'local' },
    // Precisa ficar ACIMA do `asyncUtilTimeout` de 5 s do setup: se os dois
    // forem iguais, um `waitFor` lento consome todo o orçamento e o teste morre
    // por timeout genérico, sem a mensagem que diz o que não apareceu na tela.
    testTimeout: 15_000,
  },
})
