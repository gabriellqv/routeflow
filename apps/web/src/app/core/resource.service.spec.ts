import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api-config';
import { ResourceService } from './resource.service';

/** Serviço concreto usado para exercitar o `ResourceService`. */
class FakeResourceService extends ResourceService<
  { id: string },
  { name: string },
  { name?: string }
> {
  protected readonly path = '/api/fake';
}

describe('ResourceService', () => {
  let service: FakeResourceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test' },
        FakeResourceService,
      ],
    });

    service = TestBed.inject(FakeResourceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('deve listar os registros', async () => {
    const promise = service.list();

    const request = httpMock.expectOne('http://api.test/api/fake');
    expect(request.request.method).toBe('GET');
    request.flush([{ id: '1' }]);

    await expect(promise).resolves.toEqual([{ id: '1' }]);
  });

  it('deve buscar um registro por id', async () => {
    const promise = service.findById('1');

    const request = httpMock.expectOne('http://api.test/api/fake/1');
    expect(request.request.method).toBe('GET');
    request.flush({ id: '1' });

    await expect(promise).resolves.toEqual({ id: '1' });
  });

  it('deve criar um registro', async () => {
    const promise = service.create({ name: 'novo' });

    const request = httpMock.expectOne('http://api.test/api/fake');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'novo' });
    request.flush({ id: '2' });

    await expect(promise).resolves.toEqual({ id: '2' });
  });

  it('deve atualizar um registro', async () => {
    const promise = service.update('2', { name: 'alterado' });

    const request = httpMock.expectOne('http://api.test/api/fake/2');
    expect(request.request.method).toBe('PATCH');
    request.flush({ id: '2' });

    await expect(promise).resolves.toEqual({ id: '2' });
  });

  it('deve remover um registro', async () => {
    const promise = service.remove('2');

    const request = httpMock.expectOne('http://api.test/api/fake/2');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);

    await expect(promise).resolves.toBeUndefined();
  });
});
