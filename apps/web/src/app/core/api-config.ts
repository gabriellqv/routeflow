import { InjectionToken } from '@angular/core';

/**
 * URL base da API RouteFlow.
 *
 * Resolvida a partir de `window.__env.API_URL` (injetada em runtime) ou do valor
 * padrão `http://localhost:3000`.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => {
    const runtimeConfig = (globalThis as { __env?: { API_URL?: string } }).__env;
    return runtimeConfig?.API_URL ?? 'http://localhost:3000';
  },
});

/** Chave do token JWT no `localStorage`. */
export const AUTH_TOKEN_STORAGE_KEY = 'routeflow.accessToken';
