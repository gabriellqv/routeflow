import { InjectionToken } from '@angular/core';

/**
 * URL base do simulador Go (health check e controle).
 *
 * Resolvida a partir de `window.__env.SIMULATOR_URL` ou do valor padrão
 * `http://localhost:8080`.
 */
export const SIMULATOR_URL = new InjectionToken<string>('SIMULATOR_URL', {
  providedIn: 'root',
  factory: () => {
    const runtimeConfig = (globalThis as { __env?: { SIMULATOR_URL?: string } }).__env;
    return runtimeConfig?.SIMULATOR_URL ?? 'http://localhost:8080';
  },
});
