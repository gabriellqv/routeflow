import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthStore } from './auth.store';

describe('authGuard', () => {
  let authStore: AuthStore;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    authStore = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
  });

  afterEach(() => localStorage.clear());

  /**
   * Executa o guard com um estado de rota mínimo.
   */
  function runGuard(url = '/vehicles'): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => authGuard({} as never, { url } as never)) as
      boolean | UrlTree;
  }

  it('deve permitir o acesso quando autenticado', () => {
    authStore.setToken('jwt-token');

    expect(runGuard()).toBe(true);
  });

  it('deve redirecionar para o login quando não autenticado', () => {
    const result = runGuard('/vehicles');

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fvehicles');
  });
});
