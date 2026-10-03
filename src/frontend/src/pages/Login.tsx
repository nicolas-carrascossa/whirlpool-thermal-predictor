/**
 * Tela de login (Fase 2, RF06). Card centrado sobre fundo branco, seguindo o
 * style guide (kicker Nunito Sans 700, título Nunito Sans 300, corpo Open
 * Sans, botão primário em Accomplished Blue).
 */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ContractError } from '@/contract/v1'
import { useAuth } from '@/features/auth/authStore'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(username, password)
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'
      navigate(from, { replace: true })
    } catch (err) {
      setError(
        err instanceof ContractError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Não foi possível entrar.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-wp-gray05 px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-6 px-6 py-8">
          <div className="flex flex-col gap-1">
            <span className="font-display text-[11px] font-bold uppercase tracking-[0.05em] text-wp-accent">
              Inteli × Whirlpool
            </span>
            <h1 className="font-display text-2xl font-light leading-tight text-wp-core">
              Thermal Predictor
            </h1>
            <p className="font-body text-sm text-wp-gray65">
              Acesso restrito — engenharia térmica
            </p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-username">Usuário</Label>
              <Input
                id="login-username"
                name="username"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-password">Senha</Label>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm leading-relaxed text-status-danger-ink">
                {error}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
