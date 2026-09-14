/**
 * Payload codificado no token JWT.
 */
export interface JwtPayload {
  /** Identificador do usuário autenticado. */
  sub: string;

  /** E-mail do usuário, útil para exibição e auditoria. */
  email: string;
}

/**
 * Usuário anexado à requisição após a validação do token JWT.
 */
export interface AuthenticatedUser {
  /** Identificador do usuário autenticado. */
  id: string;

  /** E-mail do usuário autenticado. */
  email: string;
}
