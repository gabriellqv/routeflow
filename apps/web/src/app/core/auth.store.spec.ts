import { TestBed } from '@angular/core/testing';
import { AUTH_TOKEN_STORAGE_KEY } from './api-config';
import { AuthStore } from './auth.store';

describe('AuthStore', () => {
  let store: AuthStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(AuthStore);
  });

  afterEach(() => localStorage.clear());

  it('deve iniciar sem sessão quando não há token armazenado', () => {
    expect(store.token()).toBeNull();
    expect(store.isAuthenticated).toBe(false);
  });

  it('deve armazenar o token e marcar como autenticado', () => {
    store.setToken('jwt-token');

    expect(store.token()).toBe('jwt-token');
    expect(store.isAuthenticated).toBe(true);
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('jwt-token');
  });

  it('deve limpar o token ao encerrar a sessão', () => {
    store.setToken('jwt-token');
    store.clear();

    expect(store.token()).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('deve ler o token persistido na inicialização', () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'token-persistido');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    const freshStore = TestBed.inject(AuthStore);

    expect(freshStore.token()).toBe('token-persistido');
  });
});
