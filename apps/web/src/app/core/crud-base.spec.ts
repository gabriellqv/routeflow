import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CrudBase } from './crud-base';
import { ResourceService } from './resource.service';

/** Serviço concreto usado para exercitar o `CrudBase`. */
class FakeResourceService extends ResourceService<{ id: string }, unknown, unknown> {
  protected readonly path = '/api/fake';
}

/** Tela concreta usada para exercitar o `CrudBase`. */
class FakeCrud extends CrudBase<{ id: string }, unknown, unknown> {
  protected readonly resource = inject(FakeResourceService);
}

describe('CrudBase', () => {
  let screen: FakeCrud;
  let resource: FakeResourceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FakeResourceService, FakeCrud],
    });

    screen = TestBed.inject(FakeCrud);
    resource = TestBed.inject(FakeResourceService);
  });

  afterEach(() => vi.restoreAllMocks());

  it('deve carregar os itens no reload', async () => {
    vi.spyOn(resource, 'list').mockResolvedValue([{ id: '1' }]);

    await screen.reload();

    expect(screen.items()).toEqual([{ id: '1' }]);
    expect(screen.loading()).toBe(false);
    expect(screen.error()).toBeNull();
  });

  it('deve registrar erro quando o carregamento falha', async () => {
    vi.spyOn(resource, 'list').mockRejectedValue(new Error('falhou'));

    await screen.reload();

    expect(screen.error()).toBe('falhou');
    expect(screen.items()).toEqual([]);
  });

  it('deve remover e recarregar a lista', async () => {
    const removeSpy = vi.spyOn(resource, 'remove').mockResolvedValue(undefined);
    const listSpy = vi.spyOn(resource, 'list').mockResolvedValue([]);

    await screen.remove('1');

    expect(removeSpy).toHaveBeenCalledWith('1');
    expect(listSpy).toHaveBeenCalled();
  });

  it('deve registrar erro quando a remoção falha', async () => {
    vi.spyOn(resource, 'remove').mockRejectedValue(new Error('não removido'));

    await screen.remove('1');

    expect(screen.error()).toBe('não removido');
  });
});
