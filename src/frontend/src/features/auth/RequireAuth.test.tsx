import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { clearSession, setSession } from '@/features/auth/tokenStore'

import { AuthProvider } from './authStore'
import { RequireAuth } from './RequireAuth'

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <RequireAuth>
                <div>Conteúdo protegido</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<div>Tela de login</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    clearSession()
  })

  it('passa direto em modo local, mesmo sem sessão', () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'local')
    renderApp()
    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument()
  })

  it('redireciona para /login em modo api sem sessão', () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'api')
    renderApp()
    expect(screen.getByText('Tela de login')).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument()
  })

  it('renderiza o conteúdo em modo api com sessão válida', async () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'api')
    setSession({
      token: 'tok-1',
      expiresAt: Date.now() + 60_000,
      user: { username: 'engenheiro', display_name: 'Engenheiro', role: 'engineer' },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ username: 'engenheiro', display_name: 'Engenheiro', role: 'engineer' }),
          { status: 200 },
        ),
      ),
    )
    renderApp()
    expect(await screen.findByText('Conteúdo protegido')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})
