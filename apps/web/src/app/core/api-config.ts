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

/**
 * URL do gateway WebSocket da API.
 *
 * Resolvida a partir de `window.__env.WS_URL` ou derivada de `API_URL` trocando
 * o esquema por `ws`/`wss`.
 */
export const WS_URL = new InjectionToken<string>('WS_URL', {
  providedIn: 'root',
  factory: () => {
    const runtimeConfig = (globalThis as { __env?: { WS_URL?: string } }).__env;

    if (runtimeConfig?.WS_URL) {
      return runtimeConfig.WS_URL;
    }

    const apiUrl = (globalThis as { __env?: { API_URL?: string } }).__env?.API_URL;
    const base = apiUrl ?? 'http://localhost:3000';
    return base.replace(/^http/, 'ws');
  },
});

/**
 * Template de tiles raster do mapa base.
 *
 * Configurável em runtime por `window.__env.MAP_TILES_URL`.
 */
export const MAP_TILES_URL = new InjectionToken<string>('MAP_TILES_URL', {
  providedIn: 'root',
  factory: () => {
    const runtimeConfig = (globalThis as { __env?: { MAP_TILES_URL?: string } }).__env;
    return runtimeConfig?.MAP_TILES_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  },
});

/** Chave do token JWT no `localStorage`. */
export const AUTH_TOKEN_STORAGE_KEY = 'routeflow.accessToken';
