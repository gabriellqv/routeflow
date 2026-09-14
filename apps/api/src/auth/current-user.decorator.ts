import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';
import type { AuthenticatedUser } from './auth.types.js';

/**
 * Decorador de parâmetro que resolve o usuário autenticado da requisição.
 *
 * Deve ser usado em rotas protegidas pelo `JwtAuthGuard`, que é responsável
 * por anexar o usuário à requisição.
 *
 * @returns O usuário autenticado (`request.user`).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
