import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

import App from './App.tsx'
import { getSession, subscribe } from './features/auth/tokenStore'
import './index.css'

const queryClient = new QueryClient()

// Ao encerrar a sessão, nada do que foi carregado (estado dos modelos, metadados) pode
// sobrar para a próxima pessoa: quem entra de novo começa da pergunta dos modelos.
subscribe(() => {
  if (getSession() === null) queryClient.clear()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
