/**
 * Erros de transporte/autenticação da Fase 2, ao lado de `ContractError`
 * (que representa violações do contrato de dados em si).
 */

/** Sessão ausente ou expirada — o chamador deve encerrar a sessão e redirecionar ao login. */
export class AuthError extends Error {
  readonly status: number

  constructor(message: string, status = 401) {
    super(message)
    this.name = 'AuthError'
    this.status = status
    Object.setPrototypeOf(this, AuthError.prototype)
  }
}
