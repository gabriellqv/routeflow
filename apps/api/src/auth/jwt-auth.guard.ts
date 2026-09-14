import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from './auth.types.js';
import { AuthService } from './auth.service.js';

/** Requisição com o usuário autenticado anexado pelo guard. */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Guard que protege rotas exigindo um token JWT Bearer válido.
 *
 * Extrai o token do cabeçalho `Authorization`, valida sua assinatura e anexa o
 * usuário autenticado à requisição (`request.user`).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  /**
   * Valida o token da requisição e autoriza o acesso.
   *
   * @param context Contexto de execução da requisição.
   * @returns `true` quando o token é válido.
   * @throws UnauthorizedException Quando o cabeçalho está ausente ou o token é inválido.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Token de acesso não informado');
    }

    request.user = await this.authService.verify(token);
    return true;
  }

  /**
   * Extrai o token do cabeçalho `Authorization` no formato `Bearer <token>`.
   *
   * @param request Requisição HTTP.
   * @returns O token ou `null` se o cabeçalho for inválido/ausente.
   */
  private extractBearerToken(request: Request): string | null {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
