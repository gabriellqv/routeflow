import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, Observable, throwError } from 'rxjs';
import { API_BASE_URL } from './api-config';
import { AuthStore } from './auth.store';

/** Opções suportadas nas requisições da API. */
export interface ApiRequestOptions {
  /** Parâmetros de query string. */
  params?: Record<string, string | number | boolean>;
  /** Quando `true`, não anexa o cabeçalho `Authorization`. */
  skipAuth?: boolean;
}

/**
 * Cliente HTTP para a API RouteFlow.
 *
 * Centraliza a montagem da URL base, a serialização de query params e o
 * cabeçalho `Authorization: Bearer <token>`. Erros HTTP são normalizados em
 * `Error` com a mensagem retornada pela API.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly authStore = inject(AuthStore);

  /**
   * Realiza uma requisição `GET`.
   *
   * @param path Caminho relativo (ex.: `/vehicles`).
   * @param options Opções da requisição.
   * @returns Observable com o corpo tipado.
   */
  get<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
    return this.http
      .get<T>(this.url(path), { headers: this.headers(options), params: this.params(options) })
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  /**
   * Realiza uma requisição `POST`.
   *
   * @param path Caminho relativo.
   * @param body Corpo da requisição.
   * @param options Opções da requisição.
   * @returns Observable com o corpo tipado.
   */
  post<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.http
      .post<T>(this.url(path), body, {
        headers: this.headers(options),
        params: this.params(options),
      })
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  /**
   * Realiza uma requisição `PATCH`.
   *
   * @param path Caminho relativo.
   * @param body Corpo da requisição.
   * @param options Opções da requisição.
   * @returns Observable com o corpo tipado.
   */
  patch<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.http
      .patch<T>(this.url(path), body, {
        headers: this.headers(options),
        params: this.params(options),
      })
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  /**
   * Realiza uma requisição `DELETE`.
   *
   * @param path Caminho relativo.
   * @param options Opções da requisição.
   * @returns Observable concluído quando a remoção termina.
   */
  delete<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
    return this.http
      .delete<T>(this.url(path), { headers: this.headers(options), params: this.params(options) })
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  /**
   * Realiza uma requisição `GET` e devolve a primeira emissão como `Promise`.
   *
   * @param path Caminho relativo.
   * @param options Opções da requisição.
   * @returns Promise com o corpo tipado.
   */
  getFirst<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    return firstValueFrom(this.get<T>(path, options));
  }

  /**
   * Resolve o caminho relativo para a URL absoluta da API.
   *
   * @param path Caminho relativo.
   * @returns URL absoluta.
   */
  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  /**
   * Monta os cabeçalhos da requisição, incluindo o `Bearer` quando aplicável.
   *
   * @param options Opções da requisição.
   * @returns Cabeçalhos HTTP.
   */
  private headers(options: ApiRequestOptions): HttpHeaders {
    const token = this.authStore.token();

    if (options.skipAuth || !token) {
      return new HttpHeaders();
    }

    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /**
   * Converte os parâmetros informados em `HttpParams`.
   *
   * @param options Opções da requisição.
   * @returns Parâmetros da query string.
   */
  private params(options: ApiRequestOptions): HttpParams {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(options.params ?? {})) {
      params = params.set(key, String(value));
    }

    return params;
  }

  /**
   * Normaliza um erro HTTP em `Error` com a mensagem da API.
   *
   * @param error Resposta de erro do Angular.
   * @returns Observable que emite o erro normalizado.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    const body = error.error as { message?: string | string[] } | null;
    const apiMessage = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    const message = apiMessage ?? error.message ?? 'Falha na comunicação com a API';

    return throwError(() => new Error(message));
  }
}
