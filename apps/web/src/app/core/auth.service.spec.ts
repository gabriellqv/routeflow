import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api-config';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let authStore: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test' },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    authStore = TestBed.inject(AuthStore);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('deve autenticar e armazenar o token', async () => {
    const promise = service.login('gestor@routeflow.dev', 'senha-secreta');

    const request = httpMock.expectOne('http://api.test/api/auth/login');
    expect(request.request.body).toEqual({
      email: 'gestor@routeflow.dev',
      password: 'senha-secreta',
    });
    request.flush({ accessToken: 'jwt-token' });

    await promise;

    expect(authStore.token()).toBe('jwt-token');
  });

  it('deve buscar o usuário autenticado', async () => {
    authStore.setToken('jwt-token');

    const promise = service.me();

    const request = httpMock.expectOne('http://api.test/api/auth/me');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    request.flush({ id: 'user-1', email: 'gestor@routeflow.dev' });

    await expect(promise).resolves.toEqual({ id: 'user-1', email: 'gestor@routeflow.dev' });
  });

  it('deve limpar a sessão no logout', () => {
    authStore.setToken('jwt-token');

    service.logout();

    expect(authStore.token()).toBeNull();
  });
});
