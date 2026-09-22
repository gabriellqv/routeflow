import { TestBed } from '@angular/core/testing';
import { SIMULATOR_URL } from '../../core/simulator-config';
import { SimulationService } from './simulation.service';

describe('SimulationService', () => {
  let service: SimulationService;
  const baseUrl = 'http://sim.test';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: SIMULATOR_URL, useValue: baseUrl }],
    });

    service = TestBed.inject(SimulationService);
    vi.restoreAllMocks();
  });

  it('deve consultar e expor o estado atual', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ state: 'running' }), { status: 200 }));

    await service.refresh();

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/control`);
    expect(service.state()).toBe('running');
    expect(service.error()).toBeNull();
  });

  it('deve enviar uma ação de controle', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ state: 'paused' }), { status: 200 }));

    await service.send('pause');

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/control`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'pause' }) }),
    );
    expect(service.state()).toBe('paused');
  });

  it('deve registrar erro quando o simulador responde com falha', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('erro', { status: 500 }));

    await service.send('start');

    expect(service.error()).toContain('500');
  });

  it('deve registrar erro quando a conexão falha', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    await service.refresh();

    expect(service.state()).toBeNull();
    expect(service.error()).toBe('Não foi possível contatar o simulador.');
  });
});
