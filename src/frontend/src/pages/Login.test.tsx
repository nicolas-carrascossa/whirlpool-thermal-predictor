import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/features/auth/authStore'
import { clearSession, getSession } from '@/features/auth/tokenStore'

import { LoginPage } from './Login'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Página inicial</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    clearSession()
  })

  it('envia usuário e senha como application/x-www-form-urlencoded e guarda o token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        access_token: 'tok-abc',
        token_type: 'bearer',
        expires_in: 3600,
        user: { username: 'engenheiro', display_name: 'Eng. Teste', role: 'engineer' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderLogin()

    fireEvent.change(screen.getByLabelText('Usuário'), { target: { value: 'engenheiro' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'thermal2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(screen.getByText('Página inicial')).toBeInTheDocument())

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/api/v1/auth/login')
    expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded')
    expect(init.body).toBe('username=engenheiro&password=thermal2026')

    expect(getSession()?.token).toBe('tok-abc')
    expect(getSession()?.user.display_name).toBe('Eng. Teste')
  })

  it('mostra o detail de erro da API em credenciais inválidas', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: 'Usuário ou senha inválidos' }, 401))
    vi.stubGlobal('fetch', fetchMock)

    renderLogin()

    fireEvent.change(screen.getByLabelText('Usuário'), { target: { value: 'engenheiro' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'errada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário ou senha inválidos')
    expect(getSession()).toBeNull()
  })
})
