import { Injectable, signal } from '@angular/core';
import { AUTH_TOKEN_STORAGE_KEY } from './api-config';

/**
 * Serviço de sessão do usuário.
 *
 * Guarda o token JWT emitido pela API e expõe um `signal` reativo com o estado
 * de autenticação. O token é persistido no `localStorage` para sobreviver a
 * recarregamentos da página.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly tokenSignal = signal<string | null>(this.readStoredToken());

  /** Token JWT atual (`null` quando não autenticado). */
  readonly token = this.tokenSignal.asReadonly();

  /** Indica se existe um token armazenado. */
  get isAuthenticated(): boolean {
    return this.tokenSignal() !== null;
  }

  /**
   * Armazena o token e passa o serviço ao estado autenticado.
   *
   * @param token Token JWT emitido pela API.
   */
  setToken(token: string): void {
    this.tokenSignal.set(token);
    try {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } catch {
      // `localStorage` pode estar indisponível (modo privado); o token segue em memória.
    }
  }

  /** Remove o token e encerra a sessão. */
  clear(): void {
    this.tokenSignal.set(null);
    try {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      // Ignora ambientes sem `localStorage`.
    }
  }

  /**
   * Lê o token previamente persistido.
   *
   * @returns O token armazenado ou `null`.
   */
  private readStoredToken(): string | null {
    try {
      return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
