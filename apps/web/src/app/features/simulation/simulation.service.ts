import { inject, Injectable, signal } from '@angular/core';
import { SIMULATOR_URL } from '../../core/simulator-config';

/** Ações de controle aceitas pelo simulador. */
export type SimulationAction = 'start' | 'pause' | 'stop';

/** Estados possíveis da simulação reportados pelo simulador. */
export type SimulationState = 'running' | 'paused' | 'stopped';

/** Resposta do endpoint de controle do simulador. */
interface SimulationResponse {
  state: SimulationState;
}

/**
 * Serviço de controle da simulação.
 *
 * Chama o endpoint `POST /control` do simulador Go diretamente (com CORS
 * liberado no simulador) e mantém o estado atual em um signal.
 */
@Injectable({ providedIn: 'root' })
export class SimulationService {
  private readonly simulatorUrl = inject(SIMULATOR_URL);

  private readonly stateSignal = signal<SimulationState | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  /** Estado atual da simulação (`null` antes do primeiro carregamento). */
  readonly state = this.stateSignal.asReadonly();

  /** Indica requisição em andamento. */
  readonly loading = this.loadingSignal.asReadonly();

  /** Mensagem de erro da última operação. */
  readonly error = this.errorSignal.asReadonly();

  /** Consulta o estado atual da simulação. */
  async refresh(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await fetch(`${this.simulatorUrl}/control`);
      await this.parse(response);
    } catch {
      this.stateSignal.set(null);
      this.errorSignal.set('Não foi possível contatar o simulador.');
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Envia uma ação de controle ao simulador.
   *
   * @param action Ação a aplicar (`start`, `pause` ou `stop`).
   */
  async send(action: SimulationAction): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await fetch(`${this.simulatorUrl}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await this.parse(response);
    } catch {
      this.errorSignal.set('Não foi possível contatar o simulador.');
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Interpreta a resposta do simulador e atualiza o estado.
   *
   * @param response Resposta HTTP do simulador.
   */
  private async parse(response: Response): Promise<void> {
    if (!response.ok) {
      this.errorSignal.set(`O simulador respondeu com status ${response.status}.`);
      return;
    }

    const body = (await response.json()) as SimulationResponse;
    this.stateSignal.set(body.state);
  }
}
