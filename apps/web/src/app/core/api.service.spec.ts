import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api-config';
import { ApiService } from './api.service';
import { AuthStore } from './auth.store';

describe('ApiService', () => {
  let service: ApiService;
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

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
    authStore = TestBed.inject(AuthStore);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('deve montar a URL base e serializar os parâmetros', () => {
    service.get('/vehicles', { params: { status: 'idle', page: 1 } }).subscribe();

    const request = httpMock.expectOne('http://api.test/vehicles?status=idle&page=1');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('deve anexar o cabeçalho Authorization quando há sessão', () => {
    authStore.setToken('jwt-token');

    service.get('/vehicles').subscribe();

    const request = httpMock.expectOne('http://api.test/vehicles');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    request.flush([]);
  });

  it('não deve anexar Authorization quando skipAuth é usado', () => {
    authStore.setToken('jwt-token');

    service.post('/api/auth/login', { email: 'a@b.dev' }, { skipAuth: true }).subscribe();

    const request = httpMock.expectOne('http://api.test/api/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ accessToken: 'novo' });
  });

  it('deve normalizar o erro HTTP com a mensagem da API', async () => {
    const promise = service.getFirst('/vehicles');

    const request = httpMock.expectOne('http://api.test/vehicles');
    request.flush({ message: 'Falha simulada' }, { status: 400, statusText: 'Bad Request' });

    await expect(promise).rejects.toThrow('Falha simulada');
  });

  it('deve concatenar mensagens de erro em array', async () => {
    const promise = service.getFirst('/vehicles');

    const request = httpMock.expectOne('http://api.test/vehicles');
    request.flush(
      { message: ['campo inválido', 'obrigatório'] },
      { status: 400, statusText: 'Bad Request' },
    );

    await expect(promise).rejects.toThrow('campo inválido, obrigatório');
  });
});
