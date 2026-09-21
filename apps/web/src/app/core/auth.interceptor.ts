import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from './auth.store';

/**
 * Interceptor HTTP que anexa o token JWT e trata sessões expiradas.
 *
 * Anexa o cabeçalho `Authorization: Bearer <token>` (quando há sessão) e, ao
 * receber `401`, limpa o token local para forçar novo login.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authStore = inject(AuthStore);
  const token = authStore.token();

  const authorizedRequest =
    token && !request.headers.has('Authorization')
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(authorizedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authStore.clear();
      }

      return throwError(() => error);
    }),
  );
};
