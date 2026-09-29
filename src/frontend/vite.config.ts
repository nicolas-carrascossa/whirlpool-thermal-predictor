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
      // Dados de catálogo (sensores, opções de variável, manifesto de modelos)
      // pertencem ao back-end, que os serve por HTTP — ver
      // `src/backend/app/config.py`. O front-end só os importa em alguns testes
      // que verificam invariantes contra os mesmos JSONs. Nenhum componente lê
      // daqui: em runtime tudo vem da API.
      '@data': path.resolve(import.meta.dirname, '../backend/data'),
    },
  },
  server: {
    // Porta FIXA, e falha se estiver ocupada. Sem `strictPort`, o Vite migra
    // silenciosamente para 5174, 5175... e o back-end passa a recusar a origem
    // por CORS — o que chega na tela como "Não foi possível contactar a API",
    // uma mensagem que não aponta para a causa. É melhor não subir e dizer
    // "porta 5173 ocupada" do que subir numa porta que não vai funcionar.
    port: 5173,
    strictPort: true,
  },
  preview: {
    // Mesmo motivo do `server` acima, para `npm run preview`.
    port: 4173,
    strictPort: true,
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
    // Precisa ficar ACIMA do `asyncUtilTimeout` de 5 s do setup: se os dois
    // forem iguais, um `waitFor` lento consome todo o orçamento e o teste morre
    // por timeout genérico, sem a mensagem que diz o que não apareceu na tela.
    testTimeout: 15_000,
  },
})
