import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AuthStore } from './auth.store';

/** Resposta das rotas de autenticação da API. */
export interface TokenResponse {
  accessToken: string;
}

/** Usuário autenticado retornado por `GET /api/auth/me`. */
export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Serviço de autenticação do front-end.
 *
 * Encapsula o login/logout e a leitura do usuário autenticado, mantendo o
 * token no `AuthStore`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly authStore = inject(AuthStore);

  /**
   * Autentica o usuário e armazena o token retornado.
   *
   * @param email E-mail do usuário.
   * @param password Senha do usuário.
   * @returns Promise resolvida após o armazenamento do token.
   */
  async login(email: string, password: string): Promise<void> {
    const response = await firstValueFrom(
      this.api.post<TokenResponse>('/api/auth/login', { email, password }, { skipAuth: true }),
    );

    this.authStore.setToken(response.accessToken);
  }

  /**
   * Retorna o usuário autenticado a partir do token atual.
   *
   * @returns Promise com os dados do usuário autenticado.
   */
  me(): Promise<AuthenticatedUser> {
    return this.api.getFirst<AuthenticatedUser>('/api/auth/me');
  }

  /** Encerra a sessão local. */
  logout(): void {
    this.authStore.clear();
  }
}
