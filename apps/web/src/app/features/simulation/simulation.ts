import { Component, inject, OnInit } from '@angular/core';
import { SimulationService } from './simulation.service';

/**
 * Tela de controle da simulação.
 *
 * Permite iniciar, pausar e parar a simulação chamando o endpoint `/control` do
 * simulador Go, exibindo o estado atual.
 */
@Component({
  selector: 'app-simulation',
  templateUrl: './simulation.html',
  styleUrl: './simulation.css',
})
export class Simulation implements OnInit {
  private readonly service = inject(SimulationService);

  /** Estado atual reportado pelo simulador. */
  protected readonly state = this.service.state;

  /** Indica operação em andamento. */
  protected readonly loading = this.service.loading;

  /** Erro da última operação. */
  protected readonly error = this.service.error;

  ngOnInit(): void {
    void this.service.refresh();
  }

  /**
   * Envia uma ação de controle ao simulador.
   *
   * @param action Ação a aplicar.
   */
  protected async send(action: 'start' | 'pause' | 'stop'): Promise<void> {
    await this.service.send(action);
  }
}
