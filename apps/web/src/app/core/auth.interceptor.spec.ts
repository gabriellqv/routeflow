import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from './auth.store';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authStore: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authStore = TestBed.inject(AuthStore);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('deve anexar o token da sessão à requisição', () => {
    authStore.setToken('jwt-token');

    void http.get('/vehicles').subscribe();

    const request = httpMock.expectOne('/vehicles');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    request.flush([]);
  });

  it('não deve anexar o cabeçalho quando não há sessão', () => {
    void http.get('/vehicles').subscribe();

    const request = httpMock.expectOne('/vehicles');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);
  });

  it('deve limpar a sessão ao receber 401', async () => {
    authStore.setToken('jwt-token');

    const promise = firstValueFrom(http.get('/vehicles'));
    const request = httpMock.expectOne('/vehicles');
    request.flush({ message: 'Não autorizado' }, { status: 401, statusText: 'Unauthorized' });

    await expect(promise).rejects.toBeTruthy();
    expect(authStore.token()).toBeNull();
  });

  it('não deve limpar a sessão em outros erros', async () => {
    authStore.setToken('jwt-token');

    const promise = firstValueFrom(http.get('/vehicles'));
    const request = httpMock.expectOne('/vehicles');
    request.flush({ message: 'Erro' }, { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toBeTruthy();
    expect(authStore.token()).toBe('jwt-token');
  });
});
